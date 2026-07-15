import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCategories, getProducts } from "../lib/api/catalog";
import { handleApiError, OperationType } from "../lib/api/errors";
import { useCartStore } from "../store/cartStore";
import { useSearchStore } from "../store/searchStore";
import { motion } from "motion/react";
import { toast } from "sonner";
import ProductListPrice from "../components/ProductListPrice";
import {
  useCurrencyRates,
  useProductPricesCache,
  resolvePriceForProduct,
} from "../hooks/usePricing";
import { buildCartItem, getListCartOptions } from "../lib/pricing/cartHelpers";
import { useCurrencyStore } from "../store/currencyStore";

interface Product {
  id: string;
  name: string;
  nameAr?: string;
  price: number;
  categoryId: string;
  image: string;
  isAvailable: boolean;
  pricingType?: "per_kg" | "fixed";
}

interface Category {
  id: string;
  name: string;
  nameAr?: string;
  isHidden?: boolean;
}

export default function Products() {
  const { t, i18n } = useTranslation();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc">("default");
  const [availability, setAvailability] = useState<"all" | "in_stock">("all");
  const [localSearch, setLocalSearch] = useState("");

  const searchQuery = useSearchStore((state) => state.searchQuery);
  const addItem = useCartStore((state) => state.addItem);
  const currency = useCurrencyStore((state) => state.currency);
  const { rateMap } = useCurrencyRates();
  const { pricesByProduct } = useProductPricesCache();

  const handleAddToCart = (product: Product) => {
    const resolved = resolvePriceForProduct(
      product.id,
      product.price,
      currency,
      pricesByProduct,
      rateMap,
    );
    addItem(
      buildCartItem(
        product.id,
        product.name,
        product.image,
        resolved,
        getListCartOptions(product),
      ),
    );
    toast.success(`${product.name} ${t("added_to_cart")}`, { duration: 2000 });
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [prods, cats] = await Promise.all([
          getProducts(),
          getCategories(),
        ]);
        setProducts(prods as Product[]);
        setCategories(cats.filter((c) => !c.isHidden));
      } catch (error) {
        handleApiError(error, OperationType.GET, "products");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Combined search: local field + global store
  const effectiveSearch = localSearch || searchQuery;

  let filtered = [...products];

  // Category filter
  if (activeCategory !== "all") {
    filtered = filtered.filter((p) => p.categoryId === activeCategory);
  }

  // Search
  if (effectiveSearch) {
    const q = effectiveSearch.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameAr && p.nameAr.toLowerCase().includes(q)),
    );
  }

  // Availability
  if (availability === "in_stock") {
    filtered = filtered.filter((p) => p.isAvailable);
  }

  // Sort
  if (sortBy === "price_asc") filtered.sort((a, b) => a.price - b.price);
  else if (sortBy === "price_desc") filtered.sort((a, b) => b.price - a.price);

  // Always push out-of-stock items to the bottom
  filtered.sort((a, b) => (a.isAvailable === b.isAvailable ? 0 : a.isAvailable ? -1 : 1));

  return (
    <>
      <style>{`
        /* ── Artisanal Noir — Products Page ─────────────────────────── */
        .anp2-root {
          /* Bridge to the global theme tokens set by Layout.tsx */
          --an-bg:          var(--th-bg,          #131313);
          --an-surface:     var(--th-surface,      #1a1a1a);
          --an-surface-hi:  var(--th-surface-hi,   #2a2a2a);
          --an-text:        var(--th-text,          #e5e2e1);
          --an-muted:       var(--th-muted,         #a0a0a0);
          --an-gold:        var(--th-gold,          #f2ca50);
          --an-gold-dim:    var(--th-gold-dim,      #e9c349);
          --an-gold-deep:   var(--th-gold-deep,     #d4af37);
          --an-outline:     var(--th-outline,       rgba(212,175,55,0.20));
          --an-radius:      0.25rem;
          --an-radius-full: 9999px;
          font-family: var(--font-sans);
          background: var(--an-bg);
          color: var(--an-text);
          margin: -1.5rem -1rem -2.5rem;
          padding: 3rem clamp(1rem, 4vw, 3rem) 5rem;
          min-height: calc(100vh - 80px);
        }
        @media(min-width:640px) {
          .anp2-root { margin: -1.5rem -1.5rem -2.5rem; }
        }

        /* nav link button */
        .anp2-nav-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.5rem 1.1rem;
          border-radius: var(--an-radius-full);
          border: 1px solid var(--an-outline);
          background: transparent; color: var(--an-gold);
          font-family: var(--font-sans);
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          text-decoration: none; flex-shrink: 0;
          transition: all 200ms ease;
        }
        .anp2-nav-btn:hover {
          border-color: var(--an-gold);
          background: rgba(242,202,80,0.08);
        }

        /* title row */
        .anp2-title-row {
          display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap;
          gap: 1rem; margin-bottom: 2rem;
        }
        .anp2-title {
          margin: 0;
          font-family: var(--font-serif);
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--an-text);
        }
        .anp2-title span { color: var(--an-gold); }

        /* ── Search bar ── */
        .anp2-search-wrap {
          position: relative;
          margin-bottom: 1.5rem;
        }
        .anp2-search-icon {
          position: absolute;
          inset-inline-start: 1rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: var(--an-muted);
          display: flex;
          align-items: center;
        }
        .anp2-search {
          width: 100%;
          padding: 0.7rem 1rem;
          padding-inline-start: 2.75rem;
          background: var(--an-surface);
          border: 1px solid var(--an-outline);
          border-radius: var(--an-radius-full);
          color: var(--an-text);
          font-family: var(--font-sans);
          font-size: 0.85rem;
          outline: none;
          transition: border-color 200ms ease, box-shadow 200ms ease;
          box-sizing: border-box;
        }
        .anp2-search::placeholder { color: var(--an-muted); }
        .anp2-search:focus {
          border-color: transparent;
          border-bottom-color: var(--an-gold);
          box-shadow: 0 1px 0 0 var(--an-gold);
        }

        /* ── Category pill bar ── */
        .anp2-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .anp2-pill {
          padding: 0.45rem 1.1rem;
          border-radius: var(--an-radius-full);
          font-family: var(--font-sans);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 200ms ease;
          border: 1px solid var(--an-outline);
          background: transparent;
          color: var(--an-gold);
        }
        .anp2-pill:hover {
          border-color: var(--an-gold);
          background: rgba(242,202,80,0.06);
        }
        .anp2-pill--active {
          background: var(--an-gold);
          border-color: var(--an-gold);
          color: #131313;
        }
        .anp2-pill--active:hover {
          background: var(--an-gold-deep);
          border-color: var(--an-gold-deep);
        }

        /* ── Additional filters row ── */
        .anp2-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 2.5rem;
          align-items: center;
        }
        .anp2-select {
          padding: 0.55rem 1rem;
          padding-inline-end: 2rem;
          background: var(--an-surface);
          border: 1px solid var(--an-outline);
          border-radius: var(--an-radius-full);
          color: var(--an-text);
          font-family: var(--font-sans);
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          outline: none;
          cursor: pointer;
          transition: border-color 200ms ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23f2ca50' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
        }
        [dir="rtl"] .anp2-select { background-position: left 0.75rem center; }
        .anp2-select:focus { border-color: var(--an-gold); }
        .anp2-select option { background: var(--an-surface); color: var(--an-text); }

        .anp2-results-count {
          margin-inline-start: auto;
          font-size: 0.75rem;
          color: var(--an-muted);
          font-weight: 500;
        }

        /* ── Product grid ── */
        .anp2-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }
        @media(min-width:768px)  { .anp2-grid { grid-template-columns: repeat(3, 1fr); gap: 1.5rem; } }
        @media(min-width:1280px) { .anp2-grid { grid-template-columns: repeat(4, 1fr); } }

        /* ── Product card ── */
        .anp2-card {
          display: flex;
          flex-direction: column;
          background: var(--th-card-bg, linear-gradient(160deg, #1c1b1b 0%, #0e0e0e 100%));
          border: 1px solid var(--an-outline);
          border-radius: 16px;
          overflow: hidden;
          transition: transform 400ms cubic-bezier(0.22,1,0.36,1),
                      box-shadow 400ms ease,
                      border-color 300ms ease;
          position: relative;
        }
        /* gold top accent line */
        .anp2-card::before {
          content: '';
          position: absolute;
          top: 0; left: 20%; right: 20%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--an-gold-dim), transparent);
        }
        .anp2-card:hover {
          transform: translateY(-6px);
          border-color: rgba(242,202,80,0.35);
          box-shadow: 0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(242,202,80,0.2);
        }

        /* image wrapper */
        .anp2-card__img-wrap {
          position: relative;
          aspect-ratio: 3/4;
          background: var(--th-card-img-bg, #201f1f);
          overflow: hidden;
        }
        @media(min-width:640px) { .anp2-card__img-wrap { aspect-ratio: 4/5; } }
        .anp2-card__img-wrap img {
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform 600ms ease, filter 400ms ease;
          filter: brightness(0.9);
        }
        .anp2-card:hover .anp2-card__img-wrap img {
          transform: scale(1.06);
          filter: brightness(1);
        }
        .anp2-card__no-img {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: var(--an-muted); font-size: 0.8rem;
        }

        /* out-of-stock overlay */
        .anp2-card__oos {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
        }
        .anp2-card__oos-badge {
          font-family: var(--font-sans);
          font-size: 0.65rem; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--an-gold);
          border: 1px solid var(--an-outline);
          padding: 0.35rem 0.9rem;
          border-radius: var(--an-radius-full);
          background: var(--an-surface);
        }

        /* card body */
        .anp2-card__body {
          padding: 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .anp2-card__name {
          margin: 0;
          font-family: var(--font-serif);
          font-size: clamp(0.95rem, 1.5vw, 1.1rem);
          font-weight: 500;
          letter-spacing: 0.04em;
          color: var(--an-text);
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-decoration: none;
          transition: color 200ms ease;
        }
        .anp2-card__name:hover { color: var(--an-gold); }

        .anp2-card__meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.25rem;
        }
        .anp2-card__price {
          font-family: var(--font-sans);
          font-size: 0.95rem; font-weight: 700;
          color: var(--an-gold);
        }
        .anp2-card__stock {
          font-size: 0.6rem; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 0.2rem 0.6rem;
          border-radius: var(--an-radius-full);
        }
        .anp2-card__stock--in  {
          color: #4ade80;
          border: 1px solid rgba(74,222,128,0.25);
          background: rgba(74,222,128,0.08);
        }
        .anp2-card__stock--out {
          color: #f87171;
          border: 1px solid rgba(248,113,113,0.25);
          background: rgba(248,113,113,0.08);
        }

        /* CTA area */
        .anp2-card__btn {
          padding: 0.75rem 1rem 1rem;
          margin-top: auto;
        }
        .anp2-btn-primary {
          width: 100%; padding: 0.7rem;
          border-radius: var(--an-radius-full);
          border: none; cursor: pointer;
          background: var(--an-gold); color: #131313;
          font-family: var(--font-sans);
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          transition: all 250ms ease;
          box-shadow: 0 4px 16px rgba(242,202,80,0.2);
        }
        .anp2-btn-primary:hover {
          background: var(--an-gold-deep);
          box-shadow: 0 6px 24px rgba(242,202,80,0.35);
          transform: translateY(-1px);
        }
        .anp2-btn-disabled {
          width: 100%; padding: 0.7rem;
          border-radius: var(--an-radius-full);
          border: 1px solid var(--an-outline);
          background: transparent; color: var(--an-muted);
          font-family: var(--font-sans);
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: not-allowed;
        }

        /* ── Skeleton ── */
        @keyframes anp2Pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        .anp2-skeleton { animation: anp2Pulse 1.6s ease-in-out infinite; }
        .anp2-skel-img  {
          background: #2a2a2a;
          width: 100%;
          aspect-ratio: 3/4;
        }
        @media(min-width:640px) { .anp2-skel-img { aspect-ratio: 4/5; } }
        .anp2-skel-line {
          background: #353534;
          border-radius: 4px;
          height: 0.75rem;
        }

        /* ── Empty state ── */
        .anp2-empty {
          text-align: center;
          padding: 5rem 2rem;
          color: var(--an-muted);
          border: 1px solid var(--an-outline);
          border-radius: 16px;
          background: var(--an-surface);
        }
        .anp2-empty-title {
          font-family: var(--font-serif);
          font-size: 1.5rem; font-weight: 500;
          color: var(--an-text); margin: 0 0 0.5rem;
        }
      `}</style>

      <div className="anp2-root">
        {/* Page title + nav */}
        <div className="anp2-title-row">
          <h1 className="anp2-title">
            <span>{t("products")}</span>
          </h1>
          <Link to="/shop/categories" className="anp2-nav-btn">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t("browse_the_store")}
          </Link>
        </div>

        {/* Search bar */}
        <div className="anp2-search-wrap">
          <span className="anp2-search-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            className="anp2-search"
            placeholder={t("search_products") || "Search products…"}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        {/* Category pill bar */}
        <div className="anp2-pills" role="group" aria-label="Filter by category">
          <button
            className={`anp2-pill${activeCategory === "all" ? " anp2-pill--active" : ""}`}
            onClick={() => setActiveCategory("all")}
          >
            {t("all_categories")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`anp2-pill${activeCategory === cat.id ? " anp2-pill--active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {i18n.language === "ar" ? cat.nameAr || cat.name : cat.name}
            </button>
          ))}
        </div>

        {/* Sort + availability filters */}
        <div className="anp2-filters">
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value as "all" | "in_stock")}
            className="anp2-select"
            aria-label="Filter by availability"
          >
            <option value="all">{t("all_items")}</option>
            <option value="in_stock">{t("in_stock_only")}</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "default" | "price_asc" | "price_desc")}
            className="anp2-select"
            aria-label="Sort products"
          >
            <option value="default">{t("default_sorting")}</option>
            <option value="price_asc">{t("price_low_to_high")}</option>
            <option value="price_desc">{t("price_high_to_low")}</option>
          </select>
          {!loading && (
            <span className="anp2-results-count">{filtered.length} {filtered.length !== 1 ? t("products") : t("product")}</span>
          )}
        </div>

        {/* Content */}
        {loading ? (
          /* Skeleton loading — 8 cards */
          <div className="anp2-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="anp2-card anp2-skeleton">
                <div className="anp2-skel-img" />
                <div className="anp2-card__body" style={{ gap: "0.75rem" }}>
                  <div className="anp2-skel-line" style={{ width: "70%" }} />
                  <div className="anp2-skel-line" style={{ width: "40%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="anp2-empty">
            <p className="anp2-empty-title">{t("no_products_found")}</p>
            <p>{t("try_adjusting_your_search_or_filters")}</p>
          </div>
        ) : (
          /* Product grid */
          <div className="anp2-grid">
            {filtered.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="anp2-card"
              >
                {/* Product image */}
                <Link to={`/product/${product.id}`}>
                  <div className="anp2-card__img-wrap">
                    {product.image ? (
                      <img src={product.image} alt={product.name} loading="lazy" />
                    ) : (
                      <div className="anp2-card__no-img">{t("no_image")}</div>
                    )}
                    {!product.isAvailable && (
                      <div className="anp2-card__oos">
                        <span className="anp2-card__oos-badge">{t("out_of_stock")}</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Card body */}
                <div className="anp2-card__body">
                  <Link
                    to={`/product/${product.id}`}
                    className="anp2-card__name"
                  >
                    {i18n.language === "ar"
                      ? product.nameAr || product.name
                      : product.name}
                  </Link>
                  <div className="anp2-card__meta">
                    <span className="anp2-card__price">
                      <ProductListPrice
                        productId={product.id}
                        basePrice={product.price}
                      />
                    </span>
                    {product.isAvailable ? (
                      <span className="anp2-card__stock anp2-card__stock--in">
                        {t("in_stock")}
                      </span>
                    ) : (
                      <span className="anp2-card__stock anp2-card__stock--out">
                        {t("out_of_stock")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Add to cart */}
                <div className="anp2-card__btn">
                  {product.isAvailable ? (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleAddToCart(product)}
                      className="anp2-btn-primary"
                    >
                      {t("add_to_cart")}
                    </motion.button>
                  ) : (
                    <button className="anp2-btn-disabled" disabled>
                      {t("out_of_stock")}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
