import dotenv from "dotenv";
import crypto from "crypto";
import prisma from "../config/prisma.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}/api`;

async function runTest() {
  console.log("🚀 Starting Jamhawi end-to-end payment test...");

  // 1. Verify database connectivity (Postgres via Prisma).
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ PostgreSQL (Prisma) connected.");
  } catch (err) {
    console.error("❌ Failed to connect to PostgreSQL. Is DATABASE_URL set and the DB running?", err);
    process.exit(1);
  }

  // 2. Fetch or create a test product (needs a category for the FK).
  let productId = "";
  let productName = "";
  try {
    const existing = await prisma.product.findFirst();
    if (!existing) {
      console.log("📝 No products found. Creating a temporary category + product...");
      const category = await prisma.category.create({ data: { name: "Test Fruits" } });
      const product = await prisma.product.create({
        data: {
          name: "Test Avocado",
          price: 150,
          categoryId: category.id,
          stockCount: 10,
          isAvailable: true,
        },
      });
      productId = product.id;
      productName = product.name;
      console.log(`✅ Temporary product created with ID: ${productId}`);
    } else {
      productId = existing.id;
      productName = existing.name;
      console.log(`✅ Using existing product: "${productName}" (ID: ${productId})`);
    }
  } catch (err) {
    console.error("❌ Database read/write failed.", err);
    process.exit(1);
  }

  // 3. Trigger checkout API (creates a pending order).
  let orderId = "";
  let paymobCheckoutUrl = "";
  try {
    console.log("📡 Sending checkout request to backend server...");
    const checkoutRes = await fetch(`${BACKEND_URL}/orders/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productId, quantity: 2 }],
        customerDetails: {
          name: "Test Shopper",
          phone: "01009999999",
          address: "123 Sandbox Street, Egypt",
          notes: "Testing automated backend checkout",
        },
        paymentMethod: "paymob_card",
      }),
    });

    if (!checkoutRes.ok) {
      const errText = await checkoutRes.text();
      throw new Error(`Checkout endpoint failed with status ${checkoutRes.status}: ${errText}`);
    }

    const checkoutData = (await checkoutRes.json()) as any;
    orderId = checkoutData.orderId;
    paymobCheckoutUrl = checkoutData.redirectUrl;

    console.log(`✅ Order created in database with ID: ${orderId}`);
    console.log(`✅ Paymob checkout session generated URL: ${paymobCheckoutUrl.substring(0, 75)}...`);
  } catch (err: any) {
    console.error("❌ Checkout API call failed. Make sure your backend server is running! Error:", err.message);
    process.exit(1);
  }

  // 4. Verify initial database status is "pending".
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    console.log(`🔍 Verified initial database order status: "${order?.status}"`);
    if (order?.status !== "pending") {
      throw new Error(`Order should be in pending status, but got "${order?.status}"`);
    }
  } catch (err: any) {
    console.error("❌ Database validation failed:", err.message);
    process.exit(1);
  }

  // 5. Simulate Paymob webhook (compute HMAC signature and POST).
  try {
    console.log("🔑 Simulating Paymob payment verification webhook...");
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET || "hmac_secret_placeholder";
    const transactionId = `${Math.floor(10000000 + Math.random() * 90000000)}`;
    const createdAt = new Date().toISOString();

    const amountCents = 30000; // 300.00 EGP (2 * 150)
    const currency = "EGP";
    const errorOccurred = "false";
    const hasParentTransaction = "false";
    const is3dSecure = "true";
    const isAuth = "false";
    const isCapture = "false";
    const isVoided = "false";
    const isRefunded = "false";
    const owner = "123456";
    const pending = "false";
    const success = "true";
    const pan = "512345xxxxxx4321";
    const subType = "card";
    const type = "card";

    const stringToHash =
      `${amountCents}` +
      `${createdAt}` +
      `${currency}` +
      `${errorOccurred}` +
      `${hasParentTransaction}` +
      `${transactionId}` +
      `${process.env.PAYMOB_CARD_INTEGRATION_ID || "12345"}` +
      `${is3dSecure}` +
      `${isAuth}` +
      `${isCapture}` +
      `${isVoided}` +
      `${isRefunded}` +
      `${owner}` +
      `${pending}` +
      `${pan}` +
      `${subType}` +
      `${type}` +
      `${success}`;

    const computedHmac = crypto
      .createHmac("sha512", hmacSecret)
      .update(stringToHash)
      .digest("hex");

    console.log(`📡 Sending webhook payload with simulated HMAC signature...`);
    const webhookRes = await fetch(`${BACKEND_URL}/payments/paymob-webhook?hmac=${computedHmac}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        obj: {
          id: transactionId,
          amount_cents: amountCents,
          created_at: createdAt,
          currency,
          error_occured: false,
          has_parent_transaction: false,
          integration_id: Number(process.env.PAYMOB_CARD_INTEGRATION_ID || 12345),
          is_3d_secure: true,
          is_auth: false,
          is_capture: false,
          is_voided: false,
          is_refunded: false,
          owner: 123456,
          pending: false,
          source_data: {
            pan,
            sub_type: subType,
            type,
          },
          success: true,
          order: {
            merchant_order_id: orderId,
          },
        },
      }),
    });

    if (!webhookRes.ok) {
      const errText = await webhookRes.text();
      throw new Error(`Webhook simulation endpoint failed with status ${webhookRes.status}: ${errText}`);
    }

    const webhookResult = await webhookRes.json();
    console.log(`✅ Webhook endpoint responded:`, JSON.stringify(webhookResult));
  } catch (err: any) {
    console.error("❌ Webhook simulation failed:", err.message);
    process.exit(1);
  }

  // 6. Verify order status has changed to "paid".
  try {
    console.log("🔍 Checking database order status post-payment...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    console.log(`✨ Current database order status: "${order?.status}"`);
    console.log(`✨ Current database payment status: "${order?.paymentStatus}"`);

    if (order?.status === "paid") {
      console.log("\n🎉 E2E TEST PASSED SUCCESSFULLY!");
      console.log("✅ Backend checkout worked.");
      console.log("✅ Paymob transaction creation worked.");
      console.log("✅ Webhook HMAC verification worked.");
      console.log("✅ Order was marked PAID in PostgreSQL.");
    } else {
      throw new Error(`Order status should have changed to 'paid', but is still '${order?.status}'`);
    }
  } catch (err: any) {
    console.error("❌ E2E verification failed:", err.message);
    process.exit(1);
  }
}

runTest()
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
