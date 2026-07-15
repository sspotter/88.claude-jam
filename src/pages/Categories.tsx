import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCategories, getProducts } from "../lib/api/catalog";
import { handleApiError, OperationType } from "../lib/api/errors";
import { motion } from "motion/react";

interface Category {
  id: string;
  name: string;
  nameAr?: string;
  image?: string;
  createdAt: number;
  isHidden?: boolean;
}

// Decorative SVG badge per category name keyword
const badgeMapping: Record<string, React.ReactNode> = {
  dates: (
    <>
      <ellipse cx="18" cy="26" rx="9" ry="12" stroke="currentColor" strokeWidth="1.4" />
      <ellipse cx="30" cy="26" rx="9" ry="12" stroke="currentColor" strokeWidth="1.4" />
      <path d="M18 14 Q24 8 30 14" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </>
  ),
  "gift boxes": (
    <>
      <path d="M16 12 H32 V16 H16 Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M18 16 V38 Q18 40 20 40 H28 Q30 40 30 38 V16" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M24 12 V16" stroke="currentColor" strokeWidth="1.4" />
    </>
  ),
  sweets: (
    <>
      <circle cx="24" cy="26" r="10" stroke="currentColor" strokeWidth="1.4" />
      <path d="M24 16 C26 12 29 14 29 16" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M18 22 C20 20 22 22 24 22 C26 22 28 20 30 22" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </>
  ),
  premium: (
    <>
      <path d="M24 10 L27 19 H37 L29 25 L32 34 L24 28 L16 34 L19 25 L11 19 H21 Z" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </>
  ),
};

const fallbackBadge = (
  <path d="M24 14 L26 22 L34 24 L26 26 L24 34 L22 26 L14 24 L22 22 Z" stroke="currentColor" strokeWidth="1.4" fill="none" />
);

export default function Categories() {
  const { i18n } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [cats, products] = await Promise.all([
          getCategories(),
          getProducts(),
        ]);
        const visible = cats.filter((c) => !c.isHidden);
        setCategories(visible);

        const counts: Record<string, number> = {};
        for (const cat of visible) {
          counts[cat.id] = 0;
        }
        for (const p of products) {
          if (p.categoryId && counts[p.categoryId] !== undefined) {
            counts[p.categoryId]++;
          }
        }
        setProductCounts(counts);
      } catch (error) {
        handleApiError(error, OperationType.GET, "categories");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <>
      <style>{`
        /* ── Artisanal Noir — Categories Page ────────────────────────
           Token fallbacks follow the skill: dark values are defaults.
           All --an-* vars read from --th-* injected by Layout.tsx.    */
        .cats-root {
          --an-bg:          var(--th-bg,          #131313);
          --an-surface:     var(--th-surface,      #1a1a1a);
          --an-surface-hi:  var(--th-surface-hi,   #2a2a2a);
          --an-text:        var(--th-text,         #e5e2e1);
          --an-muted:       var(--th-muted,        #a0a0a0);
          --an-gold:        var(--th-gold,         #f2ca50);
          --an-gold-dim:    var(--th-gold-dim,     #e9c349);
          --an-gold-deep:   var(--th-gold-deep,    #d4af37);
          --an-outline:     var(--th-outline,      rgba(212,175,55,0.20));
          --an-card-bg:     var(--th-card-bg,      linear-gradient(160deg,#1c1b1b 0%,#0e0e0e 100%));
          --an-card-img-bg: var(--th-card-img-bg,  #201f1f);
          --an-skel-bg:     var(--th-skel-bg,      #2a2a2a);
          --an-skel-line:   var(--th-skel-line,    #353534);
          font-family: var(--font-sans);
          background: var(--an-bg);
          color: var(--an-text);
          /* break out of Layout padding */
          margin: -1.5rem -1rem -2.5rem;
          padding: 3rem clamp(1rem, 4vw, 3rem) 5rem;
          min-height: calc(100vh - 80px);
        }
        @media(min-width:640px) { .cats-root { margin: -1.5rem -1.5rem -2.5rem; } }

        /* ── Page header ── */
        .cats-header {
          display: flex; flex-wrap: wrap;
          align-items: flex-end; justify-content: space-between;
          gap: 1rem; margin-bottom: 3rem;
        }
        .cats-header-left { display: flex; flex-direction: column; gap: 0.4rem; }
        .cats-kicker {
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--an-gold);
        }
        .cats-title {
          margin: 0;
          font-family: var(--font-serif);
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 700; letter-spacing: -0.01em;
          color: var(--an-text); line-height: 1.1;
        }
        .cats-subtitle {
          margin: 0.25rem 0 0;
          font-size: 0.88rem; color: var(--an-muted); line-height: 1.5;
        }
        .cats-nav-btn {
          display: inline-flex; align-items: center; gap: 0.45rem;
          padding: 0.55rem 1.25rem;
          border-radius: 9999px;
          border: 1px solid var(--an-outline);
          background: transparent; color: var(--an-gold);
          font-family: var(--font-sans);
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          text-decoration: none; cursor: pointer;
          transition: all 200ms ease;
        }
        .cats-nav-btn:hover {
          border-color: var(--an-gold);
          background: rgba(242,202,80,0.07);
        }

        /* ── Grid ── */
        .cats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        @media(min-width:640px)  { .cats-grid { grid-template-columns: repeat(2, 1fr); gap: 1.75rem; } }
        @media(min-width:900px)  { .cats-grid { grid-template-columns: repeat(3, 1fr); } }
        @media(min-width:1280px) { .cats-grid { grid-template-columns: repeat(4, 1fr); } }

        /* ── Category card ── */
        .cats-card {
          position: relative;
          display: flex; flex-direction: column;
          background: var(--an-card-bg);
          border: 1px solid var(--an-outline);
          border-radius: 20px;
          overflow: hidden;
          text-decoration: none;
          transition: transform 400ms cubic-bezier(0.22,1,0.36,1),
                      box-shadow 400ms ease,
                      border-color 300ms ease;
        }
        /* gold top-accent line */
        .cats-card::before {
          content: '';
          position: absolute; top: 0; left: 18%; right: 18%; height: 1px; z-index: 1;
          background: linear-gradient(90deg, transparent, var(--an-gold-dim), transparent);
        }
        .cats-card:hover {
          transform: translateY(-8px);
          border-color: rgba(242,202,80,0.38);
          box-shadow: 0 28px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(242,202,80,0.22);
        }

        /* image area */
        .cats-card__img {
          position: relative;
          aspect-ratio: 4/3;
          background: var(--an-card-img-bg);
          overflow: hidden;
        }
        .cats-card__img img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 650ms ease, filter 400ms ease;
          filter: brightness(0.82) contrast(1.05);
        }
        .cats-card:hover .cats-card__img img {
          transform: scale(1.07);
          filter: brightness(0.95) contrast(1.05);
        }
        .cats-card__img-placeholder {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--an-surface-hi) 0%, var(--an-surface) 100%);
        }
        .cats-card__img-placeholder svg {
          width: 3rem; height: 3rem;
          color: var(--an-gold); opacity: 0.45;
        }

        /* image vignette overlay */
        .cats-card__vignette {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(
            180deg,
            transparent 40%,
            rgba(13,13,13,0.65) 100%
          );
        }

        /* badge stamp */
        .cats-card__badge {
          position: absolute; bottom: 0.9rem; inset-inline-end: 0.9rem; z-index: 2;
          width: 2.4rem; height: 2.4rem; border-radius: 50%;
          background: var(--an-surface);
          border: 1px solid var(--an-outline);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          display: grid; place-items: center;
          color: var(--an-gold);
          transition: border-color 300ms ease;
        }
        .cats-card:hover .cats-card__badge {
          border-color: rgba(242,202,80,0.5);
        }
        .cats-card__badge svg { width: 1.1rem; height: 1.1rem; }

        /* body */
        .cats-card__body {
          padding: 1.25rem 1.4rem 1.6rem;
          display: flex; flex-direction: column; gap: 0.45rem;
        }
        .cats-card__name {
          margin: 0;
          font-family: var(--font-serif);
          font-size: clamp(1rem, 2vw, 1.25rem);
          font-weight: 600; letter-spacing: 0.05em;
          color: var(--an-text); line-height: 1.2;
          transition: color 200ms ease;
        }
        .cats-card:hover .cats-card__name { color: var(--an-gold); }

        .cats-card__divider {
          width: 2rem; height: 1px;
          background: linear-gradient(90deg, var(--an-gold-dim), transparent);
        }

        .cats-card__meta {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 0.1rem;
        }
        .cats-card__count {
          font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--an-muted);
        }
        .cats-card__cta {
          display: inline-flex; align-items: center; gap: 0.3rem;
          font-size: 0.65rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--an-gold);
          transition: gap 200ms ease;
        }
        .cats-card:hover .cats-card__cta { gap: 0.5rem; }
        .cats-card__cta svg { width: 0.75rem; height: 0.75rem; }

        /* ── Skeleton ── */
        @keyframes catsPulse { 0%,100% { opacity: 0.35; } 50% { opacity: 0.65; } }
        .cats-skeleton { animation: catsPulse 1.6s ease-in-out infinite; }
        .cats-skel-img { background: var(--an-skel-bg); width: 100%; aspect-ratio: 4/3; }
        .cats-skel-body { padding: 1.25rem 1.4rem 1.5rem; display: flex; flex-direction: column; gap: 0.65rem; }
        .cats-skel-line { background: var(--an-skel-line); border-radius: 4px; height: 0.75rem; }

        /* ── Empty state ── */
        .cats-empty {
          grid-column: 1 / -1;
          text-align: center; padding: 5rem 2rem;
          color: var(--an-muted);
          border: 1px solid var(--an-outline);
          border-radius: 16px;
          background: var(--an-surface);
        }
        .cats-empty-title {
          font-family: var(--font-serif);
          font-size: 1.5rem; font-weight: 500;
          color: var(--an-text); margin: 0 0 0.5rem;
        }

        /* ── Count chip at top of page ── */
        .cats-count-chip {
          display: inline-flex; align-items: center;
          padding: 0.3rem 0.85rem;
          border-radius: 9999px;
          border: 1px solid var(--an-outline);
          background: transparent;
          font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--an-muted);
          margin-top: 0.75rem;
        }
      `}</style>

      <div className="cats-root">

        {/* ── Header ── */}
        <div className="cats-header">
          <div className="cats-header-left">
            <span className="cats-kicker">Our Collection</span>
            <h1 className="cats-title">Categories</h1>
            <p className="cats-subtitle">
              Explore our curated selection of premium artisanal products.
            </p>
            {!loading && (
              <span className="cats-count-chip">
                {categories.length} {categories.length === 1 ? "Collection" : "Collections"}
              </span>
            )}
          </div>

          <Link to="/shop/products" className="cats-nav-btn">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            All Products
          </Link>
        </div>

        {/* ── Grid ── */}
        <div className="cats-grid">
          {loading
            ? /* Skeleton — 8 cards */
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="cats-card cats-skeleton" style={{ overflow: "hidden" }}>
                  <div className="cats-skel-img" />
                  <div className="cats-skel-body">
                    <div className="cats-skel-line" style={{ width: "65%" }} />
                    <div className="cats-skel-line" style={{ width: "40%" }} />
                  </div>
                </div>
              ))
            : categories.length === 0
              ? (
                <div className="cats-empty">
                  <p className="cats-empty-title">No categories yet</p>
                  <p>Check back soon for our curated collections.</p>
                </div>
              )
              : categories.map((cat, i) => {
                  const nameKey = cat.name.toLowerCase();
                  const badge = badgeMapping[nameKey] || fallbackBadge;
                  const displayName = i18n.language === "ar" ? cat.nameAr || cat.name : cat.name;
                  const count = productCounts[cat.id] ?? 0;

                  return (
                    <motion.div
                      key={cat.id}
                      initial={{ opacity: 0, y: 28 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.45,
                        delay: i * 0.07,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <Link to={`/category/${cat.id}`} className="cats-card">
                        {/* Image */}
                        <div className="cats-card__img">
                          {cat.image ? (
                            <img src={cat.image} alt={displayName} loading="lazy" />
                          ) : (
                            <div className="cats-card__img-placeholder">
                              <svg viewBox="0 0 48 48" fill="none">
                                {badge}
                              </svg>
                            </div>
                          )}
                          <div className="cats-card__vignette" />
                          {/* Badge stamp */}
                          <div className="cats-card__badge" aria-hidden="true">
                            <svg viewBox="0 0 48 48" fill="none">{badge}</svg>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="cats-card__body">
                          <h2 className="cats-card__name">{displayName}</h2>
                          <div className="cats-card__divider" />
                          <div className="cats-card__meta">
                            <span className="cats-card__count">
                              {count} {count === 1 ? "product" : "products"}
                            </span>
                            <span className="cats-card__cta">
                              Explore
                              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })
          }
        </div>

      </div>
    </>
  );
}
