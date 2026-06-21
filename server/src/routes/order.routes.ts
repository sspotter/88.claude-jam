import { Router, Request, Response } from "express";
import { OrderService } from "../services/order.service.js";
import { PaymentService } from "../services/payment.service.js";
import prisma from "../config/prisma.js";
import { serializeOrder } from "../lib/serialize.js";
import { subscribeOrderStatus } from "../lib/orderEvents.js";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
const BUSINESS_PHONE = process.env.BUSINESS_PHONE || "201027982033";

router.post("/checkout", async (req: Request, res: Response) => {
  try {
    const { items, customerDetails, paymentMethod, couponCode, currency } = req.body;

    // 1. Basic validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing or invalid items array." });
    }
    if (!customerDetails || !customerDetails.name || !customerDetails.phone || !customerDetails.address) {
      return res.status(400).json({ error: "Missing or invalid customer details." });
    }
    if (!paymentMethod || !["whatsapp", "paymob_card", "paymob_wallet"].includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method." });
    }

    const orderCurrency = String(currency || "AED");

    // 2. Validate prices, coupons and calculate total price in the target currency
    const validatedOrder = await OrderService.validateAndCalculate(items, couponCode, orderCurrency);

    // 3. Create the order in PostgreSQL with "pending" status
    const orderId = await OrderService.createOrder({
      customerDetails,
      validatedOrder,
      paymentMethod,
      currency: orderCurrency,
    });

    // 4. Handle redirects based on payment method choice
    if (paymentMethod === "whatsapp") {
      // Build WhatsApp message redirect URL (mimics client logic)
      let message = `Hello, I placed an order:\n\n`;
      message += `Order ID: ${orderId}\n`;
      message += `Customer Name: ${customerDetails.name}\n`;
      message += `Phone Number: ${customerDetails.phone}\n`;
      message += `Address: ${customerDetails.address}\n`;
      if (customerDetails.notes) {
        message += `Notes: ${customerDetails.notes}\n`;
      }
      message += `\n`;

      validatedOrder.items.forEach((item) => {
        message += `- ${item.name} x${item.quantity} = ${(item.price * item.quantity).toFixed(2)} ${orderCurrency}\n`;
      });

      if (validatedOrder.coupon) {
        message += `\nSubtotal: ${validatedOrder.subtotal.toFixed(2)} ${orderCurrency}`;
        message += `\nDiscount: ${validatedOrder.coupon.discountPercentage}% OFF (Code: ${validatedOrder.coupon.code})`;
      }

      message += `\nTotal: ${validatedOrder.totalPrice.toFixed(2)} ${orderCurrency}`;

      const waRedirectUrl = `https://wa.me/${BUSINESS_PHONE}?text=${encodeURIComponent(message)}`;

      return res.json({
        success: true,
        orderId,
        redirectUrl: waRedirectUrl,
      });
    } else {
      // Paymob payment intent generation
      const amountCents = Math.round(validatedOrder.totalPrice * 100);
      const isWallet = paymentMethod === "paymob_wallet";

      // Split name safely into first and last
      const nameParts = customerDetails.name.trim().split(/\s+/);
      const firstName = nameParts[0] || "Guest";
      const lastName = nameParts.slice(1).join(" ") || "Customer";

      const session = await PaymentService.generatePaymentSession({
        amountCents,
        merchantOrderId: orderId,
        paymentMethod: isWallet ? "wallet" : "card",
        billingData: {
          firstName,
          lastName,
          phoneNumber: customerDetails.phone,
          street: customerDetails.address,
        },
      });

      return res.json({
        success: true,
        orderId,
        redirectUrl: session.checkoutUrl,
      });
    }
  } catch (error: any) {
    console.error("Checkout processing error:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred during checkout processing.",
    });
  }
});

/**
 * GET /api/orders/:id/status
 * One-shot order status read used by the CheckoutSuccess page as an initial
 * fetch and SSE fallback. Public (no PII beyond status) — returns minimal shape.
 */
router.get("/:id/status", async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    return res.json(serializeOrder(order));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch order." });
  }
});

/**
 * GET /api/orders/:id/stream
 * Server-Sent Events stream of order status. Replaces the Firestore onSnapshot
 * listener on the CheckoutSuccess page. Emits the current status immediately,
 * then pushes updates as the Paymob webhook resolves the order.
 */
router.get("/:id/stream", async (req: Request, res: Response) => {
  const orderId = req.params.id;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // 1. Send the current status right away.
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      send({ error: "not_found" });
      return res.end();
    }
    send({ orderId, status: order.status, paymentStatus: order.paymentStatus ?? undefined });
    if (order.status === "paid" || order.status === "failed") {
      // Terminal state already reached — no need to keep the stream open.
      return res.end();
    }
  } catch {
    send({ error: "fetch_failed" });
    return res.end();
  }

  // 2. Subscribe to future status changes.
  const unsubscribe = subscribeOrderStatus(orderId, (event) => {
    send(event);
    if (event.status === "paid" || event.status === "failed") {
      cleanup();
      res.end();
    }
  });

  // 3. Heartbeat to keep proxies from closing the idle connection.
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25000);

  const cleanup = () => {
    clearInterval(heartbeat);
    unsubscribe();
  };

  req.on("close", cleanup);
});

export default router;
