import { apiFetch } from "./client.js";
import type { CurrencySettings } from "../../types/pricing";

export interface Category {
  id: string;
  name: string;
  nameAr?: string;
  image?: string;
  isHidden?: boolean;
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  nameAr?: string;
  price: number;
  categoryId: string;
  isAvailable: boolean;
  stockCount: number;
  image?: string;
  pricingType?: string;
  description?: string;
  createdAt: number;
}

export interface Offer {
  id: string;
  title: string;
  description?: string;
  discountPercentage: number;
  isActive: boolean;
  createdAt: number;
}

export interface ThemeSettings {
  selectedTheme: string | null;
}

export interface FontSettings {
  selectedFont: string | null;
}

export interface LanguageSettings {
  defaultLanguage: string;
}

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/api/categories");
}

export function getCategory(id: string): Promise<Category> {
  return apiFetch<Category>(`/api/categories/${id}`);
}

export function getProducts(params?: { categoryId?: string; limit?: number }): Promise<Product[]> {
  const qs = new URLSearchParams();
  if (params?.categoryId) qs.set("categoryId", params.categoryId);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return apiFetch<Product[]>(`/api/products${q ? `?${q}` : ""}`);
}

export function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/api/products/${id}`);
}

export function validateCoupon(code: string): Promise<{
  valid: boolean;
  code?: string;
  discountPercentage?: number;
  error?: string;
}> {
  return apiFetch(`/api/coupons/validate?code=${encodeURIComponent(code)}`);
}

export function getTheme(): Promise<ThemeSettings> {
  return apiFetch<ThemeSettings>("/api/settings/theme");
}

export function getFont(): Promise<FontSettings> {
  return apiFetch<FontSettings>("/api/settings/font");
}

export function getLanguageSettings(): Promise<LanguageSettings> {
  return apiFetch<LanguageSettings>("/api/settings/language");
}

export function getCurrencySettings(): Promise<CurrencySettings> {
  return apiFetch<CurrencySettings>("/api/settings/currency");
}

