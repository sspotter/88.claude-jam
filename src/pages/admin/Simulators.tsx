import React, { useEffect, useState, useRef } from "react";
import { getAnalytics } from "../../lib/api/admin";
import { handleApiError, OperationType } from "../../lib/api/errors";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
} from "recharts";
import { UploadCloud, Download, ChevronDown, ChevronRight, TrendingUp, Users, ShoppingCart, Package, MapPin, Clock, DollarSign, AlertTriangle, BarChart2, Target } from "lucide-react";
import { toast } from "sonner";

export default function Simulators() {
  const [loading, setLoading] = useState(true);
  const [salesByCategory, setSalesByCategory] = useState<any[]>([]);
  const [revenueOrdersTrend, setRevenueOrdersTrend] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowPerformingProducts, setLowPerformingProducts] = useState<any[]>([]);
  const [salesByDayOfWeek, setSalesByDayOfWeek] = useState<any[]>([]);
  const [inventoryHealth, setInventoryHealth] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<"week" | "month" | "year" | "all">("all");

  const [productFilter, setProductFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allProductsList, setAllProductsList] = useState<any[]>([]);
  const [uploadedOrders, setUploadedOrders] = useState<any[]>([]);

  // ─── Section collapse state ───────────────────────────────────────────────
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["revenue", "conversion", "customer", "product", "operations", "time", "marketing", "alerts", "geo"])
  );

  // ─── NEW: Revenue & Growth ───────────────────────────────────────────────
  const [aovTrend, setAovTrend] = useState<any[]>([]);
  const [revenueByChannel, setRevenueByChannel] = useState<any[]>([]);
  const [newVsReturning, setNewVsReturning] = useState<any[]>([]);

  // ─── NEW: Conversion Funnel ──────────────────────────────────────────────
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [cartAbandonmentTrend, setCartAbandonmentTrend] = useState<any[]>([]);
  const [cartAbandonmentRate, setCartAbandonmentRate] = useState<number>(0);

  // ─── NEW: Customer Behavior ──────────────────────────────────────────────
  const [clvDistribution, setClvDistribution] = useState<any[]>([]);
  const [cohortRetention, setCohortRetention] = useState<any[]>([]);
  const [repeatPurchaseRate, setRepeatPurchaseRate] = useState<any[]>([]);
  const [repeatRateKPI, setRepeatRateKPI] = useState<number>(0);

  // ─── NEW: Product Performance ────────────────────────────────────────────
  const [productConversionRate, setProductConversionRate] = useState<any[]>([]);
  const [inventoryTurnover, setInventoryTurnover] = useState<any[]>([]);
  const [profitMarginByProduct, setProfitMarginByProduct] = useState<any[]>([]);

  // ─── NEW: Operations & Fulfillment ──────────────────────────────────────
  const [fulfillmentTime, setFulfillmentTime] = useState<any[]>([]);
  const [returnRateByProduct, setReturnRateByProduct] = useState<any[]>([]);

  // ─── NEW: Geographic Insights ────────────────────────────────────────────
  const [salesByLocation, setSalesByLocation] = useState<any[]>([]);

  // ─── NEW: Time-Based Patterns ────────────────────────────────────────────
  const [hourlySalesHeatmap, setHourlySalesHeatmap] = useState<any[]>([]);
  const [seasonalityTrend, setSeasonalityTrend] = useState<any[]>([]);

  // ─── NEW: Marketing Performance ─────────────────────────────────────────
  const [cacTrend, setCacTrend] = useState<any[]>([]);
  const [roasByCampaign, setRoasByCampaign] = useState<any[]>([]);

  // ─── NEW: Alerts & Predictive ───────────────────────────────────────────
  const [lowStockForecast, setLowStockForecast] = useState<any[]>([]);
  const [forecastVsActual, setForecastVsActual] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const COLORS = [
    "var(--color-primary)",
    "var(--color-accent)",
    "#DCD3CB",
    "#EFEBE7",
    "#F54242",
    "#34C759",
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        const { products, categories } = await getAnalytics();

        setAllCategories(categories);
        setAllProductsList(products);
      } catch (error) {
        handleApiError(error, OperationType.GET, "analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Toggle section expand/collapse
  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Export all simulated data
  const handleExportData = (format: "xlsx" | "json") => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      dateFilter,
      productFilter,
      categoryFilter,
      summary: {
        totalOrders: uploadedOrders.length,
        totalRevenue: uploadedOrders.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0),
        avgOrderValue: uploadedOrders.length
          ? uploadedOrders.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0) / uploadedOrders.length
          : 0,
      },
      revenueOrdersTrend,
      salesByCategory,
      topProducts,
      lowPerformingProducts,
      salesByDayOfWeek,
      inventoryHealth,
      aovTrend,
      revenueByChannel,
      newVsReturning,
      funnelData,
      cartAbandonmentTrend,
      clvDistribution,
      cohortRetention,
      repeatPurchaseRate,
      productConversionRate,
      inventoryTurnover,
      profitMarginByProduct,
      fulfillmentTime,
      returnRateByProduct,
      salesByLocation,
      hourlySalesHeatmap,
      seasonalityTrend,
      cacTrend,
      roasByCampaign,
      lowStockForecast,
      forecastVsActual,
    };

    if (format === "json") {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `simulator-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported as JSON");
    } else {
      // Flatten into sheets
      const wb = XLSX.utils.book_new();
      const addSheet = (name: string, data: any[]) => {
        if (data && data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, name);
        }
      };
      addSheet("Summary", [exportData.summary]);
      addSheet("RevenueTrend", revenueOrdersTrend);
      addSheet("SalesByCategory", salesByCategory);
      addSheet("TopProducts", topProducts);
      addSheet("LowProducts", lowPerformingProducts);
      addSheet("SalesByDay", salesByDayOfWeek);
      addSheet("AOVTrend", aovTrend);
      addSheet("RevenueByChannel", revenueByChannel);
      addSheet("NewVsReturning", newVsReturning);
      addSheet("Funnel", funnelData);
      addSheet("CartAbandonment", cartAbandonmentTrend);
      addSheet("CLVDistribution", clvDistribution);
      addSheet("CohortRetention", cohortRetention);
      addSheet("RepeatPurchase", repeatPurchaseRate);
      addSheet("ProductConversion", productConversionRate);
      addSheet("InventoryTurnover", inventoryTurnover);
      addSheet("ProfitMargin", profitMarginByProduct);
      addSheet("FulfillmentTime", fulfillmentTime);
      addSheet("ReturnRate", returnRateByProduct);
      addSheet("SalesByLocation", salesByLocation);
      addSheet("HourlyHeatmap", hourlySalesHeatmap);
      addSheet("Seasonality", seasonalityTrend);
      addSheet("CACTrend", cacTrend);
      addSheet("ROAS", roasByCampaign);
      addSheet("LowStockForecast", lowStockForecast);
      addSheet("ForecastVsActual", forecastVsActual);
      XLSX.writeFile(wb, `simulator-export-${Date.now()}.xlsx`);
      toast.success("Exported as XLSX");
    }
  };

  // ─── Helpers for simulated metrics ───────────────────────────────────────
  const simulateMetric = (base: number, variance: number) =>
    base + (Math.random() - 0.5) * variance;

  const LOCATIONS = ["Cairo", "Alexandria", "Giza", "Luxor", "Aswan", "Port Said", "Suez", "Mansoura", "Tanta", "Faiyum"];
  const CHANNELS = ["Organic Search", "Paid Ads", "Social Media", "Email", "Direct", "Referral"];
  const CAMPAIGNS = ["Summer Sale", "Ramadan Promo", "New Product Launch", "Brand Awareness", "Retargeting"];

  useEffect(() => {
    if (loading) return;

    const products = allProductsList;
    const categories = allCategories;
    const orders = uploadedOrders;

    // Filter orders by date and content
    const now = new Date();
    const filteredOrders = orders
      .map((o) => ({ ...o, items: o.items ? [...o.items] : [] }))
      .filter((order) => {
        const orderDate = new Date(order.createdAt);
        if (dateFilter === "week") {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          if (orderDate < weekAgo) return false;
        } else if (dateFilter === "month") {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          if (orderDate < monthAgo) return false;
        } else if (dateFilter === "year") {
          const yearAgo = new Date();
          yearAgo.setFullYear(now.getFullYear() - 1);
          if (orderDate < yearAgo) return false;
        }

        order.items = order.items.filter((item: any) => {
          const pid = item.productId || item.id;
          if (productFilter !== "all" && pid !== productFilter)
            return false;
          if (categoryFilter !== "all") {
            const p = products.find((prod) => prod.id === pid);
            if (!p || p.categoryId !== categoryFilter) return false;
          }
          return true;
        });

        if (
          (productFilter !== "all" || categoryFilter !== "all") &&
          order.items.length === 0
        ) {
          return false;
        }

        if (productFilter !== "all" || categoryFilter !== "all") {
          order.totalPrice = order.items.reduce(
            (sum: number, it: any) => sum + it.price * it.quantity,
            0,
          );
        }

        return true;
      });

    // 1. Sales by Category
    const catSales: { [key: string]: number } = {};
    filteredOrders.forEach((order) => {
      order.items?.forEach((item: any) => {
        const product = products.find(
          (p) => p.id === item.productId || p.id === item.id,
        );
        if (product) {
          const catName =
            categories.find((c) => c.id === product.categoryId)?.name ||
            "Unknown";
          catSales[catName] =
            (catSales[catName] || 0) + item.price * item.quantity;
        }
      });
    });
    setSalesByCategory(
      Object.keys(catSales)
        .map((k) => ({ name: k, value: catSales[k] }))
        .sort((a, b) => b.value - a.value),
    );

    // 2. Revenue vs Orders Trend && AOV Trend
    const trendData: {
      [key: string]: { date: string; revenue: number; orders: number };
    } = {};
    filteredOrders.forEach((order) => {
      const dStr = new Date(order.createdAt).toLocaleDateString();
      if (!trendData[dStr])
        trendData[dStr] = { date: dStr, revenue: 0, orders: 0 };
      trendData[dStr].revenue += order.totalPrice || 0;
      trendData[dStr].orders += 1;
    });
    const sortedTrend = Object.values(trendData).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    setRevenueOrdersTrend(sortedTrend);

    // AOV Trend
    setAovTrend(
      sortedTrend.map((t) => ({
        date: t.date,
        aov: t.orders > 0 ? t.revenue / t.orders : 0,
      }))
    );

    // Revenue by Channel (simulated allocation)
    const totalRev = filteredOrders.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0);
    const channelWeights = [0.28, 0.25, 0.18, 0.12, 0.1, 0.07];
    setRevenueByChannel(
      CHANNELS.map((ch, i) => ({
        channel: ch,
        revenue: totalRev * channelWeights[i] * simulateMetric(1, 0.2),
        orders: Math.round(filteredOrders.length * channelWeights[i] * simulateMetric(1, 0.2)),
      }))
    );

    // New vs Returning (simulated)
    setNewVsReturning(
      sortedTrend.map((t) => ({
        date: t.date,
        newCustomers: Math.round(t.orders * 0.4 * simulateMetric(1, 0.3)),
        returning: Math.round(t.orders * 0.6 * simulateMetric(1, 0.3)),
      }))
    );

    // 3. Top Products & Low Performing
    const prodStats: {
      [key: string]: {
        id: string;
        name: string;
        revenue: number;
        sold: number;
        views: number;
        returns: number;
        daysSinceSale: number | null;
        margin: number;
      };
    } = {};
    products.forEach((p) => {
      prodStats[p.id] = {
        id: p.id,
        name: p.name,
        revenue: 0,
        sold: 0,
        views: Math.round(Math.random() * 500) + 50,
        returns: 0,
        daysSinceSale: null,
        margin: (p as any).marginPercent ?? simulateMetric(25, 20),
      };
    });

    filteredOrders.forEach((order) => {
      order.items?.forEach((item: any) => {
        const pid = item.productId || item.id;
        if (prodStats[pid]) {
          prodStats[pid].revenue += item.price * item.quantity;
          prodStats[pid].sold += item.quantity;
          if (order.isReturn) prodStats[pid].returns += item.quantity;

          const orderDate = new Date(order.createdAt).getTime();
          const diffDays = Math.floor(
            (now.getTime() - orderDate) / (1000 * 3600 * 24),
          );
          if (
            prodStats[pid].daysSinceSale === null ||
            diffDays < prodStats[pid].daysSinceSale!
          ) {
            prodStats[pid].daysSinceSale = diffDays;
          }
        }
      });
    });

    const sortedProds = Object.values(prodStats).sort(
      (a, b) => b.revenue - a.revenue,
    );
    setTopProducts(sortedProds.slice(0, 10));

    // Low performing
    const lowProds = Object.values(prodStats)
      .filter(
        (p) =>
          p.sold === 0 || p.daysSinceSale === null || p.daysSinceSale > 7,
      )
      .sort((a, b) => a.sold - b.sold)
      .slice(0, 10);
    setLowPerformingProducts(lowProds);

    // 4. Sales by Day of Week
    const dayNames = [
      "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
    ];
    const daySales = [0, 0, 0, 0, 0, 0, 0];
    filteredOrders.forEach((order) => {
      const dayIdx = new Date(order.createdAt).getDay();
      daySales[dayIdx] += order.totalPrice || 0;
    });
    setSalesByDayOfWeek(
      dayNames.map((name, i) => ({ name, sales: daySales[i] })),
    );

    // 5. Inventory Health
    let inStock = 0, lowStock = 0, outOfStock = 0;
    products.forEach((p) => {
      if (p.stockCount === 0) outOfStock++;
      else if (p.stockCount <= 5) lowStock++;
      else inStock++;
    });
    setInventoryHealth([
      { name: "In Stock", value: inStock, color: "#34C759" },
      { name: "Low Stock", value: lowStock, color: "#F5A623" },
      { name: "Out of Stock", value: outOfStock, color: "#F54242" },
    ]);

    // ─── CONVERSION FUNNEL ───────────────────────────────────────────────
    const visitors = Math.round(filteredOrders.length * simulateMetric(15, 5));
    const productViews = Math.round(visitors * simulateMetric(0.55, 0.15));
    const addToCart = Math.round(productViews * simulateMetric(0.45, 0.15));
    const checkout = Math.round(addToCart * simulateMetric(0.65, 0.2));
    const purchases = filteredOrders.length;
    setFunnelData([
      { name: "Visitors", value: visitors, fill: "#6366F1" },
      { name: "Product Views", value: productViews, fill: "#8B5CF6" },
      { name: "Add to Cart", value: addToCart, fill: "#A78BFA" },
      { name: "Checkout", value: checkout, fill: "#C4B5FD" },
      { name: "Purchase", value: purchases, fill: "#34C759" },
    ]);

    // Cart abandonment
    const abandonmentRate = addToCart > 0 ? Math.max(0, (addToCart - checkout) / addToCart * 100) : 0;
    setCartAbandonmentRate(abandonmentRate);
    setCartAbandonmentTrend(
      sortedTrend.map((t, i) => ({
        date: t.date,
        rate: Math.min(95, Math.max(20, abandonmentRate + simulateMetric(0, 15))),
      }))
    );

    // ─── CUSTOMER BEHAVIOR ───────────────────────────────────────────────
    // CLV Distribution
    const clvBuckets = [
      { bucket: "$0-50", count: 0 },
      { bucket: "$50-100", count: 0 },
      { bucket: "$100-250", count: 0 },
      { bucket: "$250-500", count: 0 },
      { bucket: "$500-1000", count: 0 },
      { bucket: "$1000+", count: 0 },
    ];
    const customerSpend: { [phone: string]: number } = {};
    filteredOrders.forEach((o: any) => {
      const key = o.phone || o.id;
      customerSpend[key] = (customerSpend[key] || 0) + (o.totalPrice || 0);
    });
    Object.values(customerSpend).forEach((spend) => {
      if (spend < 50) clvBuckets[0].count++;
      else if (spend < 100) clvBuckets[1].count++;
      else if (spend < 250) clvBuckets[2].count++;
      else if (spend < 500) clvBuckets[3].count++;
      else if (spend < 1000) clvBuckets[4].count++;
      else clvBuckets[5].count++;
    });
    setClvDistribution(clvBuckets);

    // Cohort Retention (simulated)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    setCohortRetention(
      months.map((month, i) => ({
        cohort: month,
        week0: 100,
        week1: Math.round(simulateMetric(70 - i * 3, 10)),
        week2: Math.round(simulateMetric(50 - i * 3, 10)),
        week3: Math.round(simulateMetric(35 - i * 2, 8)),
        week4: Math.round(simulateMetric(25 - i * 2, 8)),
      }))
    );

    // Repeat Purchase Rate
    const totalCustomers = Object.keys(customerSpend).length;
    const repeatCustomers = Object.values(customerSpend).filter((s) => s > 0).length;
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
    setRepeatRateKPI(repeatRate);
    setRepeatPurchaseRate(
      sortedTrend.slice(-6).map((t, i) => ({
        date: t.date,
        rate: Math.min(80, Math.max(10, repeatRate + simulateMetric(0, 10))),
        count: repeatCustomers,
      }))
    );

    // ─── PRODUCT PERFORMANCE ──────────────────────────────────────────────
    setProductConversionRate(
      sortedProds.slice(0, 8).map((p) => ({
        name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
        views: p.views,
        purchases: p.sold,
        rate: p.views > 0 ? ((p.sold / p.views) * 100).toFixed(1) : "0",
      }))
    );

    // Inventory Turnover
    setInventoryTurnover(
      categories.slice(0, 6).map((c) => ({
        category: c.name || "Unknown",
        turnover: parseFloat(simulateMetric(4, 3).toFixed(1)),
        stock: products.filter((p: any) => p.categoryId === c.id).reduce((s: number, p: any) => s + (p.stockCount || 0), 0),
      }))
    );

    // Profit Margin by Product
    setProfitMarginByProduct(
      sortedProds.slice(0, 8).map((p) => ({
        name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
        margin: Math.min(95, Math.max(5, p.margin)),
        revenue: p.revenue,
      }))
    );

    // ─── OPERATIONS & FULFILLMENT ────────────────────────────────────────
    setFulfillmentTime(
      sortedTrend.map((t) => ({
        date: t.date,
        processing: Math.round(simulateMetric(1.2, 0.8)),
        shipped: Math.round(simulateMetric(2.5, 1.5)),
        delivered: Math.round(simulateMetric(4.5, 2)),
      }))
    );

    setReturnRateByProduct(
      sortedProds.slice(0, 8).map((p) => ({
        name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
        returnRate: p.sold > 0 ? Math.min(30, parseFloat(simulateMetric(p.returns / p.sold * 100, 2).toFixed(1))) : 0,
        returns: p.returns,
      }))
    );

    // ─── GEOGRAPHIC ──────────────────────────────────────────────────────
    const locSales: { [loc: string]: number } = {};
    filteredOrders.forEach((o: any) => {
      const loc = o.address?.split(",")[0]?.trim() || LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
      locSales[loc] = (locSales[loc] || 0) + (o.totalPrice || 0);
    });
    if (Object.keys(locSales).length === 0) {
      LOCATIONS.forEach((l) => { locSales[l] = simulateMetric(totalRev / LOCATIONS.length, totalRev / LOCATIONS.length / 2); });
    }
    setSalesByLocation(
      Object.entries(locSales)
        .map(([location, revenue]) => ({ location, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
    );

    // ─── TIME-BASED PATTERNS ──────────────────────────────────────────────
    // Hourly heatmap: day vs hour
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const hours = Array.from({ length: 24 }, (_, h) => h);
    const heatmapData = days.map((day) => {
      const entry: any = { day };
      hours.forEach((h) => {
        entry[`h${h}`] = Math.round(simulateMetric(500, 1000));
      });
      return entry;
    });
    // Scale by actual orders if available
    if (filteredOrders.length > 0) {
      const scaleFactor = filteredOrders.length * 50 / (7 * 24);
      setHourlySalesHeatmap(heatmapData.map((d) => {
        const scaled: any = { day: d.day };
        hours.forEach((h) => { scaled[`h${h}`] = Math.round(d[`h${h}`] * scaleFactor); });
        return scaled;
      }));
    } else {
      setHourlySalesHeatmap(heatmapData);
    }

    // Seasonality (year-over-year)
    const thisYear = new Date().getFullYear();
    const months2 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    setSeasonalityTrend(
      months2.map((month, i) => ({
        month,
        thisYear: i <= now.getMonth() ? simulateMetric(totalRev / 12, totalRev / 24) : 0,
        lastYear: simulateMetric(totalRev / 12 * 0.85, totalRev / 24),
      }))
    );

    // ─── MARKETING PERFORMANCE ────────────────────────────────────────────
    // CAC Trend
    setCacTrend(
      sortedTrend.slice(-6).map((t) => ({
        date: t.date,
        cac: parseFloat(simulateMetric(25, 15).toFixed(2)),
      }))
    );

    // ROAS by Campaign
    setRoasByCampaign(
      CAMPAIGNS.map((camp) => ({
        campaign: camp,
        roas: parseFloat(simulateMetric(3.2, 2).toFixed(2)),
        spend: parseFloat(simulateMetric(500, 400).toFixed(2)),
      }))
    );

    // ─── ALERTS & PREDICTIVE ──────────────────────────────────────────────
    // Low Stock Forecast
    const forecastDays = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });
    setLowStockForecast(
      products.slice(0, 5).map((p: any) => {
        const dailySales = filteredOrders.length / 30;
        const daysLeft = p.stockCount / Math.max(1, dailySales);
        return {
          name: p.name?.slice(0, 12) || "Product",
          stock: p.stockCount || 0,
          forecast: Array.from({ length: 14 }, (_, i) => Math.max(0, (p.stockCount || 0) - dailySales * (i + 1))),
          daysLeft: Math.round(daysLeft),
          critical: daysLeft <= 7,
        };
      })
    );

    // Forecast vs Actual
    setForecastVsActual(
      sortedTrend.map((t) => ({
        date: t.date,
        forecast: simulateMetric(t.revenue * 1.1, t.revenue * 0.3),
        actual: t.revenue,
      }))
    );

  }, [dateFilter, productFilter, categoryFilter, uploadedOrders, loading, allCategories, allProductsList]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Convert array of somewhat flat fields into an order list
        // Try parsing JSON if user uploaded JSON
        if (file.name.endsWith('.json')) {
           try {
             const jsonOrders = JSON.parse(bstr as string);
             setUploadedOrders(Array.isArray(jsonOrders) ? jsonOrders : []);
             toast.success("JSON imported successfully");
             return;
           } catch(e){}
        }

        const validOrders = data.map((row: any) => ({
          ...row,
          // Handle the format we exported via "Mega Export"
          items: row.items ? (typeof row.items === 'string' ? JSON.parse(row.items) : row.items) : [],
          createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
          totalPrice: row.totalPrice || 0,
        }));

        setUploadedOrders(validOrders);
        toast.success("Report imported successfully to simulator");
      } catch (err) {
        toast.error("Failed to parse file. Make sure it's valid.");
      }
    };
    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleSimulateRandomData = () => {
    // Generate some random orders based on current products array
    if (allProductsList.length === 0) {
      toast.error("No products available to simulate.");
      return;
    }
    const fakeOrders = Array.from({ length: 50 }).map((_, i) => {
      const now = new Date();
      now.setDate(now.getDate() - Math.floor(Math.random() * 30));
      const randomProduct = allProductsList[Math.floor(Math.random() * allProductsList.length)];
      return {
        id: `sim-${i}`,
        createdAt: now.getTime(),
        status: "shipped",
        totalPrice: randomProduct.price * 2,
        items: [
           { productId: randomProduct.id, price: randomProduct.price, quantity: 2, name: randomProduct.name }
        ]
      }
    });
    setUploadedOrders(fakeOrders);
    toast.success("Generated random simulated orders");
  };

  if (loading)
    return (
      <div className="text-stone-500 text-center py-20">
        Loading Simulator...
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-serif text-[var(--color-primary)]">
          Analytics Simulator
        </h1>
        <div className="flex flex-wrap gap-4 items-center">
           <button
             onClick={handleSimulateRandomData}
             className="px-4 py-2 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm font-medium text-stone-600 hover:bg-stone-50"
           >
             Generate Random
           </button>
           <button
             onClick={() => fileInputRef.current?.click()}
             className="px-4 py-2 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm font-medium text-stone-600 flex items-center gap-2 hover:bg-stone-50"
           >
             <UploadCloud className="w-4 h-4"/>
             Import Report (JSON/XLSX)
           </button>
           <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.json" onChange={handleFileUpload} />
           <div className="flex gap-2">
             <button
               onClick={() => handleExportData("xlsx")}
               disabled={uploadedOrders.length === 0}
               className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
             >
               <Download className="w-4 h-4"/> Export XLSX
             </button>
             <button
               onClick={() => handleExportData("json")}
               disabled={uploadedOrders.length === 0}
               className="px-4 py-2 bg-stone-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
             >
               <Download className="w-4 h-4"/> Export JSON
             </button>
           </div>
        </div>
      </div>
      
      {uploadedOrders.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-stone-100 shadow-sm text-center">
           <div className="w-16 h-16 mx-auto bg-stone-100 rounded-full flex items-center justify-center text-stone-400 mb-4">
             <UploadCloud className="w-8 h-8"/>
           </div>
           <h2 className="text-xl font-medium text-stone-800 mb-2">Simulate Data</h2>
           <p className="text-stone-500 mb-6">Import a report or generate random data to view how analytics would change.</p>
           <button
             onClick={() => fileInputRef.current?.click()}
             className="px-8 py-3 bg-[var(--color-primary)] text-white font-medium rounded-xl hover:bg-[var(--color-accent)] transition-colors"
           >
             Import Report
           </button>
        </div>
      )}

      {uploadedOrders.length > 0 && (
        <>
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm font-medium text-stone-600"
            >
              <option value="all">All Categories</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm font-medium text-stone-600"
            >
              <option value="all">All Products</option>
              {allProductsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-4 py-2 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm font-medium text-stone-600"
            >
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="year">Past Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* ─── CORE METRICS ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{uploadedOrders.length}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {uploadedOrders.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0).toFixed(0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Avg Order Value</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {uploadedOrders.length > 0 ? (uploadedOrders.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0) / uploadedOrders.length).toFixed(2) : 0}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm text-center">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Cart Abandonment</p>
              <p className={`text-2xl font-bold ${cartAbandonmentRate > 60 ? "text-red-500" : "text-amber-500"}`}>
                {cartAbandonmentRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* ─── SECTION: REVENUE & GROWTH ──────────────────────────── */}
          <div className="mb-8">
            <button
              onClick={() => toggleSection("revenue")}
              className="flex items-center gap-3 w-full text-left mb-4 group"
            >
              <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-xl font-serif font-bold text-[var(--color-primary)]">Revenue & Growth Insights</h2>
              {expandedSections.has("revenue") ? <ChevronDown className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" /> : <ChevronRight className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" />}
            </button>
            {expandedSections.has("revenue") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* AOV Trend */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Average Order Value (AOV) Trend</h3>
                  <p className="text-xs text-stone-400 mb-4">Reveals pricing effectiveness and upsell success</p>
                  <div className="h-64">
                    {aovTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={aovTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Line type="monotone" name="AOV" dataKey="aov" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>

                {/* Revenue by Channel */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Revenue by Channel</h3>
                  <p className="text-xs text-stone-400 mb-4">Helps double down on what's driving sales</p>
                  <div className="h-64">
                    {revenueByChannel.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueByChannel} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="channel" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>

                {/* New vs Returning */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm col-span-1 lg:col-span-2">
                  <h3 className="text-base font-medium text-stone-700 mb-1">New vs Returning Customers Revenue</h3>
                  <p className="text-xs text-stone-400 mb-4">Shows whether growth is from acquisition or retention</p>
                  <div className="h-64">
                    {newVsReturning.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={newVsReturning} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorRet" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#34C759" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Legend />
                          <Area type="monotone" name="New Customers" dataKey="newCustomers" stroke="#6366F1" strokeWidth={2} fill="url(#colorNew)" />
                          <Area type="monotone" name="Returning" dataKey="returning" stroke="#34C759" strokeWidth={2} fill="url(#colorRet)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>

                {/* Sales Over Time */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm col-span-1 lg:col-span-2">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Sales Over Time</h3>
                  <div className="h-64">
                    {revenueOrdersTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={revenueOrdersTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Line type="monotone" name="Sales" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>

                {/* Revenue vs Orders Trend */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm col-span-1 lg:col-span-2">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Revenue vs Orders Trend</h3>
                  <div className="h-64">
                    {revenueOrdersTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={revenueOrdersTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Legend />
                          <Bar yAxisId="left" name="Orders" dataKey="orders" fill="var(--color-accent)" opacity={0.4} radius={[4, 4, 0, 0]} />
                          <Line yAxisId="right" type="monotone" name="Revenue" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── SECTION: CONVERSION FUNNEL ─────────────────────────── */}
          <div className="mb-8">
            <button
              onClick={() => toggleSection("conversion")}
              className="flex items-center gap-3 w-full text-left mb-4 group"
            >
              <Target className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-xl font-serif font-bold text-[var(--color-primary)]">Conversion Funnel</h2>
              {expandedSections.has("conversion") ? <ChevronDown className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" /> : <ChevronRight className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" />}
            </button>
            {expandedSections.has("conversion") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Funnel Chart */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Conversion Funnel</h3>
                  <p className="text-xs text-stone-400 mb-4">Pinpoints exactly where you're losing customers</p>
                  <div className="h-80">
                    {funnelData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Funnel
                            dataKey="value"
                            data={funnelData}
                            isAnimationActive
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {funnelData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Funnel>
                        </FunnelChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>

                {/* Cart Abandonment Rate */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Cart Abandonment Rate</h3>
                  <p className="text-xs text-stone-400 mb-4">One of the biggest hidden revenue leaks</p>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`text-5xl font-bold ${cartAbandonmentRate > 60 ? "text-red-500" : cartAbandonmentRate > 40 ? "text-amber-500" : "text-green-500"}`}>
                      {cartAbandonmentRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-stone-500">
                      {cartAbandonmentRate > 60 ? "⚠️ High abandonment — urgent action needed" :
                       cartAbandonmentRate > 40 ? "⚡ Moderate — room for improvement" :
                       "✅ Healthy — below industry average"}
                    </div>
                  </div>
                  <div className="h-52">
                    {cartAbandonmentTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cartAbandonmentTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} domain={[0, 100]} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Line type="monotone" name="Abandonment %" dataKey="rate" stroke="#F54242" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── SECTION: CUSTOMER BEHAVIOR ─────────────────────────── */}
          <div className="mb-8">
            <button
              onClick={() => toggleSection("customer")}
              className="flex items-center gap-3 w-full text-left mb-4 group"
            >
              <Users className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-xl font-serif font-bold text-[var(--color-primary)]">Customer Behavior</h2>
              {expandedSections.has("customer") ? <ChevronDown className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" /> : <ChevronRight className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" />}
            </button>
            {expandedSections.has("customer") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* CLV Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Customer Lifetime Value (CLV) Distribution</h3>
                  <p className="text-xs text-stone-400 mb-4">Identifies your most valuable customer segments</p>
                  <div className="h-64">
                    {clvDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={clvDistribution} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Bar dataKey="count" name="Customers" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>

                {/* Repeat Purchase Rate */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Repeat Purchase Rate</h3>
                  <p className="text-xs text-stone-400 mb-2">Core signal of brand loyalty</p>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-4xl font-bold ${repeatRateKPI > 40 ? "text-green-500" : repeatRateKPI > 20 ? "text-amber-500" : "text-red-500"}`}>
                      {repeatRateKPI.toFixed(1)}%
                    </span>
                    <span className="text-xs text-stone-500">of customers made repeat purchases</span>
                  </div>
                  <div className="h-48">
                    {repeatPurchaseRate.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={repeatPurchaseRate} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Line type="monotone" name="Repeat Rate %" dataKey="rate" stroke="#34C759" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>

                {/* Cohort Retention */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm col-span-1 lg:col-span-2">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Cohort Retention Chart</h3>
                  <p className="text-xs text-stone-400 mb-4">Shows how long customers stick around (simulated)</p>
                  <div className="overflow-x-auto">
                    {cohortRetention.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={cohortRetention} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="cohort" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Legend />
                          <Bar name="Week 0" dataKey="week0" fill="#6366F1" />
                          <Bar name="Week 1" dataKey="week1" fill="#8B5CF6" />
                          <Bar name="Week 2" dataKey="week2" fill="#A78BFA" />
                          <Bar name="Week 3" dataKey="week3" fill="#C4B5FD" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-48 flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── SECTION: PRODUCT PERFORMANCE ────────────────────────── */}
          <div className="mb-8">
            <button
              onClick={() => toggleSection("product")}
              className="flex items-center gap-3 w-full text-left mb-4 group"
            >
              <Package className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-xl font-serif font-bold text-[var(--color-primary)]">Product Performance Deep Dive</h2>
              {expandedSections.has("product") ? <ChevronDown className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" /> : <ChevronRight className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" />}
            </button>
            {expandedSections.has("product") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Product Conversion Rate */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Product Conversion Rate</h3>
                  <p className="text-xs text-stone-400 mb-4">Finds products that attract interest but don't convert</p>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {productConversionRate.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 bg-stone-50 rounded-lg px-3 py-2">
                        <span className="text-xs text-stone-400 w-6">{i + 1}</span>
                        <span className="text-sm font-medium text-stone-700 flex-1 truncate">{p.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-primary)] rounded-full"
                              style={{ width: `${Math.min(100, parseFloat(p.rate) * 5)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-[var(--color-primary)] w-10 text-right">{p.rate}%</span>
                        </div>
                      </div>
                    ))}
                    {productConversionRate.length === 0 && <p className="text-stone-400 text-sm text-center py-4">No data</p>}
                  </div>
                </div>

                {/* Inventory Turnover */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Inventory Turnover Rate</h3>
                  <p className="text-xs text-stone-400 mb-4">Helps avoid overstocking or dead inventory</p>
                  <div className="h-72">
                    {inventoryTurnover.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={inventoryTurnover} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Bar dataKey="turnover" name="Turnover" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>

                {/* Profit Margin by Product */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Profit Margin by Product</h3>
                  <p className="text-xs text-stone-400 mb-4">Revenue alone can be misleading — this shows what actually makes money</p>
                  <div className="h-72">
                    {profitMarginByProduct.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={profitMarginByProduct} layout="vertical" margin={{ top: 5, right: 40, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E5E5" />
                          <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} unit="%" />
                          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} width={80} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} formatter={(v: number) => [`${v.toFixed(1)}%`]} />
                          <Bar dataKey="margin" name="Margin %" fill="#34C759" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>

                {/* Top Products */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Top Products (Revenue)</h3>
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {topProducts.map((p, i) => (
                      <div key={p.id} className="flex justify-between items-center bg-stone-50 p-3 rounded-xl">
                        <div className="flex gap-3 items-center">
                          <span className="font-bold text-stone-400 w-4">{i + 1}</span>
                          <div>
                            <h4 className="font-medium text-[var(--color-primary)] text-sm">{p.name}</h4>
                            <p className="text-xs text-stone-500">{p.sold} units sold</p>
                          </div>
                        </div>
                        <span className="font-bold text-[var(--color-primary)]">{p.revenue.toFixed(2)}</span>
                      </div>
                    ))}
                    {topProducts.length === 0 && <p className="text-stone-400 text-sm text-center py-4">No products sold</p>}
                  </div>
                </div>

                {/* Low Performing */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm col-span-1 lg:col-span-2">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Low Performing / At Risk Products</h3>
                  <div className="space-y-3">
                    {lowPerformingProducts.map((p) => (
                      <div key={p.id} className="flex justify-between items-center bg-red-50/50 border border-red-100 p-3 rounded-xl">
                        <div>
                          <h4 className="font-medium text-[var(--color-primary)] text-sm">{p.name}</h4>
                          <p className="text-xs text-red-500 font-medium">{p.sold === 0 ? "0 units sold" : `${p.sold} units sold`}</p>
                        </div>
                        <div className="text-right text-xs text-stone-500">
                          {p.daysSinceSale === null ? "Never sold" : `${p.daysSinceSale} days since last sale`}
                        </div>
                      </div>
                    ))}
                    {lowPerformingProducts.length === 0 && <p className="text-stone-400 text-sm text-center py-4">All products performing well</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── SECTION: OPERATIONS ────────────────────────────────── */}
          <div className="mb-8">
            <button
              onClick={() => toggleSection("operations")}
              className="flex items-center gap-3 w-full text-left mb-4 group"
            >
              <Clock className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-xl font-serif font-bold text-[var(--color-primary)]">Operations & Fulfillment</h2>
              {expandedSections.has("operations") ? <ChevronDown className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" /> : <ChevronRight className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" />}
            </button>
            {expandedSections.has("operations") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Fulfillment Time */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Order Fulfillment Time</h3>
                  <p className="text-xs text-stone-400 mb-4">Impacts customer satisfaction directly (days)</p>
                  <div className="h-72">
                    {fulfillmentTime.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={fulfillmentTime} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Legend />
                          <Line type="monotone" name="Processing" dataKey="processing" stroke="#6366F1" strokeWidth={2} dot={{ r: 2 }} />
                          <Line type="monotone" name="Shipped" dataKey="shipped" stroke="#F5A623" strokeWidth={2} dot={{ r: 2 }} />
                          <Line type="monotone" name="Delivered" dataKey="delivered" stroke="#34C759" strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>

                {/* Return Rate by Product */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Return Rate by Product</h3>
                  <p className="text-xs text-stone-400 mb-4">Flags quality or expectation issues</p>
                  <div className="h-72">
                    {returnRateByProduct.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={returnRateByProduct} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Bar dataKey="returnRate" name="Return Rate %" fill="#F54242" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── SECTION: GEOGRAPHIC INSIGHTS ────────────────────────── */}
          <div className="mb-8">
            <button
              onClick={() => toggleSection("geo")}
              className="flex items-center gap-3 w-full text-left mb-4 group"
            >
              <MapPin className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-xl font-serif font-bold text-[var(--color-primary)]">Geographic Insights</h2>
              {expandedSections.has("geo") ? <ChevronDown className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" /> : <ChevronRight className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" />}
            </button>
            {expandedSections.has("geo") && (
              <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                <h3 className="text-base font-medium text-stone-700 mb-1">Sales by Location</h3>
                <p className="text-xs text-stone-400 mb-4">Useful for targeting ads, shipping strategies, and expansion</p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {salesByLocation.map((loc, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-stone-400 w-5 font-bold">{i + 1}</span>
                      <span className="text-sm font-medium text-stone-700 w-28 truncate">{loc.location}</span>
                      <div className="flex-1 h-6 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-full"
                          style={{
                            width: `${Math.min(100, (loc.revenue / Math.max(...salesByLocation.map((l) => l.revenue))) * 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-[var(--color-primary)] w-24 text-right">
                        {loc.revenue.toFixed(0)}
                      </span>
                    </div>
                  ))}
                  {salesByLocation.length === 0 && <p className="text-stone-400 text-sm text-center py-4">No location data</p>}
                </div>
              </div>
            )}
          </div>

          {/* ─── SECTION: TIME PATTERNS ─────────────────────────────── */}
          <div className="mb-8">
            <button
              onClick={() => toggleSection("time")}
              className="flex items-center gap-3 w-full text-left mb-4 group"
            >
              <BarChart2 className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-xl font-serif font-bold text-[var(--color-primary)]">Time-Based Patterns</h2>
              {expandedSections.has("time") ? <ChevronDown className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" /> : <ChevronRight className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" />}
            </button>
            {expandedSections.has("time") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hourly Sales Heatmap */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Hourly Sales Heatmap</h3>
                  <p className="text-xs text-stone-400 mb-4">Helps optimize ad timing and promotions</p>
                  <div className="overflow-x-auto">
                    {hourlySalesHeatmap.length > 0 ? (
                      <div className="min-w-[600px]">
                        {/* Hour labels */}
                        <div className="flex mb-1 ml-16">
                          {[6, 9, 12, 15, 18, 21].map((h) => (
                            <div key={h} className="text-xs text-stone-400 w-[60px] text-center">{h}:00</div>
                          ))}
                        </div>
                        {hourlySalesHeatmap.map((row) => (
                          <div key={row.day} className="flex items-center mb-1">
                            <span className="text-xs text-stone-500 w-14">{row.day}</span>
                            <div className="flex gap-[2px]">
                              {[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3,4,5].map((h) => {
                                const val = row[`h${h}`] || 0;
                                const max = Math.max(...hourlySalesHeatmap.flatMap((r) => Object.values(r).filter((v: any) => typeof v === "number")));
                                const intensity = max > 0 ? val / max : 0;
                                return (
                                  <div
                                    key={h}
                                    className="w-[22px] h-[22px] rounded-sm"
                                    style={{
                                      backgroundColor: `rgba(99, 102, 241, ${Math.max(0.05, intensity)})`,
                                    }}
                                    title={`${row.day} ${h}:00 — ${val}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <div className="h-48 flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>

                {/* Seasonality */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Seasonality Trends</h3>
                  <p className="text-xs text-stone-400 mb-4">Critical for forecasting and inventory planning</p>
                  <div className="h-72">
                    {seasonalityTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={seasonalityTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Legend />
                          <Line type="monotone" name="This Year" dataKey="thisYear" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" name="Last Year" dataKey="lastYear" stroke="#DCD3CB" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── SECTION: MARKETING PERFORMANCE ─────────────────────── */}
          <div className="mb-8">
            <button
              onClick={() => toggleSection("marketing")}
              className="flex items-center gap-3 w-full text-left mb-4 group"
            >
              <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-xl font-serif font-bold text-[var(--color-primary)]">Marketing Performance</h2>
              {expandedSections.has("marketing") ? <ChevronDown className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" /> : <ChevronRight className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" />}
            </button>
            {expandedSections.has("marketing") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* CAC Trend */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Customer Acquisition Cost (CAC)</h3>
                  <p className="text-xs text-stone-400 mb-4">Keeps ad spend sustainable</p>
                  <div className="h-64">
                    {cacTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cacTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Line type="monotone" name="CAC" dataKey="cac" stroke="#F5A623" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>

                {/* ROAS by Campaign */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">ROAS by Campaign</h3>
                  <p className="text-xs text-stone-400 mb-4">Tells you which campaigns are actually profitable</p>
                  <div className="h-64">
                    {roasByCampaign.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={roasByCampaign} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="campaign" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Bar dataKey="roas" name="ROAS" fill="#6366F1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── SECTION: ALERTS & PREDICTIVE ───────────────────────── */}
          <div className="mb-8">
            <button
              onClick={() => toggleSection("alerts")}
              className="flex items-center gap-3 w-full text-left mb-4 group"
            >
              <AlertTriangle className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-xl font-serif font-bold text-[var(--color-primary)]">Alerts & Predictive</h2>
              {expandedSections.has("alerts") ? <ChevronDown className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" /> : <ChevronRight className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" />}
            </button>
            {expandedSections.has("alerts") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Low Stock Forecast */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Low Stock Forecast</h3>
                  <p className="text-xs text-stone-400 mb-4">Prevents stockouts before they happen</p>
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {lowStockForecast.map((p: any, i: number) => (
                      <div key={i} className={`p-3 rounded-xl border ${p.critical ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm text-stone-800">{p.name}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.critical ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                            {p.daysLeft}d left
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-stone-500">Stock: {p.stock}</span>
                          <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${p.critical ? "bg-red-400" : "bg-amber-400"}`}
                              style={{ width: `${Math.min(100, (p.stock / 50) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {lowStockForecast.length === 0 && <p className="text-stone-400 text-sm text-center py-4">No products with low stock</p>}
                  </div>
                </div>

                {/* Sales Forecast vs Actual */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Sales Forecast vs Actual</h3>
                  <p className="text-xs text-stone-400 mb-4">Helps planning and goal tracking</p>
                  <div className="h-72">
                    {forecastVsActual.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={forecastVsActual} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Legend />
                          <Line type="monotone" name="Forecast" dataKey="forecast" stroke="#F5A623" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
                          <Line type="monotone" name="Actual" dataKey="actual" stroke="#34C759" strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── LEGACY: Sales by Category & Inventory ───────────────── */}
          <div className="mb-8">
            <button
              onClick={() => toggleSection("legacy")}
              className="flex items-center gap-3 w-full text-left mb-4 group"
            >
              <BarChart2 className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-xl font-serif font-bold text-[var(--color-primary)]">Sales by Category & Inventory</h2>
              {expandedSections.has("legacy") ? <ChevronDown className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" /> : <ChevronRight className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" />}
            </button>
            {expandedSections.has("legacy") && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales by Day of Week */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Sales by Day of Week</h3>
                  <div className="h-72">
                    {salesByDayOfWeek.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesByDayOfWeek} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 4px rgb(0 0 0 / 0.1)" }} />
                          <Bar dataKey="sales" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>}
                  </div>
                </div>

                {/* Inventory Health */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Inventory Health</h3>
                  <div className="h-72 flex items-center justify-center">
                    {inventoryHealth.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={inventoryHealth} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {inventoryHealth.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="text-stone-400 text-sm">No inventory data</div>}
                  </div>
                </div>

                {/* Sales by Category */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                  <h3 className="text-base font-medium text-stone-700 mb-1">Sales by Category</h3>
                  <div className="h-72 flex items-center justify-center">
                    {salesByCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={salesByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {salesByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="text-stone-400 text-sm">No category data</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
