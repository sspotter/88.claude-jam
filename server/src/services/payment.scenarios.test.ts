import { afterAll, beforeAll, describe, expect, it } from "vitest";
import dotenv from "dotenv";
import prisma from "../config/prisma.js";
import { PaymentService } from "./payment.service.js";

dotenv.config();

/**
 * Live payment-scenario tests against the Paymob sandbox — OPT-IN.
 *
 *   from server/:  RUN_PAYMOB_LIVE=1 npm run test-payment-live
 *
 * Each scenario creates a REAL payment session (intention) for a product using
 * the test credentials and prints the Unified Checkout URL plus the matching
 * test card / wallet, so you can open the link and complete the payment.
 *
 * These do NOT auto-complete the payment (entering the card number, 3-D Secure
 * and OTP happens on Paymob's hosted page). Completing the printed checkout URL
 * with the printed test credential exercises the full charge end to end.
 *
 * Scenarios whose Paymob integration is not configured on the account are
 * skipped with an actionable message — set the relevant env var and they run.
 *
 * Test credentials: docs/paymobdocs/tezstcredentials.md
 */

const LIVE = process.env.RUN_PAYMOB_LIVE === "1";

// Integration IDs that are placeholders / not real on this account.
const PLACEHOLDER_IDS = new Set(["12345", "12346"]);
function configured(id?: string): boolean {
  return !!id && !PLACEHOLDER_IDS.has(id) && /^\d+$/.test(id);
}

const TEST_CARD = { visa: "4111111111111111", mastercard: "5123456789012346", exp: "01 / 39", cvv: "123" };
const TEST_WALLET = { number: "01010101010", mpin: "123456", otp: "123456" };

const BILLING = {
  firstName: "Test",
  lastName: "Shopper",
  email: "test@test.com",
  phoneNumber: "+201010101010",
  street: "1 Sandbox Street",
  building: "1",
  floor: "1",
  apartment: "1",
  city: "Cairo",
  country: "EG",
};

// A product to "buy". Pulled from the DB when available, else a sensible default.
let product = { name: "Test Product", price: 100 };

function unifiedCheckoutUrl(clientSecret: string): string {
  const pk = process.env.PAYMOB_PUBLIC_KEY ?? "";
  return `https://accept.paymob.com/unifiedcheckout/?publicKey=${pk}&clientSecret=${clientSecret}`;
}

/**
 * Direct Intention API call — used for scenarios our PaymentService doesn't model
 * (arbitrary currency / integration id, e.g. USD card or wallet).
 */
async function createIntention(opts: {
  amountCents: number;
  currency: string;
  integrationId: number;
  reference: string;
  itemName: string;
}): Promise<{ status: number; body: any }> {
  const secretKey = process.env.PAYMOB_SECRET_KEY;
  const res = await fetch("https://accept.paymob.com/v1/intention/", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Token ${secretKey}` },
    body: JSON.stringify({
      amount: opts.amountCents,
      currency: opts.currency,
      payment_methods: [opts.integrationId],
      items: [{ name: opts.itemName, amount: opts.amountCents, quantity: 1 }],
      billing_data: {
        first_name: BILLING.firstName,
        last_name: BILLING.lastName,
        email: BILLING.email,
        phone_number: BILLING.phoneNumber,
        apartment: BILLING.apartment,
        floor: BILLING.floor,
        building: BILLING.building,
        street: BILLING.street,
        city: BILLING.city,
        country: BILLING.country,
        state: "NA",
      },
      special_reference: opts.reference,
      notification_url: "https://example.com/api/payments/paymob-webhook",
      redirection_url: "https://example.com/checkout/success",
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

describe.runIf(LIVE)("Paymob payment scenarios (live sandbox, opt-in)", () => {
  beforeAll(async () => {
    // Use a real product if the DB is reachable; otherwise fall back to a default.
    try {
      await prisma.$queryRaw`SELECT 1`;
      const p = await prisma.product.findFirst({ where: { isAvailable: true } });
      if (p) product = { name: p.name, price: Number(p.price) || 100 };
    } catch {
      /* DB optional for this test — default product is fine */
    }

    // eslint-disable-next-line no-console
    console.log(
      `\nProduct under test: "${product.name}" @ ${product.price}\n` +
        `Configured integrations →  card: ${process.env.PAYMOB_CARD_INTEGRATION_ID}` +
        `  card(USD): ${process.env.PAYMOB_CARD_INTEGRATION_ID_USD ?? "(unset)"}` +
        `  wallet: ${process.env.PAYMOB_WALLET_INTEGRATION_ID}`,
    );
  });

  afterAll(async () => {
    await prisma.$disconnect().catch(() => {});
  });

  it("creates a CARD payment session in EGP (via PaymentService)", async () => {
    const amountCents = Math.round(product.price * 100);
    const session = await PaymentService.generatePaymentSession({
      amountCents,
      merchantOrderId: `egp-card-${Date.now()}`,
      paymentMethod: "card",
      billingData: BILLING,
      items: [{ name: product.name, amount: amountCents, quantity: 1 }],
    });

    expect(session.clientSecret).toMatch(/^egy_csk_/);
    expect(session.intentionId).toBeTruthy();
    expect(session.checkoutUrl).toContain("/unifiedcheckout/");

    // eslint-disable-next-line no-console
    console.log(
      `\n[CARD · EGP] Pay ${product.price} EGP for "${product.name}"\n` +
        `  Checkout: ${session.checkoutUrl}\n` +
        `  Visa ${TEST_CARD.visa} · MC ${TEST_CARD.mastercard} · exp ${TEST_CARD.exp} · cvv ${TEST_CARD.cvv}`,
    );
  }, 20000);

  it.skipIf(!configured(process.env.PAYMOB_CARD_INTEGRATION_ID_USD))(
    "creates a CARD payment session in USD",
    async () => {
      const integrationId = Number(process.env.PAYMOB_CARD_INTEGRATION_ID_USD);
      const amountCents = Math.round(product.price * 100);
      const { status, body } = await createIntention({
        amountCents,
        currency: "USD",
        integrationId,
        reference: `usd-card-${Date.now()}`,
        itemName: product.name,
      });

      expect(status, JSON.stringify(body)).toBe(201);
      expect(body.client_secret).toBeTruthy();

      // eslint-disable-next-line no-console
      console.log(
        `\n[CARD · USD] Pay ${product.price} USD for "${product.name}"\n` +
          `  Checkout: ${unifiedCheckoutUrl(body.client_secret)}\n` +
          `  Visa ${TEST_CARD.visa} · MC ${TEST_CARD.mastercard} · exp ${TEST_CARD.exp} · cvv ${TEST_CARD.cvv}`,
      );
    },
    20000,
  );

  it.skipIf(!configured(process.env.PAYMOB_WALLET_INTEGRATION_ID))(
    "creates a MOBILE WALLET payment session in EGP",
    async () => {
      const integrationId = Number(process.env.PAYMOB_WALLET_INTEGRATION_ID);
      const amountCents = Math.round(product.price * 100);
      const { status, body } = await createIntention({
        amountCents,
        currency: "EGP",
        integrationId,
        reference: `wallet-${Date.now()}`,
        itemName: product.name,
      });

      expect(status, JSON.stringify(body)).toBe(201);
      expect(body.client_secret).toBeTruthy();

      // eslint-disable-next-line no-console
      console.log(
        `\n[WALLET · EGP] Pay ${product.price} EGP for "${product.name}"\n` +
          `  Checkout: ${unifiedCheckoutUrl(body.client_secret)}\n` +
          `  Wallet ${TEST_WALLET.number} · MPin ${TEST_WALLET.mpin} · OTP ${TEST_WALLET.otp}`,
      );
    },
    20000,
  );
});
