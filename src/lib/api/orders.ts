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
