import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, Tag, X, ShoppingCart, ArrowLeft } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { validateCoupon } from "../lib/api/catalog";
import { toast } from "sonner";
import { motion } from "motion/react";
import CartPriceLabel from "../components/CartPriceLabel";
import CurrencySelector from "../components/CurrencySelector";
import { formatPrice } from "../lib/pricing/formatPrice";
import { useRepriceCartOnCurrencyChange } from "../hooks/usePricing";
import { useCurrencyStore } from "../store/currencyStore";

export default function Cart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, getTotalPrice, coupon, applyCoupon, removeCoupon } =
    useCartStore();
  const displayCurrency = useCurrencyStore((state) => state.currency);
  const [couponInput, setCouponInput] = useState("");
  const [applying, setApplying] = useState(false);

  useRepriceCartOnCurrencyChange();

  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setApplying(true);
    try {
      const result = await validateCoupon(couponInput.trim());
      if (!result.valid || result.discountPercentage == null) {
        toast.error(result.error || "Invalid or inactive coupon code.");
      } else {
        applyCoupon(result.code ?? couponInput.trim(), result.discountPercentage);
        toast.success(`Coupon applied! ${result.discountPercentage}% OFF`);
        setCouponInput("");
      }
    } catch {
      toast.error("Failed to apply coupon.");
    } finally {
      setApplying(false);
    }
  };

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <>
        <style>{`
          .cart-empty-root {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; min-height: 60vh;
            gap: 1.5rem; text-align: center;
            background: #131313; color: #e5e2e1;
            margin: -1.5rem -1rem -2.5rem;
            padding: 4rem clamp(1rem,4vw,3rem);
          }
          @media(min-width:640px){ .cart-empty-root { margin: -1.5rem -1.5rem -2.5rem; } }
          .cart-empty-icon {
            width: 5rem; height: 5rem; border-radius: 50%;
            background: #1a1a1a; border: 1px solid rgba(212,175,55,0.2);
            display: flex; align-items: center; justify-content: center;
            color: rgba(212,175,55,0.4);
          }
          .cart-empty-title {
            font-family: "Maj", serif;
            font-size: 2rem; font-weight: 600; color: #e5e2e1; margin: 0;
          }
          .cart-empty-sub { color: #a0a0a0; font-size: 0.95rem; margin: 0; }
          .cart-empty-btn {
            display: inline-flex; align-items: center; gap: 0.5rem;
            padding: 0.85rem 2rem; border-radius: 9999px;
            background: #f2ca50; color: #131313;
            font-family: "Maj", sans-serif;
            font-size: 0.78rem; font-weight: 700;
            letter-spacing: 0.1em; text-transform: uppercase;
            text-decoration: none;
            transition: all 250ms ease;
            box-shadow: 0 8px 24px rgba(242,202,80,0.25);
          }
          .cart-empty-btn:hover {
            background: #d4af37;
            box-shadow: 0 10px 32px rgba(242,202,80,0.4);
            transform: translateY(-2px);
          }
        `}</style>
        <div className="cart-empty-root">
          <div className="cart-empty-icon">
            <ShoppingCart size={28} />
          </div>
          <h2 className="cart-empty-title">{t("empty_cart")}</h2>
          <p className="cart-empty-sub">Your cart is waiting to be filled with something extraordinary.</p>
          <Link to="/shop" className="cart-empty-btn">
            <ArrowLeft size={14} />
            {t("categories")}
          </Link>
        </div>
      </>
    );
  }

  /* ── Cart ── */
  return (
    <>
      <style>{`
        /* ── Artisanal Noir — Cart ───────────────────────────────────── */
        .cart-root {
          --an-bg:          #131313;
          --an-surface:     #1a1a1a;
          --an-surface-hi:  #2a2a2a;
          --an-text:        #e5e2e1;
          --an-muted:       #a0a0a0;
          --an-variant:     #d0c5af;
          --an-gold:        #f2ca50;
          --an-gold-deep:   #d4af37;
          --an-outline:     rgba(212,175,55,0.18);
          --an-radius-full: 9999px;
          font-family: "Maj", sans-serif;
          background: var(--an-bg);
          color: var(--an-text);
          margin: -1.5rem -1rem -2.5rem;
          padding: 3rem clamp(1rem,4vw,3rem) 5rem;
          min-height: calc(100vh - 80px);
        }
        @media(min-width:640px){ .cart-root { margin: -1.5rem -1.5rem -2.5rem; } }

        .cart-inner { max-width: 56rem; margin: 0 auto; }

        .cart-title {
          font-family: "Maj", serif;
          font-size: clamp(1.75rem,4vw,2.5rem);
          font-weight: 700; letter-spacing: -0.01em;
          color: var(--an-text); margin: 0 0 2.5rem;
        }
        .cart-title span { color: var(--an-gold); }

        /* card wrapper */
        .cart-panel {
          background: var(--an-surface);
          border: 1px solid var(--an-outline);
          border-radius: 16px;
          overflow: hidden;
          position: relative;
        }
        /* gold top accent */
        .cart-panel::before {
          content: '';
          position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
          background: linear-gradient(90deg, transparent, #e9c349, transparent);
        }

        /* items list */
        .cart-items { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

        .cart-item {
          display: flex; flex-direction: row;
          gap: 1rem; align-items: center;
          padding: 1.1rem;
          background: #201f1f;
          border: 1px solid var(--an-outline);
          border-radius: 12px;
          transition: border-color 250ms ease;
        }
        .cart-item:hover { border-color: rgba(242,202,80,0.3); }

        @media(max-width:480px) {
          .cart-item { flex-wrap: wrap; }
        }

        /* thumbnail */
        .cart-item__thumb {
          width: 4.5rem; height: 4.5rem; flex-shrink: 0;
          border-radius: 8px; overflow: hidden;
          background: #2a2a2a;
          border: 1px solid var(--an-outline);
        }
        .cart-item__thumb img { width: 100%; height: 100%; object-fit: cover; }
        .cart-item__thumb-empty {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: #4d4635; font-size: 0.65rem; text-align: center;
        }

        /* name / price */
        .cart-item__info { flex: 1; min-width: 0; }
        .cart-item__name {
          font-family: "Maj", serif;
          font-size: 0.95rem; font-weight: 500;
          color: var(--an-text); margin: 0 0 0.3rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cart-item__price { color: var(--an-gold); font-size: 0.82rem; font-weight: 700; margin: 0; }

        /* qty stepper */
        .cart-qty {
          display: flex; align-items: center;
          border: 1px solid var(--an-outline);
          border-radius: var(--an-radius-full);
          background: var(--an-bg);
          overflow: hidden; flex-shrink: 0;
        }
        .cart-qty__btn {
          width: 2rem; height: 2rem;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: none; cursor: pointer;
          color: var(--an-muted);
          transition: color 200ms ease, background 200ms ease;
        }
        .cart-qty__btn:hover { color: var(--an-gold); background: rgba(242,202,80,0.06); }
        .cart-qty__val {
          width: 2rem; text-align: center;
          font-family: "Maj", serif;
          font-size: 0.95rem; font-weight: 600;
          color: var(--an-text);
        }

        /* line total */
        .cart-item__total {
          width: 5.5rem; text-align: right; flex-shrink: 0;
          font-family: "Maj", serif;
          font-size: 1rem; font-weight: 700;
          color: var(--an-text);
        }
        @media(max-width:480px) { .cart-item__total { display: none; } }

        /* remove */
        .cart-item__remove {
          width: 2rem; height: 2rem; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; border: 1px solid var(--an-outline);
          background: transparent; cursor: pointer;
          color: var(--an-muted);
          transition: all 200ms ease;
        }
        .cart-item__remove:hover {
          color: #f87171; border-color: rgba(248,113,113,0.4);
          background: rgba(248,113,113,0.08);
        }

        /* divider */
        .cart-rule {
          height: 1px; margin: 0 1.5rem;
          background: linear-gradient(90deg, transparent, var(--an-outline), transparent);
        }

        /* coupon + summary row */
        .cart-bottom {
          padding: 1.5rem;
          display: flex; flex-direction: column; gap: 1.5rem;
        }
        @media(min-width:640px) {
          .cart-bottom { flex-direction: row; justify-content: space-between; align-items: flex-start; }
        }

        /* coupon */
        .cart-coupon-applied {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 9999px;
          border: 1px solid rgba(74,222,128,0.3);
          background: rgba(74,222,128,0.06);
          color: #4ade80;
          font-size: 0.8rem; font-weight: 700;
        }
        .cart-coupon-remove {
          margin-left: auto; background: transparent; border: none;
          cursor: pointer; color: inherit; opacity: 0.7;
          display: flex; align-items: center;
          transition: opacity 200ms ease;
        }
        .cart-coupon-remove:hover { opacity: 1; }
        .cart-coupon-form { display: flex; gap: 0.5rem; }
        .cart-coupon-input {
          flex: 1; padding: 0.65rem 1rem;
          border-radius: 9999px;
          border: none; border-bottom: 1px solid var(--an-outline);
          background: transparent;
          color: var(--an-text); font-family: "Maj", sans-serif;
          font-size: 0.82rem; outline: none;
          transition: border-color 200ms ease;
        }
        .cart-coupon-input::placeholder { color: var(--an-muted); }
        .cart-coupon-input:focus { border-color: var(--an-gold); }
        .cart-coupon-btn {
          padding: 0.65rem 1.25rem;
          border-radius: 9999px; border: 1px solid var(--an-outline);
          background: transparent; cursor: pointer;
          color: var(--an-variant);
          font-family: "Maj", sans-serif;
          font-size: 0.75rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          transition: all 200ms ease; white-space: nowrap;
        }
        .cart-coupon-btn:hover:not(:disabled) {
          border-color: var(--an-gold); color: var(--an-gold);
          background: rgba(242,202,80,0.06);
        }
        .cart-coupon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* summary */
        .cart-summary {
          background: #201f1f; border: 1px solid var(--an-outline);
          border-radius: 12px; padding: 1.25rem 1.5rem;
          min-width: 16rem;
          display: flex; flex-direction: column; gap: 0.5rem;
        }
        .cart-summary__row {
          display: flex; justify-content: space-between;
          align-items: baseline; gap: 2rem;
        }
        .cart-summary__label {
          font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--an-muted);
        }
        .cart-summary__striked {
          font-size: 0.8rem; color: var(--an-muted);
          text-decoration: line-through;
        }
        .cart-summary__total {
          font-family: "Maj", serif;
          font-size: 1.75rem; font-weight: 700;
          color: var(--an-gold);
        }
        .cart-summary__currency {
          font-family: "Maj", sans-serif;
          font-size: 0.85rem; font-weight: 700;
          color: #e9c349; margin-left: 0.25rem;
        }

        /* footer row */
        .cart-footer {
          border-top: 1px solid var(--an-outline);
          padding: 1.25rem 1.5rem;
          display: flex; flex-direction: column; gap: 1rem; align-items: center;
        }
        @media(min-width:480px) {
          .cart-footer { flex-direction: row; justify-content: space-between; }
        }
        .cart-continue {
          display: flex; align-items: center; gap: 0.4rem;
          color: var(--an-muted); text-decoration: none;
          font-size: 0.82rem; font-weight: 600;
          transition: color 200ms ease;
        }
        .cart-continue:hover { color: var(--an-gold); }
        .cart-checkout-btn {
          padding: 0.85rem 2.5rem;
          border-radius: 9999px; border: none; cursor: pointer;
          background: var(--an-gold); color: #131313;
          font-family: "Maj", sans-serif;
          font-size: 0.82rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          transition: all 250ms ease;
          box-shadow: 0 8px 24px rgba(242,202,80,0.25);
        }
        .cart-checkout-btn:hover {
          background: var(--an-gold-deep);
          box-shadow: 0 10px 32px rgba(242,202,80,0.4);
          transform: translateY(-2px);
        }
      `}</style>

      <div className="cart-root">
        <div className="cart-inner">
          <h1 className="cart-title">
            Your <span>Cart</span>
          </h1>

          <div className="cart-panel">
            {/* items */}
            <ul className="cart-items">
              {items.map((item, idx) => (
                <motion.li
                  key={item.cartLineId ?? `item-${idx}`}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="cart-item"
                >
                  {/* thumb */}
                  <div className="cart-item__thumb">
                    {item.image ? (
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <div className="cart-item__thumb-empty">No Image</div>
                    )}
                  </div>

                  {/* info */}
                  <div className="cart-item__info">
                    <p className="cart-item__name">
                      {item.name}
                      {item.weight ? ` (${item.weight})` : ""}
                    </p>
                    <p className="cart-item__price">
                      <CartPriceLabel item={item} showSource />
                    </p>
                  </div>

                  {/* qty */}
                  <div className="cart-qty">
                    <button
                      className="cart-qty__btn"
                      onClick={() => updateQuantity(item.cartLineId, item.quantity - 1)}
                      aria-label="Decrease"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="cart-qty__val">{item.quantity}</span>
                    <button
                      className="cart-qty__btn"
                      onClick={() => updateQuantity(item.cartLineId, item.quantity + 1)}
                      aria-label="Increase"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* line total */}
                  <div className="cart-item__total">
                    {formatPrice(item.price * item.quantity, displayCurrency)}
                  </div>

                  {/* remove */}
                  <button
                    className="cart-item__remove"
                    onClick={() => removeItem(item.cartLineId)}
                    aria-label={t("delete")}
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.li>
              ))}
            </ul>

            <div className="cart-rule" />

            {/* coupon + summary */}
            <div className="cart-bottom">
              {/* coupon */}
              <div style={{ flex: 1, maxWidth: "24rem" }}>
                {coupon ? (
                  <div className="cart-coupon-applied">
                    <Tag size={14} />
                    <span>{coupon.code}</span>
                    <span style={{ opacity: 0.7 }}>— {coupon.discountPercentage}% OFF</span>
                    <button className="cart-coupon-remove" onClick={removeCoupon} aria-label="Remove coupon">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="cart-coupon-form">
                    <input
                      type="text"
                      placeholder="Coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="cart-coupon-input"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={applying || !couponInput.trim()}
                      className="cart-coupon-btn"
                    >
                      {applying ? "Applying…" : "Apply"}
                    </button>
                  </div>
                )}
              </div>

              {/* summary */}
              <div className="cart-summary">
                <div className="cart-summary__row" style={{ marginBottom: "0.75rem" }}>
                  <span className="cart-summary__label">{t("select_currency")}</span>
                  <CurrencySelector compact />
                </div>
                {coupon && (
                  <div className="cart-summary__row">
                    <span className="cart-summary__label">Subtotal</span>
                    <span className="cart-summary__striked">
                      {formatPrice(subtotal, displayCurrency)}
                    </span>
                  </div>
                )}
                <div className="cart-summary__row">
                  <span className="cart-summary__label">Total Due</span>
                  <span className="cart-summary__total">
                    {formatPrice(getTotalPrice(), displayCurrency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="cart-rule" />

            {/* footer actions */}
            <div className="cart-footer">
              <Link to="/shop" className="cart-continue">
                <ArrowLeft size={14} />
                Continue Shopping
              </Link>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/checkout")}
                className="cart-checkout-btn"
              >
                {t("checkout")}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
