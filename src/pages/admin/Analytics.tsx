import { useEffect, useState } from "react";
import { getAnalytics } from "../../lib/api/admin";
import { handleApiError, OperationType } from "../../lib/api/errors";
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
} from "recharts";

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [salesByCategory, setSalesByCategory] = useState<any[]>([]);
  const [revenueOrdersTrend, setRevenueOrdersTrend] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowPerformingProducts, setLowPerformingProducts] = useState<any[]>([]);
  const [salesByDayOfWeek, setSalesByDayOfWeek] = useState<any[]>([]);
  const [inventoryHealth, setInventoryHealth] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<
    "week" | "month" | "year" | "all"
  >("month");

  const [productFilter, setProductFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allProductsList, setAllProductsList] = useState<any[]>([]);

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
        const { products, categories, orders } = await getAnalytics();

        setAllCategories(categories);
        setAllProductsList(products);

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

            // Exclude order if user is filtering and no items match
            if (
              (productFilter !== "all" || categoryFilter !== "all") &&
              order.items.length === 0
            ) {
              return false;
            }

            // Recalculate price if filtered
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
          if (order.status === "shipped") {
            // Assuming we only count shipped for revenue, or maybe both? Let's use all valid orders or shipped. Let's use all for now as 'revenue generated'.
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
          }
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
        setRevenueOrdersTrend(
          Object.values(trendData).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          ),
        );

        // 3. Top Products & Low Performing
        const prodStats: {
          [key: string]: {
            id: string;
            name: string;
            revenue: number;
            sold: number;
            daysSinceSale: number | null;
          };
        } = {};
        products.forEach((p) => {
          prodStats[p.id] = {
            id: p.id,
            name: p.name,
            revenue: 0,
            sold: 0,
            daysSinceSale: null,
          };
        });

        filteredOrders.forEach((order) => {
          order.items?.forEach((item: any) => {
            const pid = item.productId || item.id;
            if (prodStats[pid]) {
              prodStats[pid].revenue += item.price * item.quantity;
              prodStats[pid].sold += item.quantity;

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

        // Low performing: 0 sales in the period, or lowest sales
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
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const daySales = [0, 0, 0, 0, 0, 0, 0];
        filteredOrders.forEach((order) => {
          if (order.status === "shipped") {
            const dayIdx = new Date(order.createdAt).getDay();
            daySales[dayIdx] += order.totalPrice || 0;
          }
        });
        setSalesByDayOfWeek(
          dayNames.map((name, i) => ({ name, sales: daySales[i] })),
        );

        // 5. Inventory Health
        let inStock = 0;
        let lowStock = 0;
        let outOfStock = 0;
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
      } catch (error) {
        handleApiError(error, OperationType.GET, "analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateFilter, productFilter, categoryFilter]);

  if (loading)
    return (
      <div className="text-stone-500 text-center py-20">
        Loading Analytics...
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-serif text-[var(--color-primary)]">
          Analytics
        </h1>
        <div className="flex flex-wrap gap-4 items-center">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-lg font-medium text-stone-800 mb-6">
            Sales Over Time
          </h3>
          <div className="h-80">
            {revenueOrdersTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={revenueOrdersTrend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E5E5"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-accent)" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-accent)" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    name="Sales"
                    dataKey="revenue"
                    stroke="var(--color-primary)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "var(--color-primary)" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Orders Volume */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-lg font-medium text-stone-800 mb-6">
            Orders Volume
          </h3>
          <div className="h-80">
            {revenueOrdersTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueOrdersTrend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E5E5"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-accent)" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-accent)" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="orders"
                    fill="var(--color-accent)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Revenue vs Orders Trend */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
          <h3 className="text-lg font-medium text-stone-800 mb-6">
            Revenue vs Orders Trend
          </h3>
          <div className="h-80">
            {revenueOrdersTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueOrdersTrend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-primary)"
                        stopOpacity={0.1}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-primary)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E5E5"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-accent)" }}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-accent)" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-accent)" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    name="Revenue"
                    dataKey="revenue"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    name="Orders"
                    dataKey="orders"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
          <h3 className="text-lg font-medium text-stone-800 mb-6">
            Sales by Category
          </h3>
          <div className="h-80 flex items-center justify-center">
            {salesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {salesByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-stone-500">No category sales data</div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
          <h3 className="text-lg font-medium text-stone-800 mb-6">
            Top Products (Revenue)
          </h3>
          <div className="space-y-4">
            {topProducts.map((p, i) => (
              <div
                key={p.id}
                className="flex justify-between items-center bg-stone-50 p-3 rounded-xl"
              >
                <div className="flex gap-4 items-center">
                  <span className="font-bold text-stone-400 w-4">{i + 1}</span>
                  <div>
                    <h4 className="font-medium text-[var(--color-primary)]">
                      {p.name}
                    </h4>
                    <p className="text-xs text-stone-500">
                      {p.sold} units sold
                    </p>
                  </div>
                </div>
                <span className="font-bold text-[var(--color-primary)]">
                  {p.revenue.toFixed(2)}
                </span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-stone-500">No products sold.</p>
            )}
          </div>
        </div>

        {/* Low Performing Products */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
          <h3 className="text-lg font-medium text-stone-800 mb-6">
            Low Performing / At Risk
          </h3>
          <div className="space-y-4">
            {lowPerformingProducts.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center bg-red-50/50 border border-red-100 p-3 rounded-xl"
              >
                <div>
                  <h4 className="font-medium text-[var(--color-primary)] text-sm">
                    {p.name}
                  </h4>
                  <p className="text-xs text-red-500 font-medium">
                    {p.sold === 0 ? "0 units sold" : `${p.sold} units sold`}
                  </p>
                </div>
                <div className="text-right text-xs text-stone-500">
                  {p.daysSinceSale === null
                    ? "Never sold"
                    : `${p.daysSinceSale} days since last sale`}
                </div>
              </div>
            ))}
            {lowPerformingProducts.length === 0 && (
              <p className="text-stone-500">All products performing well.</p>
            )}
          </div>
        </div>

        {/* Sales by Day of Week */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
          <h3 className="text-lg font-medium text-stone-800 mb-6">
            Sales by Day of Week
          </h3>
          <div className="h-80">
            {salesByDayOfWeek.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesByDayOfWeek}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E5E5"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-accent)" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-accent)" }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="sales"
                    fill="var(--color-accent)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Inventory Health */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
          <h3 className="text-lg font-medium text-stone-800 mb-6">
            Inventory Health
          </h3>
          <div className="h-80 flex items-center justify-center">
            {inventoryHealth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryHealth}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {inventoryHealth.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-stone-500">No inventory data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
