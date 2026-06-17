// Serialization helpers that keep the frontend's data contract identical to the
// old Firestore shape: timestamps are exposed as epoch-ms numbers (Date.now()),
// and the order `coupon` object is reconstructed from its two columns.

export function toEpochMs(d: Date | null | undefined): number | null {
  return d ? d.getTime() : null;
}

type ProductRow = {
  id: string;
  name: string;
  nameAr: string | null;
  price: number;
  categoryId: string;
  isAvailable: boolean;
  stockCount: number;
  image: string | null;
  pricingType: string | null;
  description: string | null;
  createdAt: Date;
};

export function serializeProduct(p: ProductRow) {
  return {
    id: p.id,
    name: p.name,
    nameAr: p.nameAr ?? undefined,
    price: p.price,
    categoryId: p.categoryId,
    isAvailable: p.isAvailable,
    stockCount: p.stockCount,
    image: p.image ?? undefined,
    pricingType: p.pricingType ?? undefined,
    description: p.description ?? undefined,
    createdAt: p.createdAt.getTime(),
  };
}

type CategoryRow = {
  id: string;
  name: string;
  nameAr: string | null;
  image: string | null;
  isHidden: boolean;
  createdAt: Date;
};

export function serializeCategory(c: CategoryRow) {
  return {
    id: c.id,
    name: c.name,
    nameAr: c.nameAr ?? undefined,
    image: c.image ?? undefined,
    isHidden: c.isHidden,
    createdAt: c.createdAt.getTime(),
  };
}

type OfferRow = {
  id: string;
  title: string;
  description: string | null;
  discountPercentage: number;
  isActive: boolean;
  createdAt: Date;
};

export function serializeOffer(o: OfferRow) {
  return {
    id: o.id,
    title: o.title,
    description: o.description ?? undefined,
    discountPercentage: o.discountPercentage,
    isActive: o.isActive,
    createdAt: o.createdAt.getTime(),
  };
}

type OrderItemRow = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

type OrderRow = {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  notes: string | null;
  totalPrice: number;
  paymentMethod: string;
  status: string;
  paymentStatus: string | null;
  paymobTransactionId: string | null;
  paidAt: Date | null;
  failedAt: Date | null;
  couponCode: string | null;
  couponDiscountPercentage: number | null;
  createdAt: Date;
  items?: OrderItemRow[];
};

export function serializeOrder(o: OrderRow) {
  return {
    id: o.id,
    customerName: o.customerName,
    phone: o.phone,
    address: o.address,
    notes: o.notes ?? "",
    items: (o.items ?? []).map((i) => ({
      productId: i.productId,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
    totalPrice: o.totalPrice,
    paymentMethod: o.paymentMethod,
    status: o.status,
    paymentStatus: o.paymentStatus ?? undefined,
    paymobTransactionId: o.paymobTransactionId ?? undefined,
    paidAt: toEpochMs(o.paidAt) ?? undefined,
    failedAt: toEpochMs(o.failedAt) ?? undefined,
    coupon:
      o.couponCode != null && o.couponDiscountPercentage != null
        ? { code: o.couponCode, discountPercentage: o.couponDiscountPercentage }
        : undefined,
    createdAt: o.createdAt.getTime(),
  };
}
