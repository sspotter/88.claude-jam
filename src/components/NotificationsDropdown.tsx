import { useState, useEffect } from "react";
import { Bell, Package, ListOrdered, Info, X } from "lucide-react";
import { listProducts, listOrders } from "../lib/api/admin";
import { handleApiError, OperationType } from "../lib/api/errors";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface NotificationItem {
  id: string;
  type: "low_stock" | "pending_order" | "insight";
  title: string;
  description: string;
  timestamp: number;
  link: string;
  priority: "high" | "medium" | "low";
  read: boolean;
}

export default function NotificationsDropdown() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [products, orders] = await Promise.all([listProducts(), listOrders()]);

      const newNotifications: NotificationItem[] = [];

      // 1. Low stock notifications (stock <= 5)
      const lowStockProducts = products.filter((p) => p.stockCount <= 5);
      lowStockProducts.forEach((product) => {
        newNotifications.push({
          id: `low_stock_${product.id}`,
          type: "low_stock",
          title: t("low_stock_alert_title"),
          description: t("low_stock_notification_desc", {
            name: product.name,
            count: product.stockCount,
          }),
          timestamp: Date.now(),
          link: `/admin/products`,
          priority: product.stockCount <= 2 ? "high" : "medium",
          read: false,
        });
      });

      // 2. Pending orders (more than 1 hour old)
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      const pendingOrders = orders.filter(
        (o) => o.status === "pending" && o.createdAt < oneHourAgo,
      );
      pendingOrders.forEach((order) => {
        const ageHours = Math.round(
          (now - order.createdAt) / 3600000,
        );
        newNotifications.push({
          id: `pending_${order.id}`,
          type: "pending_order",
          title: t("order_pending_title"),
          description: t("order_pending_notification_desc", {
            id: order.id.slice(0, 8),
            customer: order.customerName || "Customer",
            hours: ageHours,
          }),
          timestamp: order.createdAt,
          link: `/admin/orders`,
          priority: ageHours > 3 ? "high" : "medium",
          read: false,
        });
      });

      // 3. High value pending orders (> 500 currency)
      const highValueOrders = orders.filter(
        (o) => o.status === "pending" && o.totalPrice > 500,
      );
      highValueOrders.forEach((order) => {
        newNotifications.push({
          id: `high_value_${order.id}`,
          type: "pending_order",
          title: t("high_value_order_title"),
          description: t("high_value_order_notification_desc", {
            id: order.id.slice(0, 8),
            amount: order.totalPrice.toFixed(2),
            currency: t("currency"),
          }),
          timestamp: order.createdAt,
          link: `/admin/orders`,
          priority: "high",
          read: false,
        });
      });

      // 4. Many pending orders (>5)
      if (pendingOrders.length > 5) {
        newNotifications.push({
          id: `bulk_pending`,
          type: "insight",
          title: t("multiple_pending_orders_title"),
          description: t("orders_awaiting_fulfillment", {
            count: pendingOrders.length,
          }),
          timestamp: now,
          link: `/admin/orders`,
          priority: "medium",
          read: false,
        });
      }

      // Sort by priority and timestamp (newest first)
      newNotifications.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.timestamp - a.timestamp;
      });

      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter((n) => !n.read).length);
    } catch (error) {
      handleApiError(error, OperationType.GET, "notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red–700";
      case "medium":
        return "bg-yellow-100 text-yellow–700";
      case "low":
        return "bg-blue-100 text-blue–700";
      default:
        return "bg-gray-100 text-gray–700";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return <Package className="w-5 h-5" />;
      case "pending_order":
        return <ListOrdered className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-stone-400 hover:text-[var(--color-primary)] transition-colors"
        aria-label={t("notifications")}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-stone-100 shadow-lg rounded-xl overflow-hidden z-50">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 mr-2" />
                <h3 className="font-semibold text-stone-800">{t("notifications")}</h3>
                <span className="text-sm bg-stone-100 text-stone-600 px-2 py-1 rounded-full">
                  {t("unread_count", { count: unreadCount })}
                </span>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-[var(--color-accent)] hover:text-[var(--color-primary)] font-medium"
                >
                  {t("mark_all_read")}
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-[var(--color-accent)]"></div>
                  <p className="mt-2 text-sm text-stone-500">{t("loading_notifications")}</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="text-stone-600 font-medium">{t("all_caught_up")}</p>
                  <p className="text-sm text-stone-500 mt-1">{t("no_new_notifications")}</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-50">
                  {notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      to={notification.link}
                      className={`flex items-start gap-3 p-4 hover:bg-stone-50 transition-colors ${
                        notification.read ? "" : "bg-blue-50/50"
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div
                        className={`p-2 rounded-lg ${getPriorityColor(
                          notification.priority,
                        )}`}
                      >
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-stone-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-stone-600 mt-1">
                              {notification.description}
                            </p>
                          </div>
                          {!notification.read && (
                            <span className="w-px h-1 bg-[var(--color-accent)] rounded-lg"></span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-stone-500">
                            {new Date(notification.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full ${getPriorityColor(
                              notification.priority,
                            )}`}
                          >
                            {t(`priority_${notification.priority}`)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="p-1 text-stone-400 hover:text-stone-600"
                        aria-label={t("mark_as_read")}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-stone-100 text-center">
              <Link
                to="/admin/dashboard"
                className="text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-primary)]"
                onClick={() => setIsOpen(false)}
              >
                {t("view_full_dashboard")}
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}