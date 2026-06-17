import { Router, Request, Response } from "express";
import { PaymentService } from "../services/payment.service.js";
import { OrderService } from "../services/order.service.js";
import prisma from "../config/prisma.js";

const router = Router();

/**
 * Verify a Paymob redirect (transaction response callback).
 *
 * The browser lands on /checkout/success with Paymob's signed result params in
 * the URL. The frontend forwards them here; we verify the HMAC and resolve the
 * order from the trusted `success` flag. This makes payment confirmation work
 * even when the server-to-server webhook can't reach us (e.g. localhost backend).
 *
 * Idempotent: safe to call alongside the webhook — whichever lands first wins,
 * and re-marking the same terminal status is a no-op for the client.
 */
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { orderId, params } = req.body as {
      orderId?: string;
      params?: Record<string, string>;
    };

    if (!orderId || !params || typeof params !== "object") {
      return res.status(400).json({ error: "Missing orderId or params." });
    }
    if (!params.hmac) {
      return res.status(400).json({ error: "Missing hmac — not a Paymob redirect." });
    }

    const isValid = PaymentService.verifyRedirectHmac(params);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid HMAC signature." });
    }

    // Only act on an order we actually own.
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    const isSuccess = params.success === "true" || (params.success as unknown) === true;
    const transactionId = String(params.id ?? "");

    // Don't downgrade an already-resolved order (e.g. webhook beat us to it).
    if (order.status !== "paid" && order.status !== "failed") {
      if (isSuccess) {
        await OrderService.markOrderAsPaid(orderId, transactionId);
      } else {
        await OrderService.markOrderAsFailed(orderId, transactionId);
      }
    }

    const updated = await prisma.order.findUnique({ where: { id: orderId } });
    return res.json({
      orderId,
      status: updated?.status,
      paymentStatus: updated?.paymentStatus ?? undefined,
    });
  } catch (error: any) {
    console.error("Error verifying Paymob redirect:", error);
    return res.status(500).json({ error: error.message || "Verification failed." });
  }
});

/**
 * Paymob Webhook callback handler
 * Paymob sends a POST request here when transaction processing completes.
 */
router.post("/paymob-webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.query.hmac as string;
    if (!signature) {
      console.warn("Paymob webhook received without signature.");
      return res.status(401).json({ error: "Missing HMAC signature" });
    }

    // 1. Verify webhook signature
    const isValid = PaymentService.verifyWebhookSignature(req.body, signature);
    if (!isValid) {
      console.error("Paymob webhook received with invalid signature.");
      return res.status(401).json({ error: "Invalid signature verification" });
    }

    const payload = req.body;
    const transactionObj = payload.obj;
    if (!transactionObj) {
      return res.status(400).json({ error: "Malformed payload structure" });
    }

    const orderId = transactionObj.order?.merchant_order_id;
    const transactionId = String(transactionObj.id);
    const isSuccess = transactionObj.success === true || transactionObj.success === "true";

    if (!orderId) {
      console.warn(`Paymob transaction ${transactionId} received without merchant_order_id.`);
      return res.json({ status: "skipped", reason: "no merchant_order_id" });
    }

    console.log(`Processing webhook for Order ${orderId}: Transaction ${transactionId}, success=${isSuccess}`);

    // 2. Update order status in Firestore
    if (isSuccess) {
      await OrderService.markOrderAsPaid(orderId, transactionId);
      console.log(`Order ${orderId} successfully marked as PAID.`);
    } else {
      await OrderService.markOrderAsFailed(orderId, transactionId);
      console.warn(`Order ${orderId} marked as FAILED.`);
    }

    return res.json({ status: "success" });
  } catch (error: any) {
    console.error("Error processing Paymob webhook:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

export default router;
