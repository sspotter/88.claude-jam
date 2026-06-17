import { apiFetch } from "./client.js";
import type { Category, Product, Offer } from "./catalog.js";
import type { CurrencySettings } from "../../types/pricing";

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  notes?: string;
  items: OrderItem[];
  totalPrice: number;
  paymentMethod?: string;
  status: string;
  paymentStatus?: string;
  coupon?: { code: string; discountPercentage: number };
  createdAt: number;
}

export interface Customer {
  phone: string;
  name: string;
  address: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: number;
}

export interface AnalyticsData {
  products: Product[];
  categories: Category[];
  orders: Order[];
}

function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, { ...options, auth: true });
}

// Products
export const listProducts = () => adminFetch<Product[]>("/api/products");
export const createProduct = (data: Partial<Product>) =>
  adminFetch<Product>("/api/admin/products", { method: "POST", body: JSON.stringify(data) });
export const updateProduct = (id: string, data: Partial<Product>) =>
  adminFetch<Product>(`/api/admin/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteProduct = (id: string) =>
  adminFetch<{ success: boolean }>(`/api/admin/products/${id}`, { method: "DELETE" });
export const bulkImportProducts = (products: Partial<Product>[]) =>
  adminFetch<{ count: number }>("/api/admin/products/bulk", {
    method: "POST",
    body: JSON.stringify({ products }),
  });
export const updateProductStock = (id: string, stockCount: number) =>
  adminFetch<Product>(`/api/admin/products/${id}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ stockCount }),
  });

// Categories
export const listCategories = () => adminFetch<Category[]>("/api/categories");
export const createCategory = (data: Partial<Category>) =>
  adminFetch<Category>("/api/admin/categories", { method: "POST", body: JSON.stringify(data) });
export const updateCategory = (id: string, data: Partial<Category>) =>
  adminFetch<Category>(`/api/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteCategory = (id: string) =>
  adminFetch<{ success: boolean }>(`/api/admin/categories/${id}`, { method: "DELETE" });

// Offers
export const listOffers = () => adminFetch<Offer[]>("/api/admin/offers");
export const createOffer = (data: Partial<Offer>) =>
  adminFetch<Offer>("/api/admin/offers", { method: "POST", body: JSON.stringify(data) });
export const updateOffer = (id: string, data: Partial<Offer>) =>
  adminFetch<Offer>(`/api/admin/offers/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteOffer = (id: string) =>
  adminFetch<{ success: boolean }>(`/api/admin/offers/${id}`, { method: "DELETE" });

// Orders
export const listOrders = () => adminFetch<Order[]>("/api/admin/orders");
export const updateOrderStatus = (id: string, status: string) =>
  adminFetch<Order>(`/api/admin/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
export const bulkShipOrders = (ids: string[]) =>
  adminFetch<{ count: number }>("/api/admin/orders/bulk-ship", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
export const deleteOrder = (id: string) =>
  adminFetch<{ success: boolean }>(`/api/admin/orders/${id}`, { method: "DELETE" });
export const createOrder = (data: Record<string, unknown>) =>
  adminFetch<Order>("/api/admin/orders", { method: "POST", body: JSON.stringify(data) });

// Settings
export const updateTheme = (selectedTheme: string) =>
  adminFetch<{ selectedTheme: string }>("/api/admin/settings/theme", {
    method: "PUT",
    body: JSON.stringify({ selectedTheme }),
  });

export const updateCurrencySettings = (settings: CurrencySettings) =>
  adminFetch<CurrencySettings>("/api/admin/settings/currency", {
    method: "PUT",
    body: JSON.stringify(settings),
  });

// Customers & Analytics
export const listCustomers = () => adminFetch<Customer[]>("/api/admin/customers");
export const getAnalytics = () => adminFetch<AnalyticsData>("/api/admin/analytics");

// Import / Export
export const importData = (data: Record<string, unknown>) =>
  adminFetch<{ success: boolean; categories: number; products: number; offers: number; orders: number }>(
    "/api/admin/import",
    { method: "POST", body: JSON.stringify(data) },
  );

// Upload
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch<{ url: string }>("/api/admin/uploads", {
    method: "POST",
    auth: true,
    body: form,
  });
  return res.url;
}
