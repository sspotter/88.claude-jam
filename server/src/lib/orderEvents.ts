import { EventEmitter } from "events";

// In-process pub/sub for order status changes. The Paymob webhook (and any
// admin status change) emits here; the SSE route (/api/orders/:id/stream)
// subscribes and pushes updates to the browser. Replaces Firestore onSnapshot
// on the CheckoutSuccess page.
//
// Note: single-process only. If the server is ever horizontally scaled, swap
// this for Redis pub/sub — the emit/subscribe surface stays the same.

export interface OrderStatusEvent {
  orderId: string;
  status: string; // pending | shipped | paid | failed
  paymentStatus?: string;
}

const emitter = new EventEmitter();
// Many concurrent checkout pages may listen at once.
emitter.setMaxListeners(0);

function channel(orderId: string): string {
  return `order:${orderId}`;
}

export function emitOrderStatus(event: OrderStatusEvent): void {
  emitter.emit(channel(event.orderId), event);
}

export function subscribeOrderStatus(
  orderId: string,
  listener: (event: OrderStatusEvent) => void
): () => void {
  const ch = channel(orderId);
  emitter.on(ch, listener);
  return () => emitter.off(ch, listener);
}
