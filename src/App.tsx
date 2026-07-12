import React, { useEffect, useState } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { getTheme, getFont, getLanguageSettings } from "./lib/api/catalog";
import { applyCustomFont } from "./lib/customFont";
import i18n, { LANG_CHOSEN_KEY } from "./i18n";

import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import NotFound from "./components/NotFound";

import Landing from "./pages/Landing";
import Landing2 from "./pages/Landing2";
import CategoryView from "./pages/CategoryView";
import ProductView from "./pages/ProductView";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Animation from "./pages/Animation";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import ContactUs from "./pages/ContactUs";

import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminOrders from "./pages/admin/Orders";
import AdminProducts from "./pages/admin/Products";
import AdminCategories from "./pages/admin/Categories";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminInventory from "./pages/admin/Inventory";
import AdminCustomers from "./pages/admin/Customers";
import AdminSettings from "./pages/admin/Settings";
import AdminOffers from "./pages/admin/Offers";
import AdminPricing from "./pages/admin/Pricing";
import AdminSimulators from "./pages/admin/Simulators";
import AdminAuditLog from "./pages/admin/AuditLog";

function AppRoutes() {
  const { isAdmin, loading } = useAuth();

  useEffect(() => {
    getTheme()
      .then((theme) => {
        document.documentElement.dataset.theme = theme.selectedTheme ?? "default";
      })
      .catch(() => {
        document.documentElement.dataset.theme = "default";
      });
    getFont()
      .then((font) => {
        if (font.custom?.url) {
          applyCustomFont(font.custom.url);
        }
        document.documentElement.dataset.font = font.selectedFont ?? "default";
      })
      .catch(() => {
        document.documentElement.dataset.font = "default";
      });
    // Apply the admin-configured default only if this visitor has never used
    // the language toggle themselves. Uses the dedicated LANG_CHOSEN_KEY flag
    // (set only inside setUserLanguage), not i18next's own language cache —
    // that cache gets written on every init regardless of visitor intent, so
    // it can't tell "chosen" apart from "defaulted."
    if (!localStorage.getItem(LANG_CHOSEN_KEY)) {
      getLanguageSettings()
        .then((language) => {
          if (!localStorage.getItem(LANG_CHOSEN_KEY)) {
            i18n.changeLanguage(language.defaultLanguage);
          }
        })
        .catch(() => {
          // Fail open: i18n already resolved to fallbackLng ("ar").
        });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#131313" }}>
        <div className="w-10 h-10 rounded-full animate-spin" style={{ border: "2px solid rgba(212,175,55,0.2)", borderTopColor: "#f2ca50" }}></div>
      </div>
    );
  }

  const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAdmin) {
      return <Navigate to="/admin/login" replace />;
    }
    return <>{children}</>;
  };

  const router = createBrowserRouter([
    {
      path: "/landing",
      element: <Landing />,
      errorElement: <NotFound />,
    },
    {
      path: "/landing2",
      element: <Landing2 />,
      errorElement: <NotFound />,
    },
    {
      path: "/",
      element: <Landing2 />,
      errorElement: <NotFound />,
    },
    {
      path: "/shop",
      element: <Layout />,
      errorElement: <NotFound />,
      children: [
        { index: true, element: <Categories /> },
        { path: "category/:id", element: <CategoryView /> },
        { path: "product/:id", element: <ProductView /> },
        { path: "cart", element: <Cart /> },
        { path: "checkout", element: <Checkout /> },
        { path: "checkout/success", element: <CheckoutSuccess /> },
        { path: "animation", element: <Animation /> },
        { path: "products", element: <Products /> },
        { path: "categories", element: <Categories /> },
        { path: "contact", element: <ContactUs /> },
      ],
    },
    {
      path: "/",
      element: <Layout />,
      errorElement: <NotFound />,
      children: [
        { path: "category/:id", element: <CategoryView /> },
        { path: "product/:id", element: <ProductView /> },
        { path: "cart", element: <Cart /> },
        { path: "checkout", element: <Checkout /> },
        { path: "checkout/success", element: <CheckoutSuccess /> },
        { path: "animation", element: <Animation /> },
        { path: "products", element: <Products /> },
        { path: "categories", element: <Categories /> },
        { path: "contact", element: <ContactUs /> },
      ],
    },
    {
      path: "/admin",
      errorElement: <NotFound />,
      children: [
        { path: "login", element: <AdminLogin /> },
        {
          element: (
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          ),
          children: [
            { path: "dashboard", element: <AdminDashboard /> },
            { path: "analytics", element: <AdminAnalytics /> },
            { path: "simulators", element: <AdminSimulators /> },
            { path: "orders", element: <AdminOrders /> },
            { path: "products", element: <AdminProducts /> },
            { path: "inventory", element: <AdminInventory /> },
            { path: "categories", element: <AdminCategories /> },
            { path: "customers", element: <AdminCustomers /> },
            { path: "offers", element: <AdminOffers /> },
            { path: "pricing", element: <AdminPricing /> },
            { path: "settings", element: <AdminSettings /> },
            { path: "audit", element: <AdminAuditLog /> },
            {
              index: true,
              element: <Navigate to="/admin/dashboard" replace />,
            },
          ],
        },
      ],
    },
    { path: "*", element: <NotFound /> },
  ]);

  return (
    <>
      <Toaster position="top-center" richColors />
      <RouterProvider router={router} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
