import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getProduct, getCategory, getProducts } from "../lib/api/catalog";
import { handleApiError, OperationType } from "../lib/api/errors";
import { useCartStore } from "../store/cartStore";
import { toast } from "sonner";
import { ChevronRight, Minus, Plus, Share2, Twitter, Facebook, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import PriceDisplay from "../components/PriceDisplay";
import ProductListPrice from "../components/ProductListPrice";
import { useResolvedWeightPrice, useProductWeightsCache } from "../hooks/usePricing";
import { buildCartItem } from "../lib/pricing/cartHelpers";
import {
  ANCHOR_WEIGHT,
  DEFAULT_VISIBLE_WEIGHTS,
} from "../lib/pricing/weightPricing";
import type { ProductPricingType } from "../types/pricing";

export default function ProductView() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [categoryName, setCategoryName] = useState("");
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedWeight, setSelectedWeight] = useState<string>(ANCHOR_WEIGHT);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  const addToCart = useCartStore((state) => state.addItem);
  const isRtl = i18n.language === "ar";
  const pricingType: ProductPricingType = product?.pricingType ?? "fixed";

  const { weightsByProduct } = useProductWeightsCache();
  const weightConfig = product ? weightsByProduct.get(product.id) : undefined;
  const visibleWeights = weightConfig?.visibleWeights ?? DEFAULT_VISIBLE_WEIGHTS;
  const weightOverrides = weightConfig?.weightOverrides ?? {};

  // Keep the selected weight valid for this product's visible set.
  useEffect(() => {
    if (!visibleWeights.includes(selectedWeight as never)) {
      setSelectedWeight(
        visibleWeights.includes(ANCHOR_WEIGHT) ? ANCHOR_WEIGHT : visibleWeights[0],
      );
    }
  }, [visibleWeights, selectedWeight]);

  const resolvedPrice = useResolvedWeightPrice(
    product?.id ?? "",
    product?.price ?? 0,
    selectedWeight,
    weightOverrides,
  );

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      setLoading(true);
      try {
        const pData = await getProduct(id);
        setProduct(pData);

        if (pData.categoryId) {
          const [cat, related] = await Promise.all([
            getCategory(pData.categoryId),
            getProducts({ categoryId: pData.categoryId, limit: 4 }),
          ]);
          setCategoryName(isRtl ? cat.nameAr || cat.name : cat.name);
          setSimilarProducts(related.filter((d) => d.id !== id));
        }
      } catch (e) {
        handleApiError(e, OperationType.GET, `products/${id}`);
        toast.error("Product not found");
        navigate("/");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, isRtl]);

  const handleAddToCart = () => {
    if (!product?.isAvailable) return;
    const item = buildCartItem(
      product.id,
      isRtl ? product.nameAr || product.name : product.name,
      product.image,
      resolvedPrice,
      {
        pricingType,
        weight: selectedWeight,
      },
    );
    addToCart(item, quantity);
    toast.success(t("added_to_cart"));
  };

  if (loading) {
    return (
      <>
        <style>{`
          .anp-root { background:#131313; color:#e5e2e1; margin:-1.5rem -1rem -2.5rem; padding:3rem clamp(1rem,4vw,3rem) 5rem; min-height:80vh; }
          @media(min-width:640px){ .anp-root{margin:-1.5rem -1.5rem -2.5rem;} }
          @keyframes anpPulse{0%,100%{opacity:.35}50%{opacity:.6}}
          .anp-skel{background:#2a2a2a;border-radius:8px;animation:anpPulse 1.6s ease infinite;}
        `}</style>
        <div className="anp-root">
          <div style={{ display:"flex", flexDirection:"column", gap:"2rem", maxWidth:"1280px", margin:"0 auto" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3rem", alignItems:"flex-start" }}>
              <div className="anp-skel" style={{ aspectRatio:"1", borderRadius:"16px" }} />
              <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
                {[80,50,35,60,40].map((w,i) => (
                  <div key={i} className="anp-skel" style={{ height:"1rem", width:`${w}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!product) return null;

  const productName = isRtl && product.nameAr ? product.nameAr : product.name;

  return (
    <>
      <style>{`
        /* ── Artisanal Noir — Product View ──────────────────────────── */
        .anp-root {
          --an-bg:          #131313;
          --an-surface:     #1a1a1a;
          --an-surface-hi:  #2a2a2a;
          --an-text:        #e5e2e1;
          --an-muted:       #a0a0a0;
          --an-variant:     #d0c5af;
          --an-gold:        #f2ca50;
          --an-gold-dim:    #e9c349;
          --an-gold-deep:   #d4af37;
          --an-outline:     rgba(212,175,55,0.20);
          --an-radius:      0.25rem;
          --an-radius-lg:   0.5rem;
          --an-radius-full: 9999px;
          font-family: "Manrope", sans-serif;
          background: var(--an-bg);
          color: var(--an-text);
          margin: -1.5rem -1rem -2.5rem;
          padding: 3rem clamp(1rem, 4vw, 3rem) 5rem;
          min-height: calc(100vh - 80px);
        }
        @media(min-width:640px) { .anp-root { margin: -1.5rem -1.5rem -2.5rem; } }

        .anp-inner { max-width: 1280px; margin: 0 auto; }

        /* breadcrumb */
        .anp-breadcrumb {
          display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem;
          font-size: 0.78rem; color: var(--an-muted);
          margin-bottom: 2.5rem;
        }
        .anp-breadcrumb a {
          color: var(--an-muted); text-decoration: none;
          transition: color 200ms ease;
        }
        .anp-breadcrumb a:hover { color: var(--an-gold); }
        .anp-breadcrumb .sep { color: #4d4635; }
        .anp-breadcrumb .current { color: var(--an-variant); font-weight: 600; }

        /* two-col layout */
        .anp-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem; align-items: flex-start;
        }
        @media(max-width:860px) { .anp-layout { grid-template-columns: 1fr; gap: 2.5rem; } }

        /* image */
        .anp-img-wrap {
          position: relative;
          aspect-ratio: 1;
          background: #1a1a1a;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--an-outline);
          box-shadow: 0 32px 64px rgba(0,0,0,0.5);
        }
        /* ornate thin-line gold frame */
        .anp-img-wrap::after {
          content: '';
          position: absolute; inset: 0.75rem;
          border: 1px solid var(--an-outline);
          border-radius: 10px;
          pointer-events: none;
          z-index: 2;
        }
        .anp-img-wrap img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 700ms ease, filter 400ms ease;
          filter: brightness(0.92);
        }
        .anp-img-wrap:hover img { transform: scale(1.04); filter: brightness(1); }
        .anp-oos-overlay {
          position: absolute; inset: 0; z-index: 3;
          background: rgba(13,13,13,0.75); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
        }
        .anp-oos-badge {
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--an-gold);
          border: 1px solid var(--an-outline);
          padding: 0.5rem 1.25rem;
          border-radius: var(--an-radius-full);
          background: rgba(19,19,19,0.85);
        }

        /* info column */
        .anp-info { display: flex; flex-direction: column; gap: 0; }

        .anp-label-caps {
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--an-gold); margin-bottom: 0.75rem;
          display: block;
        }
        .anp-product-name {
          margin: 0 0 1rem;
          font-family: "Bodoni Moda", serif;
          font-size: clamp(1.75rem, 3.5vw, 2.5rem);
          font-weight: 700; line-height: 1.1; letter-spacing: -0.01em;
          color: var(--an-text);
        }
        .anp-price {
          font-family: "Bodoni Moda", serif;
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 600; color: var(--an-gold);
          margin-bottom: 1.25rem; display: flex; align-items: baseline; gap: 0.4rem;
        }
        .anp-price-currency { font-family: "Manrope", sans-serif; font-size: 0.95rem; font-weight: 700; color: var(--an-gold-dim); }

        .anp-description {
          font-size: 0.95rem; line-height: 1.75;
          color: var(--an-muted); margin-bottom: 1.75rem;
        }

        /* divider */
        .anp-rule {
          height: 1px; margin: 1.5rem 0;
          background: linear-gradient(90deg, transparent, var(--an-outline), transparent);
        }

        /* weight selector */
        .anp-weights { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1.75rem; }
        .anp-weight-btn {
          padding: 0.5rem 1.1rem;
          border-radius: var(--an-radius);
          border: 1px solid var(--an-outline);
          background: transparent;
          color: var(--an-muted);
          font-family: "Manrope", sans-serif;
          font-size: 0.8rem; font-weight: 600;
          cursor: pointer; transition: all 200ms ease;
        }
        .anp-weight-btn:hover { border-color: var(--an-gold); color: var(--an-text); }
        .anp-weight-btn--active {
          border-color: var(--an-gold); background: rgba(242,202,80,0.1);
          color: var(--an-gold);
          box-shadow: 0 0 12px rgba(242,202,80,0.15);
        }

        /* quantity + add-to-cart row */
        .anp-actions { display: flex; gap: 1rem; align-items: stretch; margin-bottom: 1.75rem; }
        @media(max-width:480px) { .anp-actions { flex-direction: column; } }

        .anp-qty {
          display: flex; align-items: center; gap: 0;
          border: 1px solid var(--an-outline);
          border-radius: var(--an-radius-full);
          background: var(--an-surface);
          overflow: hidden; height: 3.25rem; flex-shrink: 0;
        }
        .anp-qty-btn {
          width: 2.75rem; height: 100%;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: none; cursor: pointer;
          color: var(--an-muted); transition: color 200ms ease, background 200ms ease;
        }
        .anp-qty-btn:hover { color: var(--an-gold); background: rgba(242,202,80,0.06); }
        .anp-qty-val {
          width: 2.5rem; text-align: center;
          font-family: "Bodoni Moda", serif;
          font-size: 1.1rem; font-weight: 600;
          color: var(--an-text);
        }

        .anp-btn-primary {
          flex: 1; height: 3.25rem;
          border-radius: var(--an-radius-full);
          border: none; cursor: pointer;
          background: var(--an-gold); color: #131313;
          font-family: "Manrope", sans-serif;
          font-size: 0.8rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          transition: all 250ms ease;
          box-shadow: 0 8px 24px rgba(242,202,80,0.25);
        }
        .anp-btn-primary:hover {
          background: var(--an-gold-deep);
          box-shadow: 0 10px 32px rgba(242,202,80,0.40);
          transform: translateY(-1px);
        }
        .anp-btn-disabled {
          flex: 1; height: 3.25rem;
          border-radius: var(--an-radius-full);
          border: 1px solid var(--an-outline);
          background: transparent; color: var(--an-muted);
          font-family: "Manrope", sans-serif;
          font-size: 0.8rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: not-allowed;
        }

        /* share */
        .anp-share { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem; }
        .anp-share-label { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--an-muted); }
        .anp-share-btn {
          width: 2.25rem; height: 2.25rem; border-radius: 50%;
          border: 1px solid var(--an-outline);
          background: transparent; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--an-muted); transition: all 200ms ease;
        }
        .anp-share-btn:hover { border-color: var(--an-gold); color: var(--an-gold); background: rgba(242,202,80,0.06); }

        /* accordion */
        .anp-accordion { border-top: 1px solid var(--an-outline); }
        .anp-accordion-item { border-bottom: 1px solid var(--an-outline); }
        .anp-accordion-trigger {
          width: 100%; display: flex; justify-content: space-between; align-items: center;
          padding: 1.1rem 0;
          background: transparent; border: none; cursor: pointer;
          font-family: "Bodoni Moda", serif;
          font-size: 1rem; font-weight: 600;
          color: var(--an-text); text-align: left;
          transition: color 200ms ease;
        }
        .anp-accordion-trigger:hover { color: var(--an-gold); }
        .anp-accordion-icon {
          color: var(--an-gold); flex-shrink: 0;
          transition: transform 300ms ease;
        }
        .anp-accordion-icon--open { transform: rotate(90deg); }
        .anp-accordion-body {
          overflow: hidden;
          transition: max-height 300ms ease, opacity 300ms ease;
        }
        .anp-accordion-body--open { opacity: 1; }
        .anp-accordion-body--closed { max-height: 0 !important; opacity: 0; }
        .anp-accordion-content {
          padding-bottom: 1.25rem;
          font-size: 0.88rem; line-height: 1.75;
          color: var(--an-muted);
        }
        .anp-nutrition-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 0.75rem; margin-top: 1rem;
          background: var(--an-surface); border: 1px solid var(--an-outline);
          border-radius: var(--an-radius-lg); padding: 1rem;
        }
        .anp-nutrition-item dt { font-size: 0.68rem; color: var(--an-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.2rem; }
        .anp-nutrition-item dd { font-weight: 700; color: var(--an-text); margin: 0; }

        /* chips */
        .anp-chip {
          display: inline-flex; align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: var(--an-radius-full);
          border: 1px solid var(--an-gold);
          color: var(--an-gold);
          font-size: 0.65rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          background: transparent;
        }
        .anp-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }

        /* ── SIMILAR PRODUCTS ─────────────────────────────────────── */
        .anp-similar { margin-top: 5rem; }
        .anp-similar-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 2rem;
        }
        .anp-similar-title {
          font-family: "Bodoni Moda", serif;
          font-size: 1.75rem; font-weight: 600;
          color: var(--an-text); margin: 0;
        }
        .anp-similar-nav { display: flex; gap: 0.5rem; }
        .anp-nav-btn {
          width: 2.25rem; height: 2.25rem; border-radius: 50%;
          border: 1px solid var(--an-outline); background: transparent;
          display: flex; align-items: center; justify-content: center;
          color: var(--an-muted); cursor: pointer;
          transition: all 200ms ease;
        }
        .anp-nav-btn:hover { border-color: var(--an-gold); color: var(--an-gold); }

        .anp-similar-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }
        @media(min-width:768px) { .anp-similar-grid { grid-template-columns: repeat(3, 1fr); } }

        .anp-sim-card {
          background: linear-gradient(160deg, #1c1b1b 0%, #0e0e0e 100%);
          border: 1px solid var(--an-outline);
          border-radius: 14px; overflow: hidden;
          text-decoration: none;
          transition: transform 350ms cubic-bezier(0.22,1,0.36,1),
                      border-color 300ms ease, box-shadow 350ms ease;
          display: block;
          position: relative;
        }
        .anp-sim-card::before {
          content: '';
          position: absolute; top: 0; left: 20%; right: 20%; height: 1px;
          background: linear-gradient(90deg, transparent, var(--an-gold-dim), transparent);
        }
        .anp-sim-card:hover {
          transform: translateY(-5px);
          border-color: rgba(242,202,80,0.3);
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .anp-sim-card__img {
          aspect-ratio: 1; background: #201f1f; overflow: hidden;
        }
        .anp-sim-card__img img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 500ms ease, filter 350ms ease;
          filter: brightness(0.88);
        }
        .anp-sim-card:hover .anp-sim-card__img img { transform: scale(1.05); filter: brightness(1); }
        .anp-sim-card__body { padding: 0.9rem; }
        .anp-sim-card__name {
          font-family: "Bodoni Moda", serif;
          font-size: 0.95rem; font-weight: 500;
          color: var(--an-text); white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
          margin-bottom: 0.3rem;
        }
        .anp-sim-card__price { font-size: 0.82rem; font-weight: 700; color: var(--an-gold-dim); }

        @keyframes anpPulse { 0%,100%{opacity:.35} 50%{opacity:.6} }
        .anp-skel { background: #2a2a2a; border-radius: 8px; animation: anpPulse 1.6s ease infinite; }
      `}</style>

      <div className="anp-root">
        <div className="anp-inner">

          {/* Breadcrumb */}
          <nav className="anp-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span className="sep"><ChevronRight size={12} /></span>
            <span>Products</span>
            {categoryName && (
              <>
                <span className="sep"><ChevronRight size={12} /></span>
                <Link to={`/category/${product.categoryId}`}>{categoryName}</Link>
              </>
            )}
            <span className="sep"><ChevronRight size={12} /></span>
            <span className="current">{productName}</span>
          </nav>

          {/* Main two-col */}
          <div className="anp-layout">

            {/* ── Image ── */}
            <div className="anp-img-wrap">
              {product.image ? (
                <img src={product.image} alt={productName} />
              ) : (
                <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#4d4635" }}>
                  No image
                </div>
              )}
              {!product.isAvailable && (
                <div className="anp-oos-overlay">
                  <span className="anp-oos-badge">{t("out_of_stock")}</span>
                </div>
              )}
            </div>

            {/* ── Info ── */}
            <div className="anp-info">

              <span className="anp-label-caps">Jamhawi Premium Collection</span>

              <h1 className="anp-product-name">{productName}</h1>

              <div className="anp-price">
                <PriceDisplay resolved={resolvedPrice} size="lg" />
              </div>

              <div className="anp-chips">
                <span className="anp-chip">100% Natural</span>
                <span className="anp-chip">Hand-Selected</span>
                {product.isAvailable
                  ? <span className="anp-chip" style={{ borderColor:"rgba(74,222,128,0.4)", color:"#4ade80" }}>In Stock</span>
                  : <span className="anp-chip" style={{ borderColor:"rgba(248,113,113,0.4)", color:"#f87171" }}>Out of Stock</span>
                }
              </div>

              <p className="anp-description">
                {product.description || "No description provided."}
              </p>

              <div className="anp-rule" />

              <span className="anp-label-caps" style={{ marginBottom:"0.6rem" }}>
                {t("select_weight")}
              </span>
              <div className="anp-weights">
                {visibleWeights.map((w) => (
                  <button
                    key={w}
                    onClick={() => setSelectedWeight(w)}
                    className={`anp-weight-btn${selectedWeight === w ? " anp-weight-btn--active" : ""}`}
                  >
                    {w}
                  </button>
                ))}
              </div>

              {/* Quantity + Add to Cart */}
              <div className="anp-actions">
                <div className="anp-qty">
                  <button
                    className="anp-qty-btn"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="anp-qty-val">{quantity}</span>
                  <button
                    className="anp-qty-btn"
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {product.isAvailable ? (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAddToCart}
                    className="anp-btn-primary"
                  >
                    {t("add_to_cart")}
                  </motion.button>
                ) : (
                  <button className="anp-btn-disabled" disabled>
                    {t("out_of_stock")}
                  </button>
                )}
              </div>

              {/* Share */}
              <div className="anp-share">
                <span className="anp-share-label">Share</span>
                <button className="anp-share-btn" aria-label="Share on Facebook">
                  <Facebook size={14} />
                </button>
                <button className="anp-share-btn" aria-label="Share on Twitter">
                  <Twitter size={14} />
                </button>
                <button className="anp-share-btn" aria-label="Copy link">
                  <Share2 size={14} />
                </button>
              </div>

              <div className="anp-rule" />

              {/* Accordion */}
              <div className="anp-accordion">
                {[
                  {
                    key: "nutrition",
                    label: "Nutritional Information",
                    content: (
                      <div className="anp-accordion-content">
                        <p>Sourced directly from our premium sustainable farms. Naturally sweetened by solar energy, without any artificial additives.</p>
                        <dl className="anp-nutrition-grid">
                          {[
                            ["Calories", "277 kcal (per 100g)"],
                            ["Carbohydrates", "75g"],
                            ["Dietary Fiber", "7g"],
                            ["Potassium", "20% DV"],
                          ].map(([k, v]) => (
                            <div key={k} className="anp-nutrition-item">
                              <dt>{k}</dt>
                              <dd>{v}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ),
                  },
                  {
                    key: "sourcing",
                    label: "Sourcing & Sincerity",
                    content: (
                      <div className="anp-accordion-content">
                        Our produce is freshly handpicked daily at break-of-dawn, thoroughly double-washed in purified mineral wells, and packaged in fully recyclable premium oxygen-regulated containers to guarantee peak flavor retention.
                      </div>
                    ),
                  },
                ].map(({ key, label, content }) => {
                  const isOpen = activeAccordion === key;
                  return (
                    <div key={key} className="anp-accordion-item">
                      <button
                        className="anp-accordion-trigger"
                        onClick={() => setActiveAccordion(isOpen ? null : key)}
                        aria-expanded={isOpen}
                      >
                        {label}
                        <ChevronRight
                          size={16}
                          className={`anp-accordion-icon${isOpen ? " anp-accordion-icon--open" : ""}`}
                        />
                      </button>
                      <div
                        className={`anp-accordion-body ${isOpen ? "anp-accordion-body--open" : "anp-accordion-body--closed"}`}
                        style={{ maxHeight: isOpen ? "500px" : "0px" }}
                      >
                        {content}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* ── Similar Products ── */}
          {similarProducts.length > 0 && (
            <div className="anp-similar">
              <div className="anp-similar-header">
                <h2 className="anp-similar-title">You May Also Like</h2>
                <div className="anp-similar-nav">
                  <button className="anp-nav-btn" aria-label="Previous">
                    <ChevronLeft size={14} />
                  </button>
                  <button className="anp-nav-btn" aria-label="Next">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div className="anp-similar-grid">
                {similarProducts.map((sim, i) => (
                  <motion.div
                    key={sim.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.07 }}
                  >
                    <Link to={`/product/${sim.id}`} className="anp-sim-card">
                      <div className="anp-sim-card__img">
                        {sim.image ? (
                          <img src={sim.image} alt={isRtl && sim.nameAr ? sim.nameAr : sim.name} />
                        ) : (
                          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#4d4635", fontSize:"0.75rem" }}>
                            No image
                          </div>
                        )}
                      </div>
                      <div className="anp-sim-card__body">
                        <p className="anp-sim-card__name">
                          {isRtl && sim.nameAr ? sim.nameAr : sim.name}
                        </p>
                        <p className="anp-sim-card__price">
                          <ProductListPrice
                            productId={sim.id}
                            basePrice={sim.price ?? 0}
                          />
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
