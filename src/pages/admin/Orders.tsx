import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  listOrders,
  updateOrderStatus,
  bulkShipOrders,
  deleteOrder,
  createOrder,
} from "../../lib/api/admin";
import type { Order as ApiOrder } from "../../lib/api/admin";
import { handleApiError, OperationType } from "../../lib/api/errors";
import {
  Check,
  Clock,
  Trash2,
  Plus,
  X,
  Search,
  CheckSquare,
  Square,
  Globe,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

type Order = ApiOrder & { status: "pending" | "shipped" };

export default function Orders() {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"pending" | "shipped">("pending");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month"
  >("all");

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    address: "",
    notes: "",
    totalPrice: 0,
  });

  const fetchOrders = async () => {
    try {
      const data = await listOrders();
      setOrders(
        data.sort((a, b) => b.createdAt - a.createdAt) as Order[],
      );
    } catch (error) {
      handleApiError(error, OperationType.GET, "orders");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleMarkShipped = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, "shipped");
      toast.success(t("shipped_orders"));
      await fetchOrders();
    } catch (error) {
      handleApiError(error, OperationType.UPDATE, "orders");
      toast.error("Failed to mark order as shipped");
    }
  };

  const handleBulkMarkShipped = async () => {
    if (selectedOrders.size === 0) return;

    setLoading(true);
    try {
      await bulkShipOrders(Array.from(selectedOrders));
      toast.success(`${selectedOrders.size} orders marked as shipped!`);
      setSelectedOrders(new Set());
      await fetchOrders();
    } catch (error) {
      handleApiError(error, OperationType.UPDATE, "orders bulk");
      toast.error("Failed to update orders");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedOrders(newSelection);
  };

  const toggleAll = (visibleIds: string[]) => {
    if (selectedOrders.size === visibleIds.length && visibleIds.length > 0) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(visibleIds));
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      await deleteOrder(orderId);
      toast.success(t("delete") + "!");

      const newSelection = new Set(selectedOrders);
      if (newSelection.has(orderId)) {
        newSelection.delete(orderId);
        setSelectedOrders(newSelection);
      }
      await fetchOrders();
    } catch (error) {
      handleApiError(error, OperationType.DELETE, "orders");
      toast.error("Failed to delete order");
    }
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.phone || !form.address) return;

    setLoading(true);
    try {
      await createOrder({
        customerName: form.customerName,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
        totalPrice: form.totalPrice,
        items: [],
        status: "pending",
      });
      toast.success(t("add_order") + "!");
      setShowModal(false);
      setForm({
        customerName: "",
        phone: "",
        address: "",
        notes: "",
        totalPrice: 0,
      });
      await fetchOrders();
    } catch (error) {
      handleApiError(error, OperationType.CREATE, "orders");
      toast.error("Failed to add order");
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const filteredOrders = orders.filter((o) => {
    if (o.status !== filter) return false;
    if (
      search &&
      !o.customerName.toLowerCase().includes(search.toLowerCase()) &&
      !o.phone.includes(search)
    )
      return false;

    const orderDate = new Date(o.createdAt);
    if (
      dateFilter === "today" &&
      orderDate.toDateString() !== now.toDateString()
    )
      return false;

    if (dateFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      if (orderDate < weekAgo) return false;
    }

    if (dateFilter === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      if (orderDate < monthAgo) return false;
    }

    return true;
  });

  const visibleIds = filteredOrders.map((o) => o.id);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
        <h1 className="text-3xl font-serif text-[var(--color-primary)]">
          {t("manage_orders")}
        </h1>
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 bg-stone-200 p-1 rounded-lg">
            <button
              onClick={() => {
                setFilter("pending");
                setSelectedOrders(new Set());
              }}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${filter === "pending" ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-stone-500 hover:text-stone-700"}`}
            >
              {t("pending_orders")}
            </button>
            <button
              onClick={() => {
                setFilter("shipped");
                setSelectedOrders(new Set());
              }}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${filter === "shipped" ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-stone-500 hover:text-stone-700"}`}
            >
              {t("shipped_orders")}
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-accent)] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t("add_order")}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-stone-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
          />
        </div>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as any)}
          className="px-4 py-2 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm font-medium text-stone-600 w-full sm:w-auto"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="week">Past Week</option>
          <option value="month">Past Month</option>
        </select>
      </div>

      {filter === "pending" && filteredOrders.length > 0 && (
        <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
          <button
            onClick={() => toggleAll(visibleIds)}
            className="flex items-center gap-2 text-stone-600 hover:text-[var(--color-primary)] font-medium text-sm"
          >
            {selectedOrders.size === visibleIds.length ? (
              <CheckSquare className="w-5 h-5 text-[var(--color-accent)]" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            Select All
          </button>

          {selectedOrders.size > 0 && (
            <div className="flex items-center gap-4 border-l border-stone-200 pl-4 text-sm">
              <span className="text-stone-500 font-medium">
                {selectedOrders.size} selected
              </span>
              <button
                onClick={handleBulkMarkShipped}
                disabled={loading}
                className="bg-[var(--color-primary)] text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-[var(--color-accent)] disabled:opacity-50"
              >
                Mark as Shipped
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className={`bg-white p-6 rounded-2xl border shadow-sm transition-colors ${selectedOrders.has(order.id) ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/50" : "border-stone-100"}`}
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
              <div className="flex items-start gap-4">
                {filter === "pending" && (
                  <button
                    onClick={() => toggleSelection(order.id)}
                    className="mt-1 flex-shrink-0 text-stone-400 hover:text-[var(--color-accent)]"
                  >
                    {selectedOrders.has(order.id) ? (
                      <CheckSquare className="w-6 h-6 text-[var(--color-accent)]" />
                    ) : (
                      <Square className="w-6 h-6" />
                    )}
                  </button>
                )}
                <div>
                  <h3 className="font-serif text-xl font-bold text-[var(--color-primary)]">
                    {order.customerName}
                  </h3>
                  <p className="text-stone-500" dir="ltr">
                    {order.phone}
                  </p>
                  {order.address && (
                    <p className="text-stone-600 mt-2">
                      <span className="font-medium">{t("address")}:</span>{" "}
                      {order.address}
                    </p>
                  )}
                  {order.notes && (
                    <p className="text-stone-600 mt-1">
                      <span className="font-medium">{t("notes")}:</span>{" "}
                      {order.notes}
                    </p>
                  )}
                  <p className="text-sm text-stone-400 mt-2">
                    {new Date(order.createdAt).toLocaleString(i18n.language)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 items-end">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {order.status === "pending" ? (
                    <Clock className="w-3 h-3" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  {t(
                    order.status === "pending"
                      ? "pending_orders"
                      : "shipped_orders",
                  )}
                </span>

                {order.status === "pending" && (
                  <button
                    onClick={() => handleMarkShipped(order.id)}
                    className="px-4 py-2 mt-2 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {t("mark_shipped")}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(order.id)}
                  className="px-4 py-2 mt-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("delete")}
                </button>
              </div>
            </div>

            <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 ml-0 sm:ml-10">
              <h4 className="font-medium text-stone-700 mb-2">{t("items")}:</h4>
              <ul className="space-y-2 mb-4">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-center text-sm py-1 border-b border-stone-200/40 last:border-0">
                    <span className="flex items-center gap-2">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      {order.currency && order.currency !== "AED" && order.currency !== "EGP" && (
                        <span 
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-stone-200 text-stone-500 font-mono shadow-sm" 
                          title={item.priceSource === "converted" ? "Auto-converted via exchange rates" : "Fixed manual price for this currency"}
                        >
                          {item.priceSource === "converted" ? (
                            <>
                              <Globe className="w-3 h-3 text-sky-500" />
                              <span>Converted</span>
                            </>
                          ) : (
                            <>
                              <Tag className="w-3 h-3 text-emerald-500" />
                              <span>Fixed Price</span>
                            </>
                          )}
                        </span>
                      )}
                    </span>
                    <span className="font-medium">
                      {item.price * item.quantity} {order.currency || "AED"}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-stone-200 pt-3 flex justify-between font-bold text-lg text-[var(--color-primary)]">
                <span>{t("total")}</span>
                <span>
                  {order.totalPrice} {order.currency || "AED"}
                </span>
              </div>
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && (
          <div className="text-center py-20 text-stone-500 bg-white rounded-2xl border border-stone-100">
            No orders found matching your criteria.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-stone-100">
              <h2 className="text-2xl font-serif text-[var(--color-primary)]">
                {t("manual_order")}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-stone-400 hover:text-[var(--color-primary)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={handleAddOrder}
              className="p-6 overflow-y-auto flex-grow space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t("customer_name")}
                </label>
                <input
                  type="text"
                  required
                  value={form.customerName}
                  onChange={(e) =>
                    setForm({ ...form, customerName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t("phone_number")}
                </label>
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t("address")}
                </label>
                <textarea
                  required
                  rows={2}
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t("notes")}
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t("total_price")}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.totalPrice}
                  onChange={(e) =>
                    setForm({ ...form, totalPrice: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
                />
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-stone-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-xl font-medium hover:bg-[var(--color-accent)]"
                >
                  {t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
