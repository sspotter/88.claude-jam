import prisma from "../config/prisma.js";
import { emitOrderStatus } from "../lib/orderEvents.js";

export interface CheckoutItem {
  productId: string;
  quantity: number;
}

export interface OrderCustomerDetails {
  name: string;
  phone: string;
  address: string;
  notes?: string;
}

export interface ValidatedOrder {
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  discount: number;
  totalPrice: number;
  coupon?: {
    code: string;
    discountPercentage: number;
  };
}

export class OrderService {
  /**
   * Validates items and coupons against the source-of-truth Postgres database
   * and calculates the final totals. The frontend never sets prices.
   */
  public static async validateAndCalculate(
    items: CheckoutItem[],
    couponCode?: string
  ): Promise<ValidatedOrder> {
    if (!items || items.length === 0) {
      throw new Error("Cart is empty.");
    }

    const validatedItems = [];
    let subtotal = 0;

    // 1. Validate items and verify pricing against the database
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) {
        throw new Error(`Product with ID '${item.productId}' not found.`);
      }

      const price = Number(product.price);
      const name = String(product.name);

      if (isNaN(price) || price <= 0) {
        throw new Error(`Invalid price for product '${name}'.`);
      }

      const quantity = Math.floor(Number(item.quantity));
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity for product '${name}'.`);
      }

      validatedItems.push({
        productId: item.productId,
        name,
        price,
        quantity,
      });

      subtotal += price * quantity;
    }

    // 2. Validate coupon and calculate discount
    let discount = 0;
    let couponData = undefined;

    if (couponCode) {
      const offer = await prisma.offer.findFirst({
        where: { title: couponCode.trim(), isActive: true },
      });

      if (offer) {
        const discountPercentage = Number(offer.discountPercentage);
        if (!isNaN(discountPercentage) && discountPercentage > 0 && discountPercentage <= 100) {
          discount = subtotal * (discountPercentage / 100);
          couponData = {
            code: couponCode.trim(),
            discountPercentage,
          };
        }
      }
    }

    const totalPrice = Math.max(0, subtotal - discount);

    return {
      items: validatedItems,
      subtotal,
      discount,
      totalPrice,
      coupon: couponData,
    };
  }

  /**
   * Writes the finalized order (with snapshotted line items) to Postgres and
   * decrements stock in the same transaction. Returns the new order id.
   */
  public static async createOrder(params: {
    customerDetails: OrderCustomerDetails;
    validatedOrder: ValidatedOrder;
    paymentMethod: "whatsapp" | "paymob_card" | "paymob_wallet";
  }): Promise<string> {
    const { customerDetails, validatedOrder, paymentMethod } = params;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerName: customerDetails.name,
          phone: customerDetails.phone,
          address: customerDetails.address,
          notes: customerDetails.notes || "",
          totalPrice: validatedOrder.totalPrice,
          paymentMethod,
          status: "pending",
          couponCode: validatedOrder.coupon?.code ?? null,
          couponDiscountPercentage: validatedOrder.coupon?.discountPercentage ?? null,
          items: {
            create: validatedOrder.items.map((i) => ({
              productId: i.productId,
              name: i.name,
              price: i.price,
              quantity: i.quantity,
            })),
          },
        },
      });

      // Decrement stock for each line item (clamped at 0).
      for (const i of validatedOrder.items) {
        await tx.product.update({
          where: { id: i.productId },
          data: { stockCount: { decrement: i.quantity } },
        });
      }

      return created;
    });

    return order.id;
  }

  /**
   * Updates an order's status to paid and broadcasts the change to SSE clients.
   */
  public static async markOrderAsPaid(orderId: string, paymobTransactionId: string): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "paid",
        paymentStatus: "paid",
        paymobTransactionId,
        paidAt: new Date(),
      },
    });
    emitOrderStatus({ orderId, status: "paid", paymentStatus: "paid" });
  }

  /**
   * Updates an order's status to failed and broadcasts the change to SSE clients.
   */
  public static async markOrderAsFailed(orderId: string, paymobTransactionId: string): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "failed",
        paymentStatus: "failed",
        paymobTransactionId,
        failedAt: new Date(),
      },
    });
    emitOrderStatus({ orderId, status: "failed", paymentStatus: "failed" });
  }
}
