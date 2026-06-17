import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CurrencyCode,
  PriceSource,
  ProductPrice,
  ProductPricingType,
} from "../types/pricing";
import { repriceCartItem } from "../lib/pricing/cartHelpers";
import { getCartLineId } from "../lib/pricing/weightPricing";

export interface CartItem {
  cartLineId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  currency?: CurrencyCode;
  priceSource?: PriceSource;
  exchangeRateUsed?: number | null;
  basePrice?: number;
  weight?: string;
  pricePerKg?: number;
  pricingType?: ProductPricingType;
}

interface CartState {
  items: CartItem[];
  coupon: { code: string; discountPercentage: number } | null;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (cartLineId: string) => void;
  updateQuantity: (cartLineId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string, discountPercentage: number) => void;
  removeCoupon: () => void;
  getTotalPrice: () => number;
  repriceAllItems: (
    currency: CurrencyCode,
    pricesByProduct: Map<string, ProductPrice[]>,
    rateMap: Partial<Record<CurrencyCode, number>>,
  ) => void;
}

function normalizeCartItem(item: CartItem): CartItem {
  if (item.cartLineId) {
    return item;
  }

  return {
    ...item,
    cartLineId: getCartLineId(item.productId, item.weight),
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      addItem: (item, quantity = 1) =>
        set((state) => {
          const normalizedItem = {
            ...item,
            cartLineId:
              item.cartLineId ??
              getCartLineId(item.productId, item.weight),
          };
          const existingItem = state.items.find(
            (i) => i.cartLineId === normalizedItem.cartLineId,
          );

          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.cartLineId === normalizedItem.cartLineId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i,
              ),
            };
          }

          return {
            items: [
              ...state.items,
              { ...normalizedItem, quantity },
            ],
          };
        }),
      removeItem: (cartLineId) =>
        set((state) => ({
          items: state.items.filter((i) => i.cartLineId !== cartLineId),
        })),
      updateQuantity: (cartLineId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((i) => i.cartLineId !== cartLineId),
            };
          }
          return {
            items: state.items.map((i) =>
              i.cartLineId === cartLineId ? { ...i, quantity } : i,
            ),
          };
        }),
      clearCart: () => set({ items: [], coupon: null }),
      applyCoupon: (code, discountPercentage) =>
        set({ coupon: { code, discountPercentage } }),
      removeCoupon: () => set({ coupon: null }),
      getTotalPrice: () => {
        const subtotal = get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0,
        );
        const coupon = get().coupon;
        if (coupon) {
          return subtotal * (1 - coupon.discountPercentage / 100);
        }
        return subtotal;
      },
      repriceAllItems: (currency, pricesByProduct, rateMap) =>
        set((state) => {
          if (state.items.length === 0) return state;

          const newItems = state.items.map((item) =>
            repriceCartItem(item, currency, pricesByProduct, rateMap),
          );
          const changed = newItems.some(
            (item, index) =>
              item.price !== state.items[index].price ||
              item.currency !== state.items[index].currency ||
              item.priceSource !== state.items[index].priceSource ||
              item.exchangeRateUsed !== state.items[index].exchangeRateUsed,
          );

          if (!changed) return state;
          return { items: newItems };
        }),
    }),
    {
      name: "jamhawi-cart-storage",
      merge: (persisted, current) => {
        const persistedState = persisted as CartState | undefined;
        if (!persistedState?.items) {
          return current;
        }

        return {
          ...current,
          ...persistedState,
          items: persistedState.items.map(normalizeCartItem),
        };
      },
    },
  ),
);
