import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCategory, getProducts } from "../lib/api/catalog";
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

export default function CategoryView() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const [categoryName, setCategoryName] = useState("");
  const [categoryNameAr, setCategoryNameAr] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const searchQuery = useSearchStore((state) => state.searchQuery);
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc">("default");
  const [availability, setAvailability] = useState<"all" | "in_stock">("all");

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
      if (!id) return;
      try {
        const [cat, prods] = await Promise.all([
          getCategory(id),
          getProducts({ categoryId: id }),
        ]);
        if (cat.isHidden) {
          setLoading(false);
          return;
        }
        setCategoryName(cat.name);
        setCategoryNameAr(cat.nameAr ?? "");
        setProducts(prods as Product[]);
      } catch (error) {
        handleApiError(error, OperationType.GET, "products");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const displayCatName =
    i18n.language === "ar" ? categoryNameAr || categoryName : categoryName;

  let filteredProducts = [...products];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.nameAr && p.nameAr.toLowerCase().includes(q)),
    );
  }
  if (availability === "in_stock") filteredProducts = filteredProducts.filter((p) => p.isAvailable);
  if (sortBy === "price_asc") filteredProducts.sort((a, b) => a.price - b.price);
  else if (sortBy === "price_desc") filteredProducts.sort((a, b) => b.price - a.price);

  // Always push out-of-stock items to the bottom
  filteredProducts.sort((a, b) => (a.isAvailable === b.isAvailable ? 0 : a.isAvailable ? -1 : 1));

  return (
    <>
      <style>{`
        /* ── Artisanal Noir — Category View ──────────────────────────── */
        .anc-root {
          --an-bg:          var(--th-bg, #131313);
          --an-surface:     var(--th-surface, #1a1a1a);
          --an-surface-hi:  var(--th-surface-hi, #2a2a2a);
          --an-text:        var(--th-text, #e5e2e1);
          --an-muted:       var(--th-muted, #a0a0a0);
          --an-gold:        var(--th-gold, #f2ca50);
          --an-gold-dim:    var(--th-gold-dim, #e9c349);
          --an-gold-deep:   var(--th-gold-deep, #d4af37);
          --an-outline:     var(--th-outline, rgba(212,175,55,0.20));
          --an-radius:      0.25rem;
          --an-radius-full: 9999px;
          font-family: var(--font-sans);
          background: var(--an-bg);
          color: var(--an-text);
          /* break out of Layout's padding */
          margin: -1.5rem -1rem -2.5rem;
          padding: 3rem clamp(1rem, 4vw, 3rem) 5rem;
          min-height: calc(100vh - 80px);
        }
        @media(min-width:640px) {
          .anc-root { margin: -1.5rem -1.5rem -2.5rem; }
        }

        /* header row */
        .anc-header {
          display: flex; flex-wrap: wrap;
          align-items: center; justify-content: space-between;
          gap: 1rem; margin-bottom: 3rem;
        }
        .anc-title {
          margin: 0;
          font-family: var(--font-serif);
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 700; letter-spacing: -0.01em;
          color: var(--an-text);
        }
        .anc-title span { color: var(--an-gold); }

        /* filters */
        .anc-filters { display: flex; flex-wrap: wrap; gap: 0.75rem; }
        .anc-select {
          padding: 0.55rem 1rem;
          background: var(--an-surface);
          border: 1px solid var(--an-outline);
          border-radius: var(--an-radius-full);
          color: var(--an-text);
          font-family: var(--font-sans);
          font-size: 0.78rem; font-weight: 600;
          letter-spacing: 0.04em;
          outline: none; cursor: pointer;
          transition: border-color 200ms ease;
          appearance: none;
          padding-right: 2rem;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23f2ca50' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
        }
        .anc-select:focus { border-color: var(--an-gold); }
        .anc-select option { background: var(--an-surface); color: var(--an-text); }

        /* grid */
        .anc-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }
        @media(min-width:768px)  { .anc-grid { grid-template-columns: repeat(3, 1fr); gap: 1.5rem; } }
        @media(min-width:1280px) { .anc-grid { grid-template-columns: repeat(4, 1fr); } }

        /* product card */
        .anc-card {
          display: flex; flex-direction: column;
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
        .anc-card::before {
          content: '';
          position: absolute; top: 0; left: 20%; right: 20%; height: 1px;
          background: linear-gradient(90deg, transparent, var(--an-gold-dim), transparent);
        }
        .anc-card:hover {
          transform: translateY(-6px);
          border-color: rgba(242,202,80,0.35);
          box-shadow: 0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(242,202,80,0.2);
        }

        /* image */
        .anc-card__img-wrap {
          position: relative;
          aspect-ratio: 3/4;
          background: var(--th-card-img-bg, #201f1f);
          overflow: hidden;
        }
        @media(min-width:640px) { .anc-card__img-wrap { aspect-ratio: 4/5; } }
        .anc-card__img-wrap img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 600ms ease, filter 400ms ease;
          filter: brightness(0.9);
        }
        .anc-card:hover .anc-card__img-wrap img {
          transform: scale(1.06); filter: brightness(1);
        }
        .anc-card__oos {
          position: absolute; inset: 0;
          background: rgba(13,13,13,0.75);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
        }
        .anc-card__oos-badge {
          font-family: var(--font-sans);
          font-size: 0.65rem; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--an-gold);
          border: 1px solid var(--an-outline);
          padding: 0.35rem 0.9rem;
          border-radius: var(--an-radius-full);
          background: rgba(19,19,19,0.8);
        }

        /* body */
        .anc-card__body { padding: 1rem; flex: 1; display: flex; flex-direction: column; gap: 0.4rem; }
        .anc-card__name {
          margin: 0;
          font-family: var(--font-serif);
          font-size: clamp(0.95rem, 1.5vw, 1.1rem);
          font-weight: 500; letter-spacing: 0.04em;
          color: var(--an-text); line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
          text-decoration: none;
          transition: color 200ms ease;
        }
        .anc-card__name:hover { color: var(--an-gold); }
        .anc-card__meta {
          display: flex; align-items: center;
          justify-content: space-between; margin-top: 0.25rem;
        }
        .anc-card__price {
          font-family: var(--font-sans);
          font-size: 0.95rem; font-weight: 700;
          color: var(--an-gold);
        }
        .anc-card__stock {
          font-size: 0.6rem; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 0.2rem 0.6rem; border-radius: var(--an-radius-full);
        }
        .anc-card__stock--in  { color: #4ade80; border: 1px solid rgba(74,222,128,0.25); background: rgba(74,222,128,0.08); }
        .anc-card__stock--out { color: #f87171; border: 1px solid rgba(248,113,113,0.25); background: rgba(248,113,113,0.08); }

        /* add to cart button */
        .anc-card__btn {
          margin-top: auto; padding-top: 0.75rem;
          padding-left: 1rem; padding-right: 1rem; padding-bottom: 1rem;
        }
        .anc-btn-primary {
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
        .anc-btn-primary:hover {
          background: var(--an-gold-deep);
          box-shadow: 0 6px 24px rgba(242,202,80,0.35);
          transform: translateY(-1px);
        }
        .anc-btn-disabled {
          width: 100%; padding: 0.7rem;
          border-radius: var(--an-radius-full);
          border: 1px solid var(--an-outline);
          background: transparent; color: var(--an-muted);
          font-family: var(--font-sans);
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: not-allowed;
        }

        /* empty state */
        .anc-empty {
          text-align: center;
          padding: 5rem 2rem;
          color: var(--an-muted);
          border: 1px solid var(--an-outline);
          border-radius: 16px;
          background: var(--an-surface);
        }
        .anc-empty-title {
          font-family: var(--font-serif);
          font-size: 1.5rem; font-weight: 500;
          color: var(--an-text); margin: 0 0 0.5rem;
        }

        /* skeleton pulse */
        @keyframes ancPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        .anc-skeleton { animation: ancPulse 1.6s ease-in-out infinite; }
        .anc-skel-img  { background: var(--th-skel-bg, #2a2a2a); width: 100%; aspect-ratio: 3/4; }
        .anc-skel-line { background: var(--th-skel-line, #353534); border-radius: 4px; height: 0.75rem; }

        /* nav links */
        .anc-nav-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.5rem 1.1rem;
          border-radius: var(--an-radius-full);
          border: 1px solid var(--an-outline);
          background: transparent; color: var(--an-gold);
          font-family: var(--font-sans);
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          text-decoration: none; cursor: pointer;
          transition: all 200ms ease;
        }
        .anc-nav-btn:hover {
          border-color: var(--an-gold);
          background: rgba(242,202,80,0.08);
        }
      `}</style>

      <div className="anc-root">
        {/* header */}
        <div className="anc-header">
          <h1 className="anc-title">
            {displayCatName
              ? <><span>{displayCatName}</span></>
              : t("products")}
          </h1>

          <div className="anc-filters">
            <Link to="/shop/products" className="anc-nav-btn">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              All Products
            </Link>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as "all" | "in_stock")}
              className="anc-select"
            >
              <option value="all">All Items</option>
              <option value="in_stock">In Stock Only</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "default" | "price_asc" | "price_desc")}
              className="anc-select"
            >
              <option value="default">Default Sorting</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* content */}
        {loading ? (
          <div className="anc-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="anc-card anc-skeleton">
                <div className="anc-skel-img" />
                <div className="anc-card__body" style={{ gap: "0.75rem" }}>
                  <div className="anc-skel-line" style={{ width: "70%" }} />
                  <div className="anc-skel-line" style={{ width: "40%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="anc-empty">
            <p className="anc-empty-title">No products found</p>
            <p>Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="anc-grid">
            {filteredProducts.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="anc-card"
              >
                {/* image */}
                <Link to={`/product/${product.id}`}>
                  <div className="anc-card__img-wrap">
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#4d4635", fontSize: "0.8rem" }}>
                        No Image
                      </div>
                    )}
                    {!product.isAvailable && (
                      <div className="anc-card__oos">
                        <span className="anc-card__oos-badge">{t("out_of_stock")}</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* body */}
                <div className="anc-card__body">
                  <Link to={`/product/${product.id}`} className="anc-card__name">
                    {i18n.language === "ar" ? product.nameAr || product.name : product.name}
                  </Link>
                  <div className="anc-card__meta">
                    <span className="anc-card__price">
                      <ProductListPrice
                        productId={product.id}
                        basePrice={product.price}
                      />
                    </span>
                    {product.isAvailable ? (
                      <span className="anc-card__stock anc-card__stock--in">In Stock</span>
                    ) : (
                      <span className="anc-card__stock anc-card__stock--out">Out of Stock</span>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="anc-card__btn">
                  {product.isAvailable ? (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleAddToCart(product)}
                      className="anc-btn-primary"
                    >
                      {t("add_to_cart")}
                    </motion.button>
                  ) : (
                    <button className="anc-btn-disabled" disabled>
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
