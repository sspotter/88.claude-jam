import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getAnalytics, updateOrderStatus } from "../../lib/api/admin";
import type { Order as ApiOrder } from "../../lib/api/admin";
import { handleApiError, OperationType } from "../../lib/api/errors";
import {
  Package,
  ListOrdered,
  DollarSign,
  TrendingUp,
  Clock,
  X,
  CheckCircle,
  Plus,
  Download,
} from "lucide-react";
import {
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
} from "recharts";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type OrderData = ApiOrder;

const COLORS = ["#eab308", "#22c55e"]; // yellow for pending, green for shipped

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    products: 0,
    pendingOrdersCount: 0,
    shippedOrdersCount: 0,
    pendingOrdersValue: 0,
    shippedOrdersValue: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayData, setSelectedDayData] = useState<{
    date: string;
    ordersList: OrderData[];
  } | null>(null);

  const [rawOrders, setRawOrders] = useState<OrderData[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);

  const [dateFilter, setDateFilter] = useState<
    "today" | "week" | "month" | "all"
  >("all");

  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderData[]>([]);
  const [aov, setAov] = useState(0);

  const handleMarkShipped = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, "shipped");
      const updatedRaw = rawOrders.map((o) =>
        o.id === orderId ? { ...o, status: "shipped" } : o,
      );
      setRawOrders(updatedRaw);
      toast.success("Order marked as shipped");
    } catch (e) {
      handleApiError(e, OperationType.UPDATE, "orders");
      toast.error("Failed to update order");
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const { products, orders } = await getAnalytics();
        setRawProducts(products);
        setRawOrders(orders);
      } catch (error) {
        handleApiError(error, OperationType.GET, "analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (loading) return;

    const lowStock = rawProducts
      .filter((p) => p.stockCount <= 5)
      .sort((a, b) => a.stockCount - b.stockCount)
      .slice(0, 5);
    setLowStockProducts(lowStock);

    let pendingCount = 0;
    let shippedCount = 0;
    let pendingValue = 0;
    let shippedValue = 0;

    const dailySales: {
      [key: string]: {
        date: string;
        sales: number;
        orders: number;
        ordersList: OrderData[];
      };
    } = {};
    const filteredOrders: OrderData[] = [];

    const now = new Date();

    rawOrders.forEach((data) => {
      const orderDate = new Date(data.createdAt);
      let include = true;

      if (dateFilter === "today") {
        include = orderDate.toDateString() === now.toDateString();
      } else if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        include = orderDate >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        include = orderDate >= monthAgo;
      }

      if (!include) return;

      filteredOrders.push(data);

      if (data.status === "pending") {
        pendingCount++;
        pendingValue += data.totalPrice || 0;
      } else if (data.status === "shipped") {
        shippedCount++;
        shippedValue += data.totalPrice || 0;
      }

      const dateStr = orderDate.toLocaleDateString();
      if (!dailySales[dateStr]) {
        dailySales[dateStr] = {
          date: dateStr,
          sales: 0,
          orders: 0,
          ordersList: [],
        };
      }
      dailySales[dateStr].sales += data.totalPrice || 0;
      dailySales[dateStr].orders += 1;
      dailySales[dateStr].ordersList.push(data);
    });

    // Compute AOV
    const totalValue = pendingValue + shippedValue;
    const totalOrdersCount = pendingCount + shippedCount;
    setAov(totalOrdersCount > 0 ? totalValue / totalOrdersCount : 0);

    // Recent Orders
    filteredOrders.sort((a, b) => b.createdAt - a.createdAt);
    setRecentOrders(filteredOrders.slice(0, 5));

    // Top Performers
    const productSales: {
      [key: string]: { name: string; revenue: number; sold: number };
    } = {};
    filteredOrders.forEach((order) => {
      (order as any).items?.forEach((item: any) => {
        if (!productSales[item.id]) {
          productSales[item.id] = { name: item.name, revenue: 0, sold: 0 };
        }
        productSales[item.id].revenue += item.price * item.quantity;
        productSales[item.id].sold += item.quantity;
      });
    });
    const top = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    setTopProducts(top);

    // Convert map to sorted array
    const sortedChartData = Object.values(dailySales).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    setStats({
      products: rawProducts.length,
      pendingOrdersCount: pendingCount,
      shippedOrdersCount: shippedCount,
      pendingOrdersValue: pendingValue,
      shippedOrdersValue: shippedValue,
    });

    setChartData(sortedChartData);
    setPieData([
      { name: "Pending", value: pendingCount },
      { name: "Shipped", value: shippedCount },
    ]);
  }, [loading, rawOrders, rawProducts, dateFilter]);

  // SMART INSIGHTS GENERATION
  const generateInsights = () => {
    if (loading || rawOrders.length === 0) return [];

    const insights: { type: "positive" | "warning" | "info"; text: string }[] =
      [];
    const now = new Date();
    const todayStr = now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    let todayRev = 0;
    let yesterdayRev = 0;
    let totalRevenue = 0;

    rawOrders.forEach((o) => {
      const dStr = new Date(o.createdAt).toDateString();
      if (dStr === todayStr) todayRev += o.totalPrice || 0;
      if (dStr === yesterdayStr) yesterdayRev += o.totalPrice || 0;
      totalRevenue += o.totalPrice || 0;
    });

    // 1. Revenue comparison
    if (yesterdayRev > 0) {
      const diff = ((todayRev - yesterdayRev) / yesterdayRev) * 100;
      if (diff > 0) {
        insights.push({
          type: "positive",
          text: `Revenue is up ${diff.toFixed(0)}% vs yesterday`,
        });
      } else if (diff < 0) {
        insights.push({
          type: "warning",
          text: `Revenue is down ${Math.abs(diff).toFixed(0)}% vs yesterday`,
        });
      }
    } else if (todayRev > 0 && yesterdayRev === 0) {
      insights.push({
        type: "positive",
        text: `You made sales today after a quiet day yesterday!`,
      });
    }

    // 2. Top Driver
    if (topProducts.length > 0 && totalRevenue > 0) {
      const topProd = topProducts[0];
      const pct = (topProd.revenue / totalRevenue) * 100;
      if (pct > 25) {
        insights.push({
          type: "info",
          text: `${topProd.name} is driving ${pct.toFixed(0)}% of total sales`,
        });
      }
    }

    // 3. No sales risk
    const zeroSales = rawProducts.filter(
      (p) =>
        !rawOrders.some((o) =>
          o.items?.some((i: any) => i.productId === p.id || i.id === p.id),
        ),
    );
    if (
      zeroSales.length > 0 &&
      zeroSales.length <= 5 &&
      rawOrders.length > 10
    ) {
      insights.push({
        type: "warning",
        text: `${zeroSales[0].name} has never sold. Consider a promotion.`,
      });
    }

    // 4. Pending large volume
    if (stats.pendingOrdersCount > 10) {
      insights.push({
        type: "warning",
        text: `You have ${stats.pendingOrdersCount} pending orders to fulfill.`,
      });
    }

    return insights.slice(0, 4); // max 4
  };

  const smartInsights = generateInsights();

  const handleExport = () => {
    try {
      if (rawOrders.length === 0) {
        toast.info("No orders to export.");
        return;
      }

      const wsData = chartData.map((d) => ({
        Date: d.date,
        Orders: d.orders,
        "Total Sales": d.sales.toFixed(2),
      }));

      const ordersData = rawOrders.map((o) => ({
        "Order ID": o.id,
        Date: new Date(o.createdAt).toLocaleString(),
        "Customer Name": o.customerName || "Unknown",
        "Total Price": o.totalPrice,
        Status: o.status,
      }));

      const wb = XLSX.utils.book_new();

      const ws1 = XLSX.utils.json_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws1, "Daily Summary");

      const ws2 = XLSX.utils.json_to_sheet(ordersData);
      XLSX.utils.book_append_sheet(wb, ws2, "All Orders");

      XLSX.writeFile(
        wb,
        `Report_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      toast.success("Report downloaded successfully.");
    } catch (e) {
      toast.error("Failed to generate report.");
      console.error(e);
    }
  };

  if (loading) return <div className="text-stone-500">{t("loading")}</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-serif text-[var(--color-primary)]">
          {t("dashboard")}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/products"
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-accent)] transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </Link>
          <button
            onClick={handleExport}
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-sm font-medium hover:bg-stone-200 transition-colors"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
          <div className="w-px h-6 bg-stone-200 hidden sm:block mx-1"></div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="flex-1 sm:flex-none px-4 py-2 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm font-medium text-stone-600"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-3 text-stone-500 mb-1">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ListOrdered className="w-5 h-5" />
            </div>
            <span className="font-medium">{t("pending_orders")}</span>
          </div>
          <p className="text-3xl font-bold text-[var(--color-primary)]">
            {stats.pendingOrdersCount}
          </p>
          <p className="text-sm font-medium text-blue-600">
            {stats.pendingOrdersValue.toFixed(2)} {t("currency")}{" "}
            {t("pending_value")}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-3 text-stone-500 mb-1">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="font-medium">{t("shipped_orders")}</span>
          </div>
          <p className="text-3xl font-bold text-[var(--color-primary)]">
            {stats.shippedOrdersCount}
          </p>
          <p className="text-sm font-medium text-green-600">
            {stats.shippedOrdersValue.toFixed(2)} {t("currency")} {t("revenue")}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-3 text-stone-500 mb-1">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="font-medium">{t("total_value")}</span>
          </div>
          <p className="text-3xl font-bold text-[var(--color-primary)]">
            {(stats.pendingOrdersValue + stats.shippedOrdersValue).toFixed(2)}
          </p>
          <p className="text-sm font-medium text-purple-600">
            {t("currency")} {t("projected_revenue")}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-3 text-stone-500 mb-1">
            <div className="p-2 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="font-medium">Avg. Order Value</span>
          </div>
          <p className="text-3xl font-bold text-[var(--color-primary)]">
            {aov.toFixed(2)}
          </p>
          <p className="text-sm font-medium text-stone-500">
            {t("currency")} per order
          </p>
        </div>
      </div>

      {/* Charts Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-medium text-stone-800 mb-6">
            {t("sales_over_time")}
          </h3>
          <div className="h-72 w-full cursor-pointer">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(state) => {
                    const typedState = state as any;
                    if (
                      typedState &&
                      typedState.activePayload &&
                      typedState.activePayload.length > 0
                    ) {
                      setSelectedDayData(typedState.activePayload[0].payload);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-accent)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-accent)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#78716c", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#78716c", fontSize: 12 }}
                  />
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f5f5f4"
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e7e5e4",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="var(--color-accent)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                    name={t("sales_amount")}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-stone-400">
                {t("no_data")}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm lg:col-span-1 flex flex-col">
          <h3 className="text-lg font-medium text-stone-800 mb-6">
            {t("orders_volume")}
          </h3>
          <div className="flex-grow w-full flex items-center justify-center">
            {pieData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-stone-400">{t("no_data")}</div>
            )}
          </div>
        </div>
      </div>

      {/* Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-stone-800">
              Recent Orders
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100 text-sm text-stone-500">
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Total</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-stone-50 transition-colors"
                  >
                    <td className="p-3 text-[var(--color-primary)] font-medium">
                      {order.customerName}
                    </td>
                    <td className="p-3 text-stone-500 text-sm">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-[var(--color-primary)] font-medium">
                      {order.totalPrice.toFixed(2)} {t("currency")}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${
                          order.status === "shipped"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {order.status === "shipped"
                          ? t("shipped_orders")
                          : t("pending_orders")}
                      </span>
                    </td>
                    <td className="p-3">
                      {order.status === "pending" && (
                        <button
                          onClick={() => handleMarkShipped(order.id)}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-accent)] transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Ship
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-stone-500">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Insights */}
        <div className="space-y-6 lg:col-span-1">
          {/* Smart Insights */}
          {smartInsights.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
              <h3 className="text-lg font-medium text-stone-800 mb-6">
                Smart Insights
              </h3>
              <div className="space-y-3">
                {smartInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      insight.type === "positive"
                        ? "bg-green-50 border-green-100 text-green-800"
                        : insight.type === "warning"
                          ? "bg-yellow-50 border-yellow-100 text-yellow-800"
                          : "bg-blue-50 border-blue-100 text-blue-800"
                    }`}
                  >
                    <p className="text-sm font-medium leading-relaxed">
                      {insight.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Stock Alerts */}
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-stone-800">
                Low Stock Alerts
              </h3>
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md">
                {lowStockProducts.length}
              </span>
            </div>
            <div className="space-y-4">
              {lowStockProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="flex justify-between items-center p-3 border border-red-100 bg-red-50/30 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-[var(--color-primary)] text-sm">
                      {prod.name}
                    </p>
                    <p className="text-xs text-red-500 font-medium">
                      {prod.stockCount} left in stock
                    </p>
                  </div>
                  <Link
                    to="/admin/inventory"
                    className="text-xs font-bold text-[var(--color-accent)] hover:text-[var(--color-primary)] uppercase tracking-wider px-2 py-1 bg-white border border-stone-200 rounded"
                  >
                    Restock
                  </Link>
                </div>
              ))}
              {lowStockProducts.length === 0 && (
                <p className="text-sm text-stone-500 text-center py-4">
                  All products are well stocked.
                </p>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-stone-800">
                Top Performers
              </h3>
            </div>
            <div className="space-y-4">
              {topProducts.map((prod) => (
                <div
                  key={prod.name}
                  className="flex justify-between items-center p-3 border border-stone-100 bg-stone-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-[var(--color-primary)] text-sm">
                      {prod.name}
                    </p>
                    <p className="text-xs text-stone-500 font-medium">
                      {prod.sold} sold
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-[var(--color-primary)] text-sm">
                      {prod.revenue.toFixed(2)} {t("currency")}
                    </p>
                  </div>
                </div>
              ))}
              {topProducts.length === 0 && (
                <p className="text-sm text-stone-500 text-center py-4">
                  No sales data yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedDayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-stone-100">
              <h2 className="text-2xl font-serif text-[var(--color-primary)]">
                {selectedDayData.date} {t("orders_count")}
              </h2>
              <button
                onClick={() => setSelectedDayData(null)}
                className="text-stone-400 hover:text-[var(--color-primary)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow">
              {selectedDayData.ordersList.length > 0 ? (
                <div className="space-y-4">
                  {selectedDayData.ordersList.map((order) => (
                    <div
                      key={order.id}
                      className="border border-stone-100 rounded-xl p-4 flex justify-between items-center bg-stone-50"
                    >
                      <div>
                        <p className="font-medium text-[var(--color-primary)]">
                          {order.customerName || "N/A"}
                        </p>
                        <p className="text-sm text-stone-500">{order.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-[var(--color-primary)]">
                          {order.totalPrice.toFixed(2)} {t("currency")}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 rounded-md text-xs font-medium mt-1 ${
                            order.status === "shipped"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {order.status === "shipped"
                            ? t("shipped_orders")
                            : t("pending_orders")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-stone-500">{t("no_data")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
