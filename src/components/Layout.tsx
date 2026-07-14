import React, { useEffect, useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { setUserLanguage } from "../i18n";
import { ShoppingCart, LogIn, Menu, Search, Sun, Moon } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { useSearchStore } from "../store/searchStore";
import { motion } from "motion/react";
import MobileMenu from "./MobileMenu";
import JamhawiLogo from "./JamhawiLogo";
import CurrencySelector from "./CurrencySelector";

export default function Layout() {
  const { t, i18n } = useTranslation();
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const { searchQuery, setSearchQuery } = useSearchStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Apply theme CSS variables to :root
  useEffect(() => {
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
      root.style.setProperty("--th-nav-bg",       "rgba(250,248,245,0.95)");
      root.style.setProperty("--th-nav-border",   "rgba(158,123,40,0.15)");
      root.style.setProperty("--th-footer-bg",    "#EFECE6");
      root.style.setProperty("--th-search-bg",    "rgba(255,255,255,0.8)");
    }
  }, [isDark]);

  useEffect(() => {
    // Keep lang attribute in sync for accessibility/SEO but never flip layout direction
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = "ltr";
  }, [i18n.language]);

  const toggleLanguage = () => {
    setUserLanguage(i18n.language === "ar" ? "en" : "ar");
  };

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

            {/* Left: hamburger + logo + search */}
            <div className="flex items-center gap-4 md:gap-8">
              <button
                onClick={toggleMobileMenu}
                className="md:hidden p-2 rounded-full transition-colors"
                style={{ color: "var(--th-text)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(158,123,40,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>

              <Link
                to="/landing2"
                className="flex items-center gap-2 hover:opacity-85 transition-opacity"
              >
                <img
                  src={i18n.language === "ar" ? "/nav-logo-ar.png" : "/nav-logo-eng.png"}
                  alt={t("jamhawi")}
                  style={{
                    height: "2.5rem",
                    width: "auto",
                    objectFit: "contain",
                  }}
                  className="md:h-12"
                />
              </Link>

              {/* Desktop search */}
              <div className="hidden md:block flex-1 max-w-sm mx-4">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4" style={{ color: "#99907c" }} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      paddingLeft: "2.25rem", paddingRight: "1rem",
                      paddingTop: "0.5rem", paddingBottom: "0.5rem",
                      borderRadius: "9999px",
                      border: "1px solid var(--th-outline)",
                      background: "var(--th-search-bg)",
                      color: "var(--th-text)",
                      fontSize: "0.875rem", outline: "none",
                      transition: "border-color 200ms ease",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--th-gold)")}
                    onBlur={e => (e.target.style.borderColor = "var(--th-outline)")}
                  />
                </form>
              </div>
            </div>

            {/* Right: mobile search + lang + cart + admin */}
            <div className="flex items-center gap-3 md:gap-5">

              {/* Mobile search */}
              <div className="md:hidden flex-1 max-w-xs">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 2.25rem 0.5rem 1rem",
                      borderRadius: "9999px",
                      border: "1px solid var(--th-outline)",
                      background: "var(--th-search-bg)",
                      color: "var(--th-text)",
                      fontSize: "0.875rem", outline: "none",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--th-gold)")}
                    onBlur={e => (e.target.style.borderColor = "var(--th-outline)")}
                  />
                  <Search
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4"
                    style={{ color: "#99907c" }}
                  />
                </form>
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setIsDark(!isDark)}
                title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
                style={{
                  width: "2.4rem", height: "2.4rem",
                  borderRadius: "50%",
                  border: `1px solid ${isDark ? "rgba(212,175,55,0.2)" : "rgba(168,122,51,0.25)"}`,
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: isDark ? "#d0c5af" : "#8C7A6B",
                  transition: "all 200ms ease",
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#f2ca50";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#f2ca50";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(242,202,80,0.08)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = isDark ? "#d0c5af" : "#8C7A6B";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? "rgba(212,175,55,0.2)" : "rgba(168,122,51,0.25)";
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                {isDark
                  ? <Sun size={15} />
                  : <Moon size={15} />
                }
              </button>

              <CurrencySelector />

              {/* Language toggle */}
              <button
                onClick={toggleLanguage}
                title="Toggle Language"
                style={{
                  fontSize: "0.8rem", fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "var(--th-text-variant)",
                  background: "transparent",
                  border: "1px solid var(--th-outline)",
                  borderRadius: "9999px",
                  padding: "0.3rem 0.85rem",
                  minWidth: "44px", minHeight: "44px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "color 200ms ease, border-color 200ms ease",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--th-gold)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-gold)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-variant)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-outline)";
                }}
              >
                {i18n.language === "ar" ? "EN" : "عربي"}
              </button>

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

              {/* Contact Us */}
              <Link
                to="/shop/contact"
                className="hidden sm:flex items-center gap-1.5 transition-all text-sm font-medium"
                style={{
                  padding: "0.35rem 1rem", borderRadius: "9999px",
                  border: "1px solid var(--th-outline)",
                  color: "var(--th-text-variant)",
                  fontSize: "0.78rem", fontWeight: 600,
                  letterSpacing: "0.04em", textDecoration: "none",
                  transition: "all 200ms ease",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = "var(--th-gold)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--th-gold)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(158,123,40,0.06)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = "var(--th-text-variant)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--th-outline)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {i18n.language === "ar" ? "تواصل معنا" : "Contact"}
              </Link>

              {/* Admin */}
              <Link
                to="/admin/login"
                className="hidden sm:flex items-center gap-1.5 transition-all text-sm font-medium"
                style={{
                  padding: "0.35rem 1rem", borderRadius: "9999px",
                  border: "1px solid var(--th-outline)",
                  color: "var(--th-text-variant)",
                  fontSize: "0.78rem", fontWeight: 600,
                  letterSpacing: "0.04em", textDecoration: "none",
                  transition: "all 200ms ease",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = "var(--th-gold)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--th-gold)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(158,123,40,0.06)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = "var(--th-text-variant)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--th-outline)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <LogIn className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            </div>

          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        cartCount={cartCount}
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
        <div className="max-w-7xl mx-auto px-4">
          <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", letterSpacing: "0.25em", color: "var(--th-gold)", marginBottom: "0.75rem" }}>
            {t("app_name")}
          </p>
          <p style={{ fontSize: "0.78rem", color: "var(--th-muted)", letterSpacing: "0.04em", marginBottom: "0.75rem" }}>
            <Link
              to="/shop/contact"
              style={{ color: "var(--th-muted)", textDecoration: "none", transition: "color 150ms" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--th-gold)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--th-muted)")}
            >
              {i18n.language === "ar" ? "تواصل معنا" : "Contact Us"}
            </Link>
          </p>
          <p style={{ fontSize: "0.78rem", color: "var(--th-muted)", letterSpacing: "0.04em" }}>
            &copy; {new Date().getFullYear()} {t("app_name")}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
