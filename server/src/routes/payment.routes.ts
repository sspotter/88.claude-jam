import { Router, Request, Response } from "express";
import { PaymentService } from "../services/payment.service.js";
import { OrderService } from "../services/order.service.js";

const router = Router();

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
