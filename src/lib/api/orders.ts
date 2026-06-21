import { apiFetch } from "./client.js";
import type { Order } from "./admin.js";

export interface CheckoutItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CheckoutPayload {
  items: CheckoutItem[];
  customerDetails: {
    name: string;
    phone: string;
    address: string;
    notes?: string;
  };
  paymentMethod: "whatsapp" | "paymob_card" | "paymob_wallet";
  couponCode?: string;
  currency?: string;
}

export interface CheckoutResult {
  success: boolean;
  orderId: string;
  redirectUrl: string;
}

export function checkout(payload: CheckoutPayload): Promise<CheckoutResult> {
  return apiFetch<CheckoutResult>("/api/orders/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getOrderStatus(id: string): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${id}/status`);
}

export interface VerifyPaymentResult {
  orderId: string;
  status: string;
  paymentStatus?: string;
}

/**
 * Verify a Paymob redirect by forwarding its signed query params to the backend,
 * which checks the HMAC and resolves the order. Used by the checkout-success page
 * so payment confirmation works even when the webhook can't reach the server.
 */
export function verifyPayment(
  orderId: string,
  params: Record<string, string>,
): Promise<VerifyPaymentResult> {
  return apiFetch<VerifyPaymentResult>("/api/payments/verify", {
    method: "POST",
    body: JSON.stringify({ orderId, params }),
  });
}
