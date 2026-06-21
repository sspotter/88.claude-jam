import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Package,
  ListOrdered,
  Layers,
  LogOut,
  BarChart3,
  Boxes,
  Users,
  Search,
  Bell,
  Settings,
  Tag,
  Activity,
  DollarSign,
  ScrollText,
} from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import CurrencySelector from "./CurrencySelector";
import { useAuth } from "../context/AuthContext";
import { listOrders, listProducts } from "../lib/api/admin";
import { handleApiError, OperationType } from "../lib/api/errors";
import JamhawiLogo from "./JamhawiLogo";

export default function AdminLayout() {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    { type: string; id: string; name: string; detail: string; path: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  useEffect(() => {
    // Admin layout always stays LTR — only language (text) changes, not direction
    document.documentElement.dir = "ltr";
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (globalSearch.trim() === "") {
        setSearchResults([]);
        setShowSearchDropdown(false);
        return;
      }
      performSearch(globalSearch);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [globalSearch]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    setShowSearchDropdown(true);
    const q = query.toLowerCase();
    try {
      const results: {
        type: string;
        id: string;
        name: string;
        detail: string;
        path: string;
      }[] = [];

      const [orders, products] = await Promise.all([listOrders(), listProducts()]);

      orders.forEach((order) => {
        if (
          order.customerName?.toLowerCase().includes(q) ||
          order.phone?.includes(q) ||
          order.id.toLowerCase().includes(q)
        ) {
          results.push({
            type: "Order",
            id: order.id,
            name: order.customerName || "Unknown",
            detail: `Order ID: ${order.id}`,
            path: "/admin/orders",
          });
        }
      });

      products.forEach((prod) => {
        if (prod.name?.toLowerCase().includes(q)) {
          results.push({
            type: "Product",
            id: prod.id,
            name: prod.name,
            detail: `${prod.price} ${t("currency")}`,
            path: "/admin/products",
          });
        }
      });

      setSearchResults(results.slice(0, 10)); // max 10 results
    } catch (e) {
      handleApiError(e, OperationType.GET, "globalSearch");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const navItems = [
    { name: t("dashboard"), path: "/admin/dashboard", icon: Layers },
    { name: t("analytics"), path: "/admin/analytics", icon: BarChart3 },
    { name: t("simulators"), path: "/admin/simulators", icon: Activity },
    { name: t("manage_orders"), path: "/admin/orders", icon: ListOrdered },
    { name: t("manage_products"), path: "/admin/products", icon: Package },
    { name: t("inventory"), path: "/admin/inventory", icon: Boxes },
    { name: t("manage_categories"), path: "/admin/categories", icon: Layers },
    { name: t("customers"), path: "/admin/customers", icon: Users },
    { name: t("offers"), path: "/admin/offers", icon: Tag },
    { name: t("pricing_management"), path: "/admin/pricing", icon: DollarSign },
    { name: t("settings"), path: "/admin/settings", icon: Settings },
    { name: t("activity_log"), path: "/admin/audit", icon: ScrollText },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen flex bg-stone-100 font-sans text-stone-900">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar - Collapsible on desktop, slide-in on mobile */}
      <aside
        className="bg-white border-r border-stone-200 shadow-sm shrink-0 flex flex-col z-40 fixed md:relative h-screen transition-all duration-300 ease-in-out"
        style={{
          width: isSidebarCollapsed ? '64px' : '256px',
        }}
        data-open={isMobileMenuOpen}
      >
        <style>{`
          @media (max-width: 767px) {
            aside[data-open="false"] { transform: translateX(-100%); }
            aside[data-open="true"]  { transform: translateX(0); }
          }
          @media (min-width: 768px) {
            aside { transform: none !important; }
          }
        `}</style>
        <div className="h-20 flex items-center px-3 border-b border-stone-200 justify-between">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <JamhawiLogo variant="mark" className="w-8 h-8 shrink-0" />
              <span className="text-base font-serif font-bold text-[var(--color-primary)] truncate">
                {t("app_name")} {t("admin")}
              </span>
            </div>
          ) : (
            <JamhawiLogo variant="mark" className="w-8 h-8 mx-auto" />
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-6 px-2 md:px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group
                  ${
                    isActive
                      ? "bg-[var(--color-accent)] text-white"
                      : "text-stone-600 hover:bg-stone-50 hover:text-[var(--color-primary)]"
                  }`}
                title={isSidebarCollapsed ? item.name : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="font-medium text-sm">{item.name}</span>
                )}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-stone-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-200 space-y-2">
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "en" ? "ar" : "en")
            }
            className="flex w-full items-center gap-3 px-4 py-3 text-stone-600 hover:bg-stone-50 rounded-lg transition-colors font-medium border border-stone-200"
          >
            {i18n.language === "en" ? "عربي" : "English"}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            {t("logout")}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-20 bg-white border-b border-stone-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-10">
          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Global Search */}
          <div className="relative w-full max-w-md mx-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-stone-400" />
            </div>
            <input
              type="text"
              placeholder={i18n.language === "ar" ? "ابحث عن منتجات، طلبات، عملاء..." : "Search products, orders, customers..."}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onFocus={() => {
                if (globalSearch.length > 0) setShowSearchDropdown(true);
              }}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              className="w-full pl-10 pr-4 py-2 bg-stone-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
            />

            {showSearchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-100 shadow-lg rounded-xl overflow-hidden z-50">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-stone-500">
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((res, idx) => (
                      <Link
                        key={idx}
                        to={res.path}
                        className="flex items-center justify-between p-3 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-none"
                      >
                        <div>
                          <div className="font-medium text-[var(--color-primary)] text-sm">
                            {res.name}
                          </div>
                          <div className="text-xs text-stone-500">
                            {res.detail}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold tracking-wider uppercase bg-stone-100 text-stone-600 px-2 py-1 rounded">
                          {res.type}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-stone-500">
                    No results found.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <CurrencySelector compact />
            <NotificationsDropdown />
            <div className="w-10 h-10 bg-stone-200 rounded-full overflow-hidden flex items-center justify-center">
              <span className="font-medium text-stone-600">A</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
