import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import { PaymentService } from "./payment.service.js";

/**
 * Tests for the Paymob Intention API integration.
 *
 * - The unit tests mock `fetch`, so they assert our request/response logic
 *   deterministically without touching the network or depending on real
 *   integration IDs.
 * - The HMAC tests run the real signature algorithm (no network).
 * - A live sandbox smoke test (bottom) is opt-in via RUN_PAYMOB_LIVE=1 and uses
 *   the real test keys in server/.env to confirm the Secret Key is accepted.
 */

// Snapshot env so each test starts from a known, controlled state.
const ORIGINAL_ENV = { ...process.env };

function setPaymobEnv() {
  process.env.PAYMOB_SECRET_KEY = "egy_sk_test_secret";
  process.env.PAYMOB_PUBLIC_KEY = "egy_pk_test_public";
  process.env.PAYMOB_CARD_INTEGRATION_ID = "111111";
  process.env.PAYMOB_WALLET_INTEGRATION_ID = "222222";
  process.env.PAYMOB_HMAC_SECRET = "test_hmac_secret";
  process.env.FRONTEND_URL = "https://shop.example.com";
  process.env.PUBLIC_BASE_URL = "https://api.example.com";
}

function mockIntentionResponse() {
  return {
    ok: true,
    status: 201,
    statusText: "Created",
    json: async () => ({
      id: "pi_test_abc123",
      client_secret: "egy_csk_test_clientsecret",
      status: "intended",
    }),
    text: async () => "",
  } as unknown as Response;
}

describe("PaymentService.generatePaymentSession (Intention API)", () => {
  beforeEach(() => {
    setPaymobEnv();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("POSTs to /v1/intention/ with Token auth and the correct body for card", async () => {
    const fetchMock = vi.fn(async () => mockIntentionResponse());
    vi.stubGlobal("fetch", fetchMock);

    const result = await PaymentService.generatePaymentSession({
      amountCents: 30000,
      merchantOrderId: "order-123",
      paymentMethod: "card",
      billingData: {
        firstName: "Test",
        lastName: "Shopper",
        phoneNumber: "01009999999",
        street: "123 Sandbox St",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];

    expect(url).toBe("https://accept.paymob.com/v1/intention/");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Token egy_sk_test_secret",
    );

    const body = JSON.parse(init.body as string);
    expect(body.amount).toBe(30000);
    expect(body.currency).toBe("EGP");
    expect(body.payment_methods).toEqual([111111]); // card integration id as int
    expect(body.special_reference).toBe("order-123");
    expect(body.notification_url).toBe(
      "https://api.example.com/api/payments/paymob-webhook",
    );
    expect(body.redirection_url).toBe(
      "https://shop.example.com/checkout/success?orderId=order-123",
    );
    expect(body.billing_data.first_name).toBe("Test");
    expect(body.billing_data.phone_number).toBe("01009999999");

    // Checkout URL is built from the public key + returned client_secret.
    expect(result.clientSecret).toBe("egy_csk_test_clientsecret");
    expect(result.intentionId).toBe("pi_test_abc123");
    expect(result.checkoutUrl).toBe(
      "https://accept.paymob.com/unifiedcheckout/" +
        "?publicKey=egy_pk_test_public&clientSecret=egy_csk_test_clientsecret",
    );
  });

  it("uses the wallet integration id when paymentMethod is wallet", async () => {
    const fetchMock = vi.fn(async () => mockIntentionResponse());
    vi.stubGlobal("fetch", fetchMock);

    await PaymentService.generatePaymentSession({
      amountCents: 5000,
      merchantOrderId: "order-wallet",
      paymentMethod: "wallet",
      billingData: {},
    });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.payment_methods).toEqual([222222]);
  });

  it("falls back to a single default item when none are provided", async () => {
    const fetchMock = vi.fn(async () => mockIntentionResponse());
    vi.stubGlobal("fetch", fetchMock);

    await PaymentService.generatePaymentSession({
      amountCents: 7500,
      merchantOrderId: "order-noitems",
      paymentMethod: "card",
      billingData: {},
    });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.items).toEqual([{ name: "Order", amount: 7500, quantity: 1 }]);
  });

  it("forwards provided line items unchanged", async () => {
    const fetchMock = vi.fn(async () => mockIntentionResponse());
    vi.stubGlobal("fetch", fetchMock);

    const items = [
      { name: "Avocado", amount: 15000, quantity: 2, description: "Fresh" },
    ];
    await PaymentService.generatePaymentSession({
      amountCents: 30000,
      merchantOrderId: "order-items",
      paymentMethod: "card",
      billingData: {},
      items,
    });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.items).toEqual(items);
  });

  it("throws when Paymob returns a non-OK response", async () => {
    const fetchMock = vi.fn(
      async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          text: async () => '{"detail":"invalid integration"}',
        }) as unknown as Response,
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      PaymentService.generatePaymentSession({
        amountCents: 1000,
        merchantOrderId: "order-bad",
        paymentMethod: "card",
        billingData: {},
      }),
    ).rejects.toThrow(/Failed to create Paymob intention/);
  });

  it("throws when the Secret Key is not configured", async () => {
    delete process.env.PAYMOB_SECRET_KEY;
    await expect(
      PaymentService.generatePaymentSession({
        amountCents: 1000,
        merchantOrderId: "order-nokey",
        paymentMethod: "card",
        billingData: {},
      }),
    ).rejects.toThrow(/PAYMOB_SECRET_KEY is not configured/);
  });

  it("throws when the Public Key is not configured", async () => {
    delete process.env.PAYMOB_PUBLIC_KEY;
    await expect(
      PaymentService.generatePaymentSession({
        amountCents: 1000,
        merchantOrderId: "order-nopk",
        paymentMethod: "card",
        billingData: {},
      }),
    ).rejects.toThrow(/PAYMOB_PUBLIC_KEY is not configured/);
  });
});

describe("PaymentService.verifyWebhookSignature (HMAC)", () => {
  const HMAC_SECRET = "test_hmac_secret";

  // A representative transaction callback object (nested, as in the webhook).
  const obj = {
    amount_cents: 30000,
    created_at: "2026-06-17T10:00:00.000Z",
    currency: "EGP",
    error_occured: false,
    has_parent_transaction: false,
    id: 123456789,
    integration_id: 111111,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: { id: 548102480 },
    owner: 654321,
    pending: false,
    source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
    success: true,
  };

  // Mirrors PaymentService.HMAC_KEYS order exactly.
  function expectedHmac(o: typeof obj): string {
    const stringToHash =
      `${o.amount_cents}` +
      `${o.created_at}` +
      `${o.currency}` +
      `${o.error_occured}` +
      `${o.has_parent_transaction}` +
      `${o.id}` +
      `${o.integration_id}` +
      `${o.is_3d_secure}` +
      `${o.is_auth}` +
      `${o.is_capture}` +
      `${o.is_refunded}` +
      `${o.is_standalone_payment}` +
      `${o.is_voided}` +
      `${o.order.id}` +
      `${o.owner}` +
      `${o.pending}` +
      `${o.source_data.pan}` +
      `${o.source_data.sub_type}` +
      `${o.source_data.type}` +
      `${o.success}`;
    return crypto.createHmac("sha512", HMAC_SECRET).update(stringToHash).digest("hex");
  }

  beforeEach(() => {
    process.env.PAYMOB_HMAC_SECRET = HMAC_SECRET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("accepts a correctly signed payload", () => {
    const sig = expectedHmac(obj);
    expect(PaymentService.verifyWebhookSignature({ obj }, sig)).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const sig = expectedHmac(obj);
    const tampered = sig.slice(0, -1) + (sig.endsWith("a") ? "b" : "a");
    expect(PaymentService.verifyWebhookSignature({ obj }, tampered)).toBe(false);
  });

  it("rejects when the amount was altered after signing", () => {
    const sig = expectedHmac(obj);
    const altered = { obj: { ...obj, amount_cents: 1 } };
    expect(PaymentService.verifyWebhookSignature(altered, sig)).toBe(false);
  });

  it("returns false when the HMAC secret is not configured", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.PAYMOB_HMAC_SECRET;
    expect(PaymentService.verifyWebhookSignature({ obj }, expectedHmac(obj))).toBe(false);
  });

  it("returns false when the payload has no obj", () => {
    expect(PaymentService.verifyWebhookSignature({}, "anything")).toBe(false);
  });
});

describe("PaymentService.verifyRedirectHmac (signed redirect params)", () => {
  const HMAC_SECRET = "test_hmac_secret";

  // Flat query params as Paymob appends them to redirection_url.
  const baseParams: Record<string, string> = {
    amount_cents: "8000",
    created_at: "2026-06-17T10:00:00.000Z",
    currency: "EGP",
    error_occured: "false",
    has_parent_transaction: "false",
    id: "987654321",
    integration_id: "4904392",
    is_3d_secure: "true",
    is_auth: "false",
    is_capture: "false",
    is_refunded: "false",
    is_standalone_payment: "true",
    is_voided: "false",
    order: "548102480",
    owner: "654321",
    pending: "false",
    "source_data.pan": "2346",
    "source_data.sub_type": "MasterCard",
    "source_data.type": "card",
    success: "true",
  };

  // Mirrors PaymentService.HMAC_KEYS order exactly.
  function signRedirect(p: Record<string, string>): string {
    const orderedKeys = [
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
    ];
    const str = orderedKeys.map((k) => `${p[k] ?? ""}`).join("");
    return crypto.createHmac("sha512", HMAC_SECRET).update(str).digest("hex");
  }

  beforeEach(() => {
    process.env.PAYMOB_HMAC_SECRET = HMAC_SECRET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("accepts correctly signed redirect params", () => {
    const params = { ...baseParams, hmac: signRedirect(baseParams) };
    expect(PaymentService.verifyRedirectHmac(params)).toBe(true);
  });

  it("rejects when a param was tampered after signing", () => {
    const hmac = signRedirect(baseParams);
    const params = { ...baseParams, amount_cents: "1", hmac };
    expect(PaymentService.verifyRedirectHmac(params)).toBe(false);
  });

  it("rejects when the hmac param is missing", () => {
    expect(PaymentService.verifyRedirectHmac({ ...baseParams })).toBe(false);
  });

  it("returns false when the HMAC secret is not configured", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.PAYMOB_HMAC_SECRET;
    const params = { ...baseParams, hmac: signRedirect(baseParams) };
    expect(PaymentService.verifyRedirectHmac(params)).toBe(false);
  });
});

/**
 * Regression test against a REAL captured Paymob redirect.
 *
 * The values below are the actual signed query params (and hmac) from a real
 * sandbox card payment — the independent oracle that pins Paymob's exact HMAC
 * field set/order. This is what would have caught the bug where the order was
 * wrong and `is_standalone_payment` / `order` were missing.
 *
 * Runs only when the configured PAYMOB_HMAC_SECRET is the one that signed this
 * fixture (matched by fingerprint), so it never false-fails on another account.
 */
describe("PaymentService — real Paymob redirect signature (regression)", () => {
  // sha256 of the sandbox HMAC secret that signed the fixture below.
  const FIXTURE_SECRET_SHA256 =
    "fc5351da096068d40098cc857e61eae68c43242905ea3696943c5eb531933a95";

  // Real params (URL-decoded) + real hmac from a completed sandbox payment.
  const realParams: Record<string, string> = {
    amount_cents: "17000",
    created_at: "2026-06-17T19:01:16.989894",
    currency: "EGP",
    error_occured: "false",
    has_parent_transaction: "false",
    id: "480565672",
    integration_id: "4904392",
    is_3d_secure: "true",
    is_auth: "false",
    is_capture: "false",
    is_refunded: "false",
    is_standalone_payment: "true",
    is_voided: "false",
    order: "548102480",
    owner: "1886681",
    pending: "false",
    "source_data.pan": "2346",
    "source_data.sub_type": "MasterCard",
    "source_data.type": "card",
    success: "true",
    hmac: "d16b65f20e1e34790576f101b8fb9191f3c36eb8f61330140bb43f4cac54eb841fcf95eac732e1a543b6a06cb8595566204f85ccde398a759bdbe46e203e9fcc",
  };

  const envSecret = ORIGINAL_ENV.PAYMOB_HMAC_SECRET;
  const fingerprintMatches =
    !!envSecret &&
    crypto.createHash("sha256").update(envSecret).digest("hex") === FIXTURE_SECRET_SHA256;

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it.runIf(fingerprintMatches)("verifies the real signed redirect", () => {
    process.env.PAYMOB_HMAC_SECRET = envSecret;
    expect(PaymentService.verifyRedirectHmac(realParams)).toBe(true);
  });

  it.runIf(fingerprintMatches)("rejects the real redirect if a value is tampered", () => {
    process.env.PAYMOB_HMAC_SECRET = envSecret;
    expect(
      PaymentService.verifyRedirectHmac({ ...realParams, amount_cents: "1" }),
    ).toBe(false);
  });
});

/**
 * Live sandbox smoke test — OPT-IN.
 *
 * Run with:  RUN_PAYMOB_LIVE=1 npm test  (from the server directory)
 *
 * Hits the real Intention API with the test keys in server/.env. It only asserts
 * the Secret Key is accepted (no 401/403). A full 201 also requires real
 * PAYMOB_CARD_INTEGRATION_ID / PAYMOB_WALLET_INTEGRATION_ID values; with
 * placeholder IDs Paymob returns a 4xx validation error, which still proves auth.
 */
describe.runIf(process.env.RUN_PAYMOB_LIVE === "1")(
  "Paymob live sandbox (opt-in)",
  () => {
    it("accepts the Secret Key on POST /v1/intention/", async () => {
      const secretKey = process.env.PAYMOB_SECRET_KEY;
      expect(secretKey, "PAYMOB_SECRET_KEY must be set in server/.env").toBeTruthy();

      const res = await fetch("https://accept.paymob.com/v1/intention/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${secretKey}`,
        },
        body: JSON.stringify({
          amount: 1000,
          currency: "EGP",
          payment_methods: [Number(process.env.PAYMOB_CARD_INTEGRATION_ID)],
          items: [{ name: "Smoke test", amount: 1000, quantity: 1 }],
          billing_data: {
            first_name: "Smoke",
            last_name: "Test",
            email: "smoke@example.com",
            phone_number: "01000000000",
            apartment: "NA",
            floor: "NA",
            building: "NA",
            street: "NA",
            city: "Cairo",
            country: "EG",
            state: "NA",
          },
          special_reference: `smoke-${Date.now()}`,
          notification_url: "https://api.example.com/api/payments/paymob-webhook",
          redirection_url: "https://shop.example.com/checkout/success",
        }),
      });

      const text = await res.text();
      // eslint-disable-next-line no-console
      console.log(`[live] Paymob /v1/intention/ -> ${res.status}: ${text.slice(0, 300)}`);

      // Auth must succeed; integration-id validation may still 4xx with placeholders.
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    }, 20000);
  },
);
