import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listCustomers, listOrders } from "../../lib/api/admin";
import type { Order as ApiOrder } from "../../lib/api/admin";
import { handleApiError, OperationType } from "../../lib/api/errors";
import { Search, X } from "lucide-react";
import { useAmountFormatter } from "../../hooks/usePricing";

interface CustomerStat {
  phone: string;
  name: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: number;
  address: string;
  orders: ApiOrder[];
}

export default function Customers() {
  const { t } = useTranslation();
  const { format: formatAmount } = useAmountFormatter();
  const [customers, setCustomers] = useState<CustomerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerStat | null>(
    null,
  );

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const [customerList, orders] = await Promise.all([
          listCustomers(),
          listOrders(),
        ]);

        const ordersByPhone = orders.reduce<Record<string, ApiOrder[]>>((acc, order) => {
          if (!order.phone) return acc;
          if (!acc[order.phone]) acc[order.phone] = [];
          acc[order.phone].push(order);
          return acc;
        }, {});

        setCustomers(
          customerList
            .map((c) => ({
              phone: c.phone,
              name: c.name,
              address: c.address,
              totalOrders: c.orderCount,
              totalSpent: c.totalSpent,
              lastOrderDate: c.lastOrderAt,
              orders: ordersByPhone[c.phone] ?? [],
            }))
            .sort((a, b) => b.totalSpent - a.totalSpent),
        );
      } catch (e) {
        handleApiError(e, OperationType.GET, "customers");
      } finally {
        setLoading(false);
      }
    }

    fetchCustomers();
  }, []);

  const statusLabel = (s: string) =>
    t(`order_status_${s}`, { defaultValue: s });

  const filteredCustomers = customers.filter(
    (c) =>
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)) &&
      (statusFilter === "all" ||
        c.orders.some((o) => o.status === statusFilter)),
  );

  if (loading)
    return <div className="text-stone-500 py-10">{t("loading_customers")}</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-serif text-[var(--color-primary)]">
          {t("customers")}
        </h1>
        <div className="flex gap-4 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm font-medium text-stone-600"
          >
            <option value="all">{t("all_statuses")}</option>
            <option value="pending">{t("has_pending")}</option>
            <option value="shipped">{t("has_shipped")}</option>
          </select>
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-stone-400" />
            </div>
            <input
              type="text"
              placeholder={t("search_name_or_phone")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100 text-sm">
                <th className="p-4 font-medium text-stone-600">
                  {t("customer_info")}
                </th>
                <th className="p-4 font-medium text-stone-600">{t("total_orders")}</th>
                <th className="p-4 font-medium text-stone-600">{t("total_spent")}</th>
                <th className="p-4 font-medium text-stone-600">{t("last_order")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredCustomers.map((customer, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedCustomer(customer)}
                  className="hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  <td className="p-4">
                    <div className="font-medium text-[var(--color-primary)]">
                      {customer.name}
                    </div>
                    <div className="text-sm text-stone-500" dir="ltr">
                      {customer.phone}
                    </div>
                    {customer.address && (
                      <div className="text-xs text-stone-400 truncate max-w-[200px] mt-1">
                        {customer.address}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-stone-600">{customer.totalOrders}</td>
                  <td className="p-4 font-medium text-[var(--color-primary)]">
                    {formatAmount(customer.totalSpent)}
                  </td>
                  <td className="p-4 text-sm text-stone-500">
                    {customer.lastOrderDate > 0
                      ? new Date(customer.lastOrderDate).toLocaleDateString()
                      : t("not_available")}
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-stone-500">
                    {t("no_customers_found")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Orders Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-stone-100 shrink-0">
              <div>
                <h2 className="text-xl font-serif text-[var(--color-primary)]">
                  {t("customer_orders_title", { name: selectedCustomer.name })}
                </h2>
                <p className="text-sm text-stone-500">
                  {selectedCustomer.phone}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-stone-400 hover:text-[var(--color-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-4">
              {selectedCustomer.orders
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((order) => (
                  <div
                    key={order.id}
                    className="bg-stone-50 rounded-xl p-4 border border-stone-100 flex flex-col sm:flex-row justify-between gap-4"
                  >
                    <div>
                      <div className="font-medium text-stone-800 text-sm">
                        {t("order_id_label", { id: order.id })}
                      </div>
                      <div className="text-xs text-stone-500 mb-2">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                      <div className="text-sm text-stone-600">
                        {t("items_count", { count: order.items?.length || 0 })}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                          order.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : order.status === "shipped"
                              ? "bg-blue-100 text-blue-800"
                              : order.status === "delivered"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                        }`}
                      >
                        {statusLabel(order.status)}
                      </span>
                      <span className="font-serif font-bold text-lg text-[var(--color-primary)]">
                        {formatAmount(order.totalPrice ?? 0)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
