import React, { useEffect, useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Menu } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { useSearchStore } from "../store/searchStore";
import { motion } from "motion/react";
import MobileMenu from "./MobileMenu";

const THEME_STORAGE_KEY = "jamhawi-theme";

export default function Layout() {
  const { t, i18n } = useTranslation();
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const { searchQuery, setSearchQuery } = useSearchStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved ? saved === "dark" : true;
  });

  // Apply theme CSS variables to :root
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute("data-color-scheme", "dark");
      root.style.setProperty("--th-bg",          "#131313");
      root.style.setProperty("--th-surface",      "#1a1a1a");
      root.style.setProperty("--th-surface-hi",   "#2a2a2a");
      root.style.setProperty("--th-text",         "#e5e2e1");
      root.style.setProperty("--th-text-variant", "#d0c5af");
      root.style.setProperty("--th-muted",        "#a0a0a0");
      root.style.setProperty("--th-gold",         "#f2ca50");
      root.style.setProperty("--th-gold-dim",     "#e9c349");
      root.style.setProperty("--th-gold-deep",    "#d4af37");
      root.style.setProperty("--th-outline",      "rgba(212,175,55,0.20)");
      root.style.setProperty("--th-card-bg",      "linear-gradient(160deg,#1c1b1b 0%,#0e0e0e 100%)");
      root.style.setProperty("--th-card-img-bg",  "#201f1f");
      root.style.setProperty("--th-skel-bg",      "#2a2a2a");
      root.style.setProperty("--th-skel-line",    "#353534");
      root.style.setProperty("--th-empty-bg",     "#1a1a1a");
      root.style.setProperty("--th-nav-bg",       "rgba(13,13,13,0.92)");
      root.style.setProperty("--th-nav-border",   "rgba(212,175,55,0.15)");
      root.style.setProperty("--th-footer-bg",    "#0e0e0e");
      root.style.setProperty("--th-search-bg",    "rgba(26,26,26,0.8)");
    } else {
      root.setAttribute("data-color-scheme", "light");
      root.style.setProperty("--th-bg",          "#FAF8F5");
      root.style.setProperty("--th-surface",      "#FFFFFF");
      root.style.setProperty("--th-surface-hi",   "#EFECE6");
      root.style.setProperty("--th-text",         "#1C1B1B");
      root.style.setProperty("--th-text-variant", "#5C5446");
      root.style.setProperty("--th-muted",        "#9E9380");
      root.style.setProperty("--th-gold",         "#9E7B28");
      root.style.setProperty("--th-gold-dim",     "#B8921F");
      root.style.setProperty("--th-gold-deep",    "#7A5E1A");
      root.style.setProperty("--th-outline",      "rgba(158,147,128,0.30)");
      root.style.setProperty("--th-card-bg",      "linear-gradient(160deg,#FFFFFF 0%,#F5F1EB 100%)");
      root.style.setProperty("--th-card-img-bg",  "#EFECE6");
      root.style.setProperty("--th-skel-bg",      "#E7E2D9");
      root.style.setProperty("--th-skel-line",    "#D5CDBF");
      root.style.setProperty("--th-empty-bg",     "#FFFFFF");
      root.style.setProperty("--th-nav-bg",       "rgba(254, 254, 254, 0.95)");
      root.style.setProperty("--th-nav-border",   "rgba(158,123,40,0.15)");
      root.style.setProperty("--th-footer-bg",    "#EFECE6");
      root.style.setProperty("--th-search-bg",    "rgba(255,255,255,0.8)");
    }
  }, [isDark]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--th-bg)" }}>
      {/* ── Navbar ── */}
      <header
        dir="ltr"
        style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "var(--th-nav-bg)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderBottom: "1px solid var(--th-nav-border)",
        }}
      >
        <div className="w-full px-4 sm:px-6">
          <div className="flex justify-between items-center h-16 md:h-20">

            {/* Left: logo */}
            <Link
              to="/landing2"
              className="flex items-center gap-2 hover:opacity-85 transition-opacity"
            >
              <img
                src={
                  i18n.language === "ar"
                    ? (isDark ? "/nav-logo-eng.png" : "/nav-logo-eng-light.png")
                    : (isDark ? "/nav-logo-eng.png" : "/nav-logo-eng-light.png")
                }
                alt={t("jamhawi")}
                style={{
                  height: "2.5rem",
                  width: "auto",
                  objectFit: "contain",
                }}
                className="md:h-12"
              />
            </Link>

            {/* Right: cart + hamburger */}
            <div className="flex items-center gap-3 md:gap-5">

              {/* Cart */}
              <Link
                to="/cart"
                className="relative flex items-center justify-center rounded-full transition-colors"
                style={{ minWidth: "44px", minHeight: "44px", color: "var(--th-text)", padding: "0.5rem" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(158,123,40,0.08)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{
                      position: "absolute", top: 0, right: 0,
                      marginTop: "-4px", marginRight: "-4px",
                      width: "1.15rem", height: "1.15rem",
                      background: "#f2ca50", color: "#131313",
                      fontSize: "0.6rem", fontWeight: 700,
                      borderRadius: "9999px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {cartCount}
                  </motion.span>
                )}
              </Link>

              {/* Hamburger */}
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-full transition-colors"
                style={{ color: "var(--th-text)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(158,123,40,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        cartCount={cartCount}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
      />

      <main className="flex-grow w-full px-4 sm:px-6 py-6 md:py-10">
        <Outlet />
      </main>

      <footer
        style={{
          background: "var(--th-footer-bg)",
          borderTop: "1px solid var(--th-nav-border)",
          padding: "3rem 0", textAlign: "center", marginTop: "auto",
        }}
      >
        <style>{`
          .th-footer-link { color: var(--th-muted); text-decoration: none; transition: color 150ms ease; }
          .th-footer-link:hover { color: var(--th-gold); }
        `}</style>
        <div className="max-w-7xl mx-auto px-4">
          <img
            src="/footer-logo.png"
            alt={t("app_name")}
            style={{ height: "44px", width: "auto", objectFit: "contain", margin: "0 auto 0.75rem" }}
          />
          <nav
            aria-label={i18n.language === "ar" ? "روابط الفوتر" : "Footer"}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: "0.45rem", marginBottom: "1rem",
            }}
          >
            <span
              style={{
                fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "var(--th-text-variant)",
                marginBottom: "0.1rem",
              }}
            >
              {t("shop")}
            </span>
            <Link to="/shop/categories" className="th-footer-link" style={{ fontSize: "0.78rem", letterSpacing: "0.04em" }}>
              {t("categories")}
            </Link>
            <Link to="/shop/products" className="th-footer-link" style={{ fontSize: "0.78rem", letterSpacing: "0.04em" }}>
              {t("products")}
            </Link>
            <Link to="/shop/cart" className="th-footer-link" style={{ fontSize: "0.78rem", letterSpacing: "0.04em" }}>
              {t("cart")}
            </Link>
            <Link to="/shop/contact" className="th-footer-link" style={{ fontSize: "0.78rem", letterSpacing: "0.04em" }}>
              {i18n.language === "ar" ? "تواصل معنا" : "Contact Us"}
            </Link>
          </nav>
          <p style={{ fontSize: "0.78rem", color: "var(--th-muted)", letterSpacing: "0.04em" }}>
            &copy; {new Date().getFullYear()} {t("app_name")}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
