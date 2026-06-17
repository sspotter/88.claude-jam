import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

export interface PaymobBillingData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  city: string;
  country: string;
}

export interface PaymobIntentionItem {
  name: string;
  amount: number; // in cents
  quantity: number;
  description?: string;
}

export class PaymentService {
  private static PAYMOB_BASE_URL = "https://accept.paymob.com";

  /**
   * Creates a Paymob payment session using the modern Intention API.
   *
   * One call to `POST /v1/intention/` (authenticated with the Secret Key)
   * initializes the payment, restricts it to the chosen payment method, and
   * registers the webhook (`notification_url`) and customer return URL
   * (`redirection_url`) — so no per-integration redirect needs to be configured
   * in the Paymob dashboard. The response's `client_secret` is combined with the
   * Public Key to build the Unified Checkout (hosted, redirect) URL the customer
   * is sent to.
   *
   * Docs: https://developers.paymob.com/paymob-docs/developers/intention-apis
   */
  public static async generatePaymentSession(params: {
    amountCents: number;
    merchantOrderId: string;
    billingData: Partial<PaymobBillingData>;
    paymentMethod: "card" | "wallet";
    items?: PaymobIntentionItem[];
  }): Promise<{ clientSecret: string; checkoutUrl: string; intentionId: string }> {
    const { amountCents, merchantOrderId, billingData, paymentMethod, items } = params;

    const secretKey = process.env.PAYMOB_SECRET_KEY;
    if (!secretKey) {
      throw new Error("PAYMOB_SECRET_KEY is not configured in environment variables.");
    }
    const publicKey = process.env.PAYMOB_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error("PAYMOB_PUBLIC_KEY is not configured in environment variables.");
    }

    // Select the integration ID for the chosen method (card vs wallet).
    const integrationId =
      paymentMethod === "wallet"
        ? process.env.PAYMOB_WALLET_INTEGRATION_ID
        : process.env.PAYMOB_CARD_INTEGRATION_ID;
    if (!integrationId) {
      throw new Error(`Paymob Integration ID for payment method '${paymentMethod}' is not configured.`);
    }

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const serverUrl = (process.env.PUBLIC_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

    // Billing data — Paymob requires non-empty values, so fall back to defaults.
    const billing = {
      first_name: billingData.firstName || "Guest",
      last_name: billingData.lastName || "Customer",
      email: billingData.email || "guest@jamhawi.com",
      phone_number: billingData.phoneNumber || "01000000000",
      apartment: billingData.apartment || "NA",
      floor: billingData.floor || "NA",
      building: billingData.building || "NA",
      street: billingData.street || "NA",
      city: billingData.city || "Cairo",
      country: billingData.country || "EG",
      state: "NA",
    };

    const body = {
      amount: amountCents,
      currency: "EGP",
      // Restrict the hosted checkout to the method the customer picked.
      payment_methods: [parseInt(integrationId, 10)],
      items:
        items && items.length > 0
          ? items
          : [{ name: "Order", amount: amountCents, quantity: 1 }],
      billing_data: billing,
      // special_reference comes back as order.merchant_order_id in the webhook.
      special_reference: merchantOrderId,
      notification_url: `${serverUrl}/api/payments/paymob-webhook`,
      // Carry our own orderId so the success page always has it, regardless of
      // which params Paymob appends on redirect.
      redirection_url: `${frontendUrl}/checkout/success?orderId=${encodeURIComponent(merchantOrderId)}`,
    };

    const response = await fetch(`${this.PAYMOB_BASE_URL}/v1/intention/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${secretKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to create Paymob intention: ${response.statusText} - ${errText}`);
    }

    const data = (await response.json()) as { id: string; client_secret: string };
    const clientSecret = data.client_secret;

    const checkoutUrl =
      `${this.PAYMOB_BASE_URL}/unifiedcheckout/` +
      `?publicKey=${encodeURIComponent(publicKey)}` +
      `&clientSecret=${encodeURIComponent(clientSecret)}`;

    return { clientSecret, checkoutUrl, intentionId: data.id };
  }

  /**
   * Exact ordered field list Paymob concatenates to compute the callback HMAC.
   * Verified byte-for-byte against a real transaction response callback.
   * Used for BOTH the processed callback (webhook) and the response callback
   * (redirect) — Paymob signs the same fields the same way for both.
   */
  private static readonly HMAC_KEYS = [
    "amount_cents",
    "created_at",
    "currency",
    "error_occured",
    "has_parent_transaction",
    "id",
    "integration_id",
    "is_3d_secure",
    "is_auth",
    "is_capture",
    "is_refunded",
    "is_standalone_payment",
    "is_voided",
    "order",
    "owner",
    "pending",
    "source_data.pan",
    "source_data.sub_type",
    "source_data.type",
    "success",
  ] as const;

  private static computeHmac(
    values: Record<string, unknown>,
    hmacSecret: string,
  ): string {
    const stringToHash = this.HMAC_KEYS.map((k) => `${values[k] ?? ""}`).join("");
    return crypto.createHmac("sha512", hmacSecret).update(stringToHash).digest("hex");
  }

  /**
   * Verifies the authenticity of a Paymob transaction webhook (processed
   * callback). The fields arrive nested under `obj`; we flatten them to the
   * canonical HMAC key shape before hashing.
   */
  public static verifyWebhookSignature(payload: any, signature: string): boolean {
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
    if (!hmacSecret) {
      console.warn("PAYMOB_HMAC_SECRET is not configured. Webhook verification skipped.");
      return false;
    }

    const obj = payload.obj;
    if (!obj) return false;

    // `order` is the Paymob order id. In the webhook it's nested (obj.order.id);
    // in some payloads it may already be a scalar.
    const orderId =
      obj.order && typeof obj.order === "object" ? obj.order.id : obj.order;

    const values: Record<string, unknown> = {
      amount_cents: obj.amount_cents,
      created_at: obj.created_at,
      currency: obj.currency,
      error_occured: obj.error_occured,
      has_parent_transaction: obj.has_parent_transaction,
      id: obj.id,
      integration_id: obj.integration_id,
      is_3d_secure: obj.is_3d_secure,
      is_auth: obj.is_auth,
      is_capture: obj.is_capture,
      is_refunded: obj.is_refunded,
      is_standalone_payment: obj.is_standalone_payment,
      is_voided: obj.is_voided,
      order: orderId,
      owner: obj.owner,
      pending: obj.pending,
      "source_data.pan": obj.source_data?.pan,
      "source_data.sub_type": obj.source_data?.sub_type,
      "source_data.type": obj.source_data?.type,
      success: obj.success,
    };

    return this.computeHmac(values, hmacSecret) === signature;
  }

  /**
   * Verifies the HMAC on Paymob's "transaction response callback" — the signed
   * query parameters appended to `redirection_url` when the customer is sent
   * back to our site. Same field set and algorithm as the webhook, but the
   * params arrive flat (e.g. `source_data.pan`, `order`) rather than nested.
   *
   * Lets us resolve an order from the redirect alone, which is essential in
   * environments where the server-to-server webhook can't reach us (e.g. a
   * localhost backend with no public tunnel).
   */
  public static verifyRedirectHmac(params: Record<string, string>): boolean {
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
    if (!hmacSecret) {
      console.warn("PAYMOB_HMAC_SECRET is not configured. Redirect verification skipped.");
      return false;
    }

    const signature = params.hmac;
    if (!signature) return false;

    return this.computeHmac(params, hmacSecret) === signature;
  }
}
