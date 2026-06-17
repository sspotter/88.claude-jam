import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { checkout } from "../lib/api/orders";
import { handleApiError, OperationType } from "../lib/api/errors";
import { useCartStore } from "../store/cartStore";
import { toast } from "sonner";
import { Tag, MessageCircle, CreditCard, Wallet } from "lucide-react";
import { formatPrice } from "../lib/pricing/formatPrice";
import { useRepriceCartOnCurrencyChange } from "../hooks/usePricing";
import { useCurrencyStore } from "../store/currencyStore";

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart, coupon } = useCartStore();
  const orderCurrency = useCurrencyStore((state) => state.currency);

  useRepriceCartOnCurrencyChange();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "whatsapp" | "paymob_card" | "paymob_wallet"
  >("whatsapp");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (items.length === 0 && !success) {
    navigate("/cart");
    return null;
  }

  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone || !address) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      const result = await checkout({
        items: items
          .filter((i) => i.productId)
          .map((i) => ({
            productId: i.productId!,
            name: i.name ?? "Unknown Product",
            price: typeof i.price === "number" ? i.price : 0,
            quantity: typeof i.quantity === "number" ? i.quantity : 1,
          })),
        customerDetails: {
          name: customerName,
          phone,
          address,
          notes: notes || undefined,
        },
        paymentMethod,
        couponCode: coupon?.code,
      });

      if (paymentMethod === "whatsapp") {
        // WhatsApp: show the in-page confirmation, then hand off to wa.me.
        setSuccess(true);
        clearCart();
        toast.success(t("order_success_msg"));
        setTimeout(() => {
          window.location.href = result.redirectUrl;
        }, 1500);
      } else {
        // Card / wallet: leave the site for Paymob's hosted checkout. The
        // customer returns to /checkout/success when Paymob redirects back.
        clearCart();
        window.location.href = result.redirectUrl;
      }
    } catch (error) {
      handleApiError(error, OperationType.CREATE, "orders");
      toast.error(
        "An error occurred while placing your order. Please try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6">
      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6 sm:p-8">
        <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-8 text-center tracking-tight">
          {t("checkout")}
        </h1>

        {success ? (
          <div className="text-center py-10 space-y-4 animate-fade-in">
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-green-100">
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-xl font-serif font-bold text-stone-800">
              {t("order_success_msg")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold text-stone-400 mb-2 font-mono">
                {t("customer_name")}
              </label>
              <input
                type="text"
                required
                disabled={submitting}
                className="w-full px-4 py-3 bg-stone-50/50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent focus:bg-white outline-none transition-all disabled:bg-stone-100"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold text-stone-400 mb-2 font-mono">
                {t("phone_number")}
              </label>
              <input
                type="tel"
                required
                disabled={submitting}
                dir="ltr"
                className={`w-full px-4 py-3 bg-stone-50/50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent focus:bg-white outline-none transition-all disabled:bg-stone-100 ${i18n.language === "ar" ? "text-right" : ""}`}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold text-stone-400 mb-2 font-mono">
                {t("address")}
              </label>
              <textarea
                required
                rows={2}
                disabled={submitting}
                className="w-full px-4 py-3 bg-stone-50/50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent focus:bg-white outline-none transition-all disabled:bg-stone-100 resize-none"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold text-stone-400 mb-2 font-mono">
                {t("notes")}
              </label>
              <textarea
                rows={2}
                disabled={submitting}
                className="w-full px-4 py-3 bg-stone-50/50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent focus:bg-white outline-none transition-all disabled:bg-stone-100 resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold text-stone-400 mb-2 font-mono">
                {t("payment_method")}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { value: "whatsapp", label: t("pay_whatsapp"), Icon: MessageCircle },
                    { value: "paymob_card", label: t("pay_card"), Icon: CreditCard },
                    { value: "paymob_wallet", label: t("pay_wallet"), Icon: Wallet },
                  ] as const
                ).map(({ value, label, Icon }) => {
                  const selected = paymentMethod === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={submitting}
                      onClick={() => setPaymentMethod(value)}
                      aria-pressed={selected}
                      className={`flex flex-col items-center justify-center gap-2 px-2 py-4 rounded-xl border text-center transition-all disabled:opacity-60 ${
                        selected
                          ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)] bg-white shadow-sm"
                          : "border-stone-200 bg-stone-50/50 hover:bg-white"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${selected ? "text-[var(--color-primary)]" : "text-stone-400"}`}
                      />
                      <span
                        className={`text-xs font-medium ${selected ? "text-stone-800" : "text-stone-500"}`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-stone-50/50 p-6 rounded-2xl border border-stone-100 mt-8 mb-6 space-y-3 shadow-inner">
              {coupon && (
                <div className="flex justify-between items-center text-xs text-stone-400 font-mono">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal, orderCurrency)}</span>
                </div>
              )}
              {coupon && (
                <div className="flex justify-between items-center text-xs text-green-600 font-mono">
                  <div className="flex items-center gap-1"><Tag className="w-3.5 h-3.5"/> Discount ({coupon.code})</div>
                  <span>-{coupon.discountPercentage}%</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-medium border-t border-stone-200/60 pt-3">
                <span className="text-stone-800 font-serif font-bold">{t("total")}</span>
                <span className="font-serif font-bold text-[var(--color-primary)] text-2xl">
                  {formatPrice(getTotalPrice(), orderCurrency)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-lg font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-md hover:shadow-lg flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              {submitting ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : paymentMethod === "whatsapp" ? (
                <svg
                  className="w-6 h-6 animate-pulse"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              ) : (
                <CreditCard className="w-6 h-6" />
              )}
              {paymentMethod === "whatsapp" ? t("submit_order") : t("pay_now")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
