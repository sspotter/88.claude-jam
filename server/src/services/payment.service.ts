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

export class PaymentService {
  private static PAYMOB_BASE_URL = "https://accept.paymob.com/api";

  /**
   * Generates a Paymob Auth Token using the Secret Key (API Key)
   */
  private static async getAuthToken(): Promise<string> {
    const secretKey = process.env.PAYMOB_SECRET_KEY;
    if (!secretKey) {
      throw new Error("PAYMOB_SECRET_KEY is not configured in environment variables.");
    }

    const response = await fetch(`${this.PAYMOB_BASE_URL}/auth/tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: secretKey,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Paymob authentication failed: ${response.statusText} - ${errText}`);
    }

    const data = await response.json() as any;
    return data.token;
  }

  /**
   * Creates an order in Paymob's system
   */
  private static async createPaymobOrder(authToken: string, amountCents: number, merchantOrderId: string): Promise<number> {
    const response = await fetch(`${this.PAYMOB_BASE_URL}/ecommerce/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: "false",
        amount_cents: amountCents,
        currency: "EGP",
        merchant_order_id: merchantOrderId,
        items: []
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to create Paymob ecommerce order: ${response.statusText} - ${errText}`);
    }

    const data = await response.json() as any;
    return data.id;
  }

  /**
   * Requests a Payment Key from Paymob
   */
  public static async generatePaymentSession(params: {
    amountCents: number;
    merchantOrderId: string;
    billingData: Partial<PaymobBillingData>;
    paymentMethod: "card" | "wallet";
  }): Promise<{ token: string; checkoutUrl: string }> {
    const { amountCents, merchantOrderId, billingData, paymentMethod } = params;

    // Get integration ID based on payment type
    const integrationId =
      paymentMethod === "wallet"
        ? process.env.PAYMOB_WALLET_INTEGRATION_ID
        : process.env.PAYMOB_CARD_INTEGRATION_ID;

    if (!integrationId) {
      throw new Error(`Paymob Integration ID for payment method '${paymentMethod}' is not configured.`);
    }

    // 1. Authenticate with Paymob
    const authToken = await this.getAuthToken();

    // 2. Register ecommerce order
    const paymobOrderId = await this.createPaymobOrder(authToken, amountCents, merchantOrderId);

    // 3. Prepare billing fields (Paymob requires specific default/fallback values if empty)
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
      state: "NA"
    };

    // 4. Generate payment key
    const response = await fetch(`${this.PAYMOB_BASE_URL}/acceptance/payment_keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: paymobOrderId,
        billing_data: billing,
        currency: "EGP",
        integration_id: parseInt(integrationId, 10),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to generate Paymob payment key: ${response.statusText} - ${errText}`);
    }

    const data = await response.json() as any;
    const paymentToken = data.token;

    // 5. Generate redirect/checkout URL
    // For standard cards, they can use direct iframe redirect, or we can use standard unified checkout URL
    let checkoutUrl = "";
    if (paymentMethod === "wallet") {
      // Wallet payments need to submit their wallet number to /api/acceptance/payments/pay
      // To simplify, Paymob Hosted checkout is best because it handles redirect, OTP and numbers automatically.
      checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/unifiedcheckout?payment_token=${paymentToken}`;
    } else {
      // Standard hosted checkout url
      checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/unifiedcheckout?payment_token=${paymentToken}`;
    }

    return {
      token: paymentToken,
      checkoutUrl,
    };
  }

  /**
   * Verifies the authenticity of a Paymob transaction webhook webhook
   */
  public static verifyWebhookSignature(payload: any, signature: string): boolean {
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
    if (!hmacSecret) {
      console.warn("PAYMOB_HMAC_SECRET is not configured. Webhook verification skipped.");
      return false;
    }

    const obj = payload.obj;
    if (!obj) return false;

    // Concatenate fields in alphabetical order/exact format specified by Paymob docs
    const stringToHash = 
      `${obj.amount_cents}` +
      `${obj.created_at}` +
      `${obj.currency}` +
      `${obj.error_occured}` +
      `${obj.has_parent_transaction}` +
      `${obj.id}` +
      `${obj.integration_id}` +
      `${obj.is_3d_secure}` +
      `${obj.is_auth}` +
      `${obj.is_capture}` +
      `${obj.is_voided}` +
      `${obj.is_refunded}` +
      `${obj.owner}` +
      `${obj.pending}` +
      `${obj.source_data?.pan || ""}` +
      `${obj.source_data?.sub_type || ""}` +
      `${obj.source_data?.type || ""}` +
      `${obj.success}`;

    const calculatedHmac = crypto
      .createHmac("sha512", hmacSecret)
      .update(stringToHash)
      .digest("hex");

    return calculatedHmac === signature;
  }
}
