import { Router, Request, Response } from "express";
import prisma from "../config/prisma.js";
import {
  serializeProduct,
  serializeCategory,
  serializeOffer,
} from "../lib/serialize.js";
import { DEFAULT_CURRENCY_SETTINGS } from "../services/currencySettings.js";

// Public storefront reads. These replace the direct Firestore queries the
// frontend used to run from the browser (Home, CategoryView, ProductView,
// Cart coupon validation, App/Settings theme read).
const router = Router();

/**
 * GET /api/products?categoryId=&limit=
 * Default order: createdAt desc (matches the old Firestore query).
 */
router.get("/products", async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const limit = req.query.limit ? Math.max(0, parseInt(req.query.limit as string, 10)) : undefined;

    const products = await prisma.product.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit && limit > 0 ? limit : undefined,
    });
    return res.json(products.map(serializeProduct));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch products." });
  }
});

/**
 * GET /api/products/:id
 */
router.get("/products/:id", async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: "Product not found." });
    return res.json(serializeProduct(product));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch product." });
  }
});

/**
 * GET /api/categories
 * Order: createdAt asc (matches the old Firestore query for categories).
 */
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { createdAt: "asc" } });
    return res.json(categories.map(serializeCategory));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch categories." });
  }
});

/**
 * GET /api/categories/:id
 */
router.get("/categories/:id", async (req: Request, res: Response) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) return res.status(404).json({ error: "Category not found." });
    return res.json(serializeCategory(category));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch category." });
  }
});

/**
 * GET /api/coupons/validate?code=
 * Replaces the Cart.tsx Firestore coupon query. Returns the coupon if active.
 */
router.get("/coupons/validate", async (req: Request, res: Response) => {
  try {
    const code = (req.query.code as string | undefined)?.trim();
    if (!code) return res.status(400).json({ error: "Missing coupon code." });

    const offer = await prisma.offer.findFirst({ where: { title: code, isActive: true } });
    if (!offer) {
      return res.status(404).json({ valid: false, error: "Invalid or inactive coupon." });
    }
    return res.json({
      valid: true,
      code: offer.title,
      discountPercentage: offer.discountPercentage,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to validate coupon." });
  }
});

/**
 * GET /api/settings/theme
 * Replaces the App.tsx + Settings.tsx Firestore read of settings/theme.
 */
router.get("/settings/theme", async (_req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { id: "theme" } });
    const value = (setting?.value as { selectedTheme?: string } | null) ?? null;
    return res.json({ selectedTheme: value?.selectedTheme ?? null });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch theme." });
  }
});

/**
 * GET /api/pricing/rates — public read for storefront currency conversion.
 */
router.get("/pricing/rates", async (_req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { id: "currency_rates" } });
    const value = (setting?.value as { rates?: unknown[]; syncMeta?: unknown } | null) ?? {
      rates: [],
      syncMeta: { lastSyncAt: null, provider: null, status: null },
    };
    return res.json(value);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch currency rates." });
  }
});

/**
 * GET /api/settings/currency — public read for storefront currency availability.
 */
router.get("/settings/currency", async (_req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { id: "currency_settings" } });
    const value = (setting?.value as typeof DEFAULT_CURRENCY_SETTINGS | null) ?? DEFAULT_CURRENCY_SETTINGS;
    return res.json(value);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch currency settings." });
  }
});

/**
 * GET /api/pricing/product-prices?productId=
 */
router.get("/pricing/product-prices", async (req: Request, res: Response) => {
  try {
    const productId = req.query.productId as string | undefined;
    const setting = await prisma.setting.findUnique({ where: { id: "product_prices" } });
    const all = ((setting?.value as { prices?: { productId: string }[] } | null)?.prices) ?? [];
    const prices = productId ? all.filter((p) => p.productId === productId) : all;
    return res.json({ prices });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch product prices." });
  }
});

export default router;
