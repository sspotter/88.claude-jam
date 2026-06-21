import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import prisma from "../config/prisma.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { emitOrderStatus } from "../lib/orderEvents.js";
import {
  serializeProduct,
  serializeCategory,
  serializeOffer,
  serializeOrder,
} from "../lib/serialize.js";
import {
  CurrencySettingsValidationError,
  normalizeCurrencySettings,
  normalizeBaseCurrency,
} from "../services/currencySettings.js";
import { recordAudit, listAuditLogs } from "../services/audit.service.js";

const router = Router();

function auditActor(req: Request) {
  return { actorId: req.admin!.adminId, actorEmail: req.admin!.email };
}

// Every route in this file requires a valid admin JWT. This middleware is the
// replacement for the firestore.rules `isAdmin()` checks.
router.use(requireAdmin);

const ALLOWED_STATUSES = ["pending", "shipped", "paid", "failed"] as const;

/* ----------------------------- Products ----------------------------- */

router.post("/products", async (req: Request, res: Response) => {
  try {
    const { name, nameAr, price, categoryId, isAvailable, stockCount, image, pricingType, description } = req.body;
    if (!name || price == null || !categoryId) {
      return res.status(400).json({ error: "name, price and categoryId are required." });
    }
    const product = await prisma.product.create({
      data: {
        name,
        nameAr: nameAr ?? null,
        price: Number(price),
        categoryId,
        isAvailable: isAvailable ?? true,
        stockCount: stockCount != null ? Math.floor(Number(stockCount)) : 0,
        image: image ?? null,
        pricingType: pricingType ?? null,
        description: description ?? null,
      },
    });
    await recordAudit({ ...auditActor(req), action: "create", entity: "product", entityId: product.id, before: null, after: serializeProduct(product) });
    return res.status(201).json(serializeProduct(product));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create product." });
  }
});

router.put("/products/:id", async (req: Request, res: Response) => {
  try {
    const { name, nameAr, price, categoryId, isAvailable, stockCount, image, pricingType, description } = req.body;
    const prev = await prisma.product.findUnique({ where: { id: req.params.id } });
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(price !== undefined && { price: Number(price) }),
        ...(categoryId !== undefined && { categoryId }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(stockCount !== undefined && { stockCount: Math.floor(Number(stockCount)) }),
        ...(image !== undefined && { image }),
        ...(pricingType !== undefined && { pricingType }),
        ...(description !== undefined && { description }),
      },
    });
    await recordAudit({ ...auditActor(req), action: "update", entity: "product", entityId: req.params.id, before: prev ? serializeProduct(prev) : null, after: serializeProduct(product) });
    return res.json(serializeProduct(product));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update product." });
  }
});

router.delete("/products/:id", async (req: Request, res: Response) => {
  try {
    const prev = await prisma.product.findUnique({ where: { id: req.params.id } });
    await prisma.product.delete({ where: { id: req.params.id } });
    await recordAudit({ ...auditActor(req), action: "delete", entity: "product", entityId: req.params.id, before: prev ? serializeProduct(prev) : null, after: null });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to delete product." });
  }
});

// Bulk import (XLSX upload parsed on the client into an array of products).
router.post("/products/bulk", async (req: Request, res: Response) => {
  try {
    const items: any[] = Array.isArray(req.body?.products) ? req.body.products : [];
    if (items.length === 0) return res.status(400).json({ error: "No products provided." });

    const created = await prisma.$transaction(
      items.map((p) =>
        prisma.product.create({
          data: {
            name: String(p.name),
            nameAr: p.nameAr ?? null,
            price: Number(p.price),
            categoryId: String(p.categoryId),
            isAvailable: p.isAvailable ?? true,
            stockCount: p.stockCount != null ? Math.floor(Number(p.stockCount)) : 0,
            image: p.image ?? null,
            description: p.description ?? null,
          },
        })
      )
    );
    return res.status(201).json({ count: created.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to import products." });
  }
});

// Inventory: update stock count only.
router.patch("/products/:id/stock", async (req: Request, res: Response) => {
  try {
    const stockCount = Math.floor(Number(req.body?.stockCount));
    if (isNaN(stockCount) || stockCount < 0) {
      return res.status(400).json({ error: "Invalid stockCount." });
    }
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { stockCount },
    });
    return res.json(serializeProduct(product));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update stock." });
  }
});

/* ----------------------------- Categories ----------------------------- */

router.post("/categories", async (req: Request, res: Response) => {
  try {
    const { name, nameAr, image, isHidden } = req.body;
    if (!name) return res.status(400).json({ error: "name is required." });
    const category = await prisma.category.create({
      data: {
        name,
        nameAr: nameAr ?? null,
        image: image ?? null,
        isHidden: isHidden ?? false,
      },
    });
    await recordAudit({ ...auditActor(req), action: "create", entity: "category", entityId: category.id, before: null, after: serializeCategory(category) });
    return res.status(201).json(serializeCategory(category));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create category." });
  }
});

router.put("/categories/:id", async (req: Request, res: Response) => {
  try {
    const { name, nameAr, image, isHidden } = req.body;
    const prev = await prisma.category.findUnique({ where: { id: req.params.id } });
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(image !== undefined && { image }),
        ...(isHidden !== undefined && { isHidden }),
      },
    });
    await recordAudit({ ...auditActor(req), action: "update", entity: "category", entityId: req.params.id, before: prev ? serializeCategory(prev) : null, after: serializeCategory(category) });
    return res.json(serializeCategory(category));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update category." });
  }
});

router.delete("/categories/:id", async (req: Request, res: Response) => {
  try {
    const prev = await prisma.category.findUnique({ where: { id: req.params.id } });
    await prisma.category.delete({ where: { id: req.params.id } });
    await recordAudit({ ...auditActor(req), action: "delete", entity: "category", entityId: req.params.id, before: prev ? serializeCategory(prev) : null, after: null });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to delete category." });
  }
});

/* ----------------------------- Offers ----------------------------- */

router.get("/offers", async (_req: Request, res: Response) => {
  try {
    const offers = await prisma.offer.findMany({ orderBy: { createdAt: "desc" } });
    return res.json(offers.map(serializeOffer));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch offers." });
  }
});

router.post("/offers", async (req: Request, res: Response) => {
  try {
    const { title, description, discountPercentage, isActive } = req.body;
    if (!title || discountPercentage == null) {
      return res.status(400).json({ error: "title and discountPercentage are required." });
    }
    const offer = await prisma.offer.create({
      data: {
        title,
        description: description ?? null,
        discountPercentage: Number(discountPercentage),
        isActive: isActive ?? true,
      },
    });
    await recordAudit({ ...auditActor(req), action: "create", entity: "offer", entityId: offer.id, before: null, after: serializeOffer(offer) });
    return res.status(201).json(serializeOffer(offer));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create offer." });
  }
});

router.put("/offers/:id", async (req: Request, res: Response) => {
  try {
    const { title, description, discountPercentage, isActive } = req.body;
    const prev = await prisma.offer.findUnique({ where: { id: req.params.id } });
    const offer = await prisma.offer.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(discountPercentage !== undefined && { discountPercentage: Number(discountPercentage) }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    await recordAudit({ ...auditActor(req), action: "update", entity: "offer", entityId: req.params.id, before: prev ? serializeOffer(prev) : null, after: serializeOffer(offer) });
    return res.json(serializeOffer(offer));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update offer." });
  }
});

router.delete("/offers/:id", async (req: Request, res: Response) => {
  try {
    const prev = await prisma.offer.findUnique({ where: { id: req.params.id } });
    await prisma.offer.delete({ where: { id: req.params.id } });
    await recordAudit({ ...auditActor(req), action: "delete", entity: "offer", entityId: req.params.id, before: prev ? serializeOffer(prev) : null, after: null });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to delete offer." });
  }
});

/* ----------------------------- Orders ----------------------------- */

router.get("/orders", async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    return res.json(orders.map(serializeOrder));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch orders." });
  }
});

router.patch("/orders/:id/status", async (req: Request, res: Response) => {
  try {
    const status = String(req.body?.status);
    if (!ALLOWED_STATUSES.includes(status as any)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { items: true },
    });
    emitOrderStatus({ orderId: order.id, status: order.status });
    return res.json(serializeOrder(order));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update order status." });
  }
});

router.post("/orders/bulk-ship", async (req: Request, res: Response) => {
  try {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) return res.status(400).json({ error: "No order ids provided." });
    const result = await prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { status: "shipped" },
    });
    ids.forEach((id) => emitOrderStatus({ orderId: id, status: "shipped" }));
    return res.json({ count: result.count });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to bulk-ship orders." });
  }
});

router.delete("/orders/:id", async (req: Request, res: Response) => {
  try {
    await prisma.order.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to delete order." });
  }
});

// Manual order creation from the admin Orders page.
router.post("/orders", async (req: Request, res: Response) => {
  try {
    const b = req.body;
    if (!b?.customerName || !b?.phone || !Array.isArray(b?.items)) {
      return res.status(400).json({ error: "customerName, phone and items are required." });
    }
    const order = await prisma.order.create({
      data: {
        customerName: b.customerName,
        phone: b.phone,
        address: b.address ?? "",
        notes: b.notes ?? "",
        totalPrice: Number(b.totalPrice) || 0,
        paymentMethod: b.paymentMethod ?? "whatsapp",
        status: b.status && ALLOWED_STATUSES.includes(b.status) ? b.status : "pending",
        couponCode: b.coupon?.code ?? null,
        couponDiscountPercentage: b.coupon?.discountPercentage ?? null,
        items: {
          create: (b.items as any[]).map((i) => ({
            productId: String(i.productId),
            name: String(i.name),
            price: Number(i.price),
            quantity: Math.floor(Number(i.quantity)),
          })),
        },
      },
      include: { items: true },
    });
    return res.status(201).json(serializeOrder(order));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create order." });
  }
});

/* ----------------------------- Settings ----------------------------- */

router.put("/settings/theme", async (req: Request, res: Response) => {
  try {
    const selectedTheme = String(req.body?.selectedTheme ?? "");
    if (!selectedTheme) return res.status(400).json({ error: "selectedTheme is required." });
    await prisma.setting.upsert({
      where: { id: "theme" },
      update: { value: { selectedTheme } },
      create: { id: "theme", value: { selectedTheme } },
    });
    return res.json({ selectedTheme });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update theme." });
  }
});

router.put("/settings/font", async (req: Request, res: Response) => {
  try {
    const selectedFont = String(req.body?.selectedFont ?? "");
    if (!selectedFont) return res.status(400).json({ error: "selectedFont is required." });
    await prisma.setting.upsert({
      where: { id: "font" },
      update: { value: { selectedFont } },
      create: { id: "font", value: { selectedFont } },
    });
    return res.json({ selectedFont });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update font." });
  }
});


router.put("/settings/currency", async (req: Request, res: Response) => {
  try {
    const before = (await prisma.setting.findUnique({ where: { id: "currency_settings" } }))?.value ?? null;
    const value = normalizeCurrencySettings(req.body);
    await prisma.setting.upsert({
      where: { id: "currency_settings" },
      update: { value: value as any },
      create: { id: "currency_settings", value: value as any },
    });
    await recordAudit({ ...auditActor(req), action: "update", entity: "currency_settings", entityId: "currency_settings", before, after: value });
    return res.json(value);
  } catch (error: any) {
    // Validation errors -> 400; anything else (e.g. DB failure) -> 500.
    const isValidation = error instanceof CurrencySettingsValidationError;
    return res.status(isValidation ? 400 : 500).json({
      error: error.message || "Failed to save currency settings.",
    });
  }
});

router.put("/settings/base-currency", async (req: Request, res: Response) => {
  try {
    const before = (await prisma.setting.findUnique({ where: { id: "base_currency" } }))?.value ?? null;
    const value = normalizeBaseCurrency(req.body);
    await prisma.setting.upsert({
      where: { id: "base_currency" },
      update: { value: value as any },
      create: { id: "base_currency", value: value as any },
    });
    await recordAudit({ ...auditActor(req), action: "update", entity: "base_currency", entityId: "base_currency", before, after: value });
    return res.json(value);
  } catch (error: any) {
    const isValidation = error instanceof CurrencySettingsValidationError;
    return res.status(isValidation ? 400 : 500).json({
      error: error.message || "Failed to save base currency.",
    });
  }
});

/* ----------------------------- Customers & Analytics ----------------------------- */

// Aggregate the orders table into a customer list keyed by phone.
router.get("/customers", async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
    const byPhone = new Map<string, any>();
    for (const o of orders) {
      const key = o.phone;
      const existing = byPhone.get(key);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += o.totalPrice;
        existing.lastOrderAt = Math.max(existing.lastOrderAt, o.createdAt.getTime());
      } else {
        byPhone.set(key, {
          phone: o.phone,
          name: o.customerName,
          address: o.address,
          orderCount: 1,
          totalSpent: o.totalPrice,
          lastOrderAt: o.createdAt.getTime(),
        });
      }
    }
    return res.json(Array.from(byPhone.values()));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch customers." });
  }
});

// Raw data for the Dashboard and Analytics pages (they compute KPIs client-side).
router.get("/analytics", async (_req: Request, res: Response) => {
  try {
    const [products, categories, orders] = await Promise.all([
      prisma.product.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } }),
    ]);
    return res.json({
      products: products.map(serializeProduct),
      categories: categories.map(serializeCategory),
      orders: orders.map(serializeOrder),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch analytics." });
  }
});

/* ----------------------------- Import (Mega Import) ----------------------------- */

// Accepts a parsed Mega Export (the sheets the Settings page exports) and
// restores it. Upserts by original id in FK-safe order: categories -> products
// -> offers -> orders, so product.categoryId references resolve. Existing rows
// with the same id are updated (idempotent re-import).
function parseDate(v: unknown): Date {
  if (v == null || v === "") return new Date();
  const n = Number(v);
  if (!isNaN(n) && n > 0) return new Date(n); // epoch ms
  const d = new Date(String(v)); // locale string (e.g. orders sheet)
  return isNaN(d.getTime()) ? new Date() : d;
}

router.post("/import", async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const categories: any[] = Array.isArray(body.categories) ? body.categories : [];
    const products: any[] = Array.isArray(body.products) ? body.products : [];
    const offers: any[] = Array.isArray(body.offers) ? body.offers : [];
    const orders: any[] = Array.isArray(body.orders) ? body.orders : [];

    const counts = { categories: 0, products: 0, offers: 0, orders: 0, skipped: [] as string[] };

    // 1. Categories (must exist before products reference them).
    for (const c of categories) {
      if (!c.id || !c.name) continue;
      const data = {
        name: String(c.name),
        nameAr: c.nameAr || null,
        image: c.image || null,
        isHidden: c.isHidden ?? false,
        createdAt: parseDate(c.createdAt),
      };
      await prisma.category.upsert({ where: { id: String(c.id) }, update: data, create: { id: String(c.id), ...data } });
      counts.categories++;
    }

    // Set of valid category ids (existing + just-imported) to guard product FKs.
    const validCategoryIds = new Set((await prisma.category.findMany({ select: { id: true } })).map((c) => c.id));

    // 2. Products.
    for (const p of products) {
      if (!p.id || !p.name) continue;
      if (!p.categoryId || !validCategoryIds.has(String(p.categoryId))) {
        counts.skipped.push(`product "${p.name}" (missing/unknown categoryId)`);
        continue;
      }
      const data = {
        name: String(p.name),
        nameAr: p.nameAr || null,
        price: Number(p.price) || 0,
        categoryId: String(p.categoryId),
        isAvailable: p.isAvailable ?? true,
        stockCount: p.stockCount != null ? Math.floor(Number(p.stockCount)) : 0,
        image: p.image || null,
        pricingType: p.pricingType || null,
        description: p.description || null,
        createdAt: parseDate(p.createdAt),
      };
      await prisma.product.upsert({ where: { id: String(p.id) }, update: data, create: { id: String(p.id), ...data } });
      counts.products++;
    }

    // 3. Offers.
    for (const o of offers) {
      if (!o.id || !o.title) continue;
      const data = {
        title: String(o.title),
        description: o.description || null,
        discountPercentage: Number(o.discountPercentage) || 0,
        isActive: o.isActive ?? true,
        createdAt: parseDate(o.createdAt),
      };
      await prisma.offer.upsert({ where: { id: String(o.id) }, update: data, create: { id: String(o.id), ...data } });
      counts.offers++;
    }

    // 4. Orders (header-level; the export flattens items to a count, so line
    //    items cannot be restored from this format).
    for (const o of orders) {
      if (!o.id) continue;
      const data = {
        customerName: String(o.customerName || ""),
        phone: String(o.phone || ""),
        address: String(o.address || ""),
        notes: o.notes || null,
        totalPrice: Number(o.totalPrice) || 0,
        paymentMethod: String(o.paymentMethod || "whatsapp"),
        status: String(o.status || "pending"),
        couponCode: o.couponCode || null,
        couponDiscountPercentage: o.couponDiscount != null ? Number(o.couponDiscount) : null,
        createdAt: parseDate(o.createdAt),
      };
      await prisma.order.upsert({ where: { id: String(o.id) }, update: data, create: { id: String(o.id), ...data } });
      counts.orders++;
    }

    return res.json({ success: true, ...counts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to import data." });
  }
});

/* ----------------------------- Pricing (currency_rates, product_prices) ----------------------------- */

type CurrencyRateRow = {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  provider: string;
  syncedAt: number;
  createdAt: number;
  updatedAt: number;
};

type ProductPriceRow = {
  productId: string;
  currencyCode: string;
  price: number;
  isManual: boolean;
  createdAt: number;
  updatedAt: number;
};

type ProductWeightRow = {
  productId: string;
  visibleWeights: string[];
  weightOverrides: Record<string, number>;
};

async function getPricingSetting<T>(id: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { id } });
  return (row?.value as T) ?? fallback;
}

router.get("/pricing/rates", async (_req: Request, res: Response) => {
  try {
    const data = await getPricingSetting("currency_rates", {
      rates: [] as CurrencyRateRow[],
      syncMeta: { lastSyncAt: null, provider: null, status: null },
    });
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch currency rates." });
  }
});

router.put("/pricing/rates", async (req: Request, res: Response) => {
  try {
    const before = (await prisma.setting.findUnique({ where: { id: "currency_rates" } }))?.value ?? null;
    const rates: CurrencyRateRow[] = Array.isArray(req.body?.rates) ? req.body.rates : [];
    const syncMeta = req.body?.syncMeta ?? {};
    await prisma.setting.upsert({
      where: { id: "currency_rates" },
      update: { value: { rates, syncMeta } },
      create: { id: "currency_rates", value: { rates, syncMeta } },
    });
    await recordAudit({ ...auditActor(req), action: "update", entity: "currency_rates", entityId: "currency_rates", before, after: { rates, syncMeta } });
    return res.json({ success: true, ratesUpdated: rates.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to save currency rates." });
  }
});

router.get("/pricing/product-prices", async (req: Request, res: Response) => {
  try {
    const productId = req.query.productId as string | undefined;
    const data = await getPricingSetting("product_prices", { prices: [] as ProductPriceRow[] });
    const prices = productId
      ? data.prices.filter((p) => p.productId === productId)
      : data.prices;
    return res.json({ prices });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch product prices." });
  }
});

router.put("/pricing/product-prices", async (req: Request, res: Response) => {
  try {
    const incoming: ProductPriceRow[] = Array.isArray(req.body?.prices) ? req.body.prices : [];
    const data = await getPricingSetting("product_prices", { prices: [] as ProductPriceRow[] });
    const beforePrices = { prices: data.prices };
    const byKey = new Map(data.prices.map((p) => [`${p.productId}_${p.currencyCode}`, p]));
    for (const p of incoming) {
      byKey.set(`${p.productId}_${p.currencyCode}`, p);
    }
    const prices = Array.from(byKey.values());
    await prisma.setting.upsert({
      where: { id: "product_prices" },
      update: { value: { prices } },
      create: { id: "product_prices", value: { prices } },
    });
    await recordAudit({ ...auditActor(req), action: "update", entity: "product_prices", entityId: "product_prices", before: beforePrices, after: { prices } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to save product prices." });
  }
});

router.delete("/pricing/product-prices", async (req: Request, res: Response) => {
  try {
    const { productId, currencyCode } = req.body ?? {};
    if (!productId || !currencyCode) {
      return res.status(400).json({ error: "productId and currencyCode are required." });
    }
    const data = await getPricingSetting("product_prices", { prices: [] as ProductPriceRow[] });
    const beforePrices = { prices: data.prices };
    const prices = data.prices.filter(
      (p) => !(p.productId === productId && p.currencyCode === currencyCode),
    );
    await prisma.setting.upsert({
      where: { id: "product_prices" },
      update: { value: { prices } },
      create: { id: "product_prices", value: { prices } },
    });
    await recordAudit({ ...auditActor(req), action: "delete", entity: "product_prices", entityId: "product_prices", before: beforePrices, after: { prices } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to delete product price." });
  }
});

router.get("/pricing/product-weights", async (req: Request, res: Response) => {
  try {
    const productId = req.query.productId as string | undefined;
    const data = await getPricingSetting("product_weights", { configs: [] as ProductWeightRow[] });
    const configs = productId
      ? data.configs.filter((c) => c.productId === productId)
      : data.configs;
    return res.json({ configs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch product weights." });
  }
});

router.put("/pricing/product-weights", async (req: Request, res: Response) => {
  try {
    const incoming = req.body?.config as ProductWeightRow | undefined;
    if (!incoming?.productId) {
      return res.status(400).json({ error: "config.productId is required." });
    }
    const data = await getPricingSetting("product_weights", { configs: [] as ProductWeightRow[] });
    const before = { configs: data.configs };
    const byId = new Map(data.configs.map((c) => [c.productId, c]));
    byId.set(incoming.productId, {
      productId: incoming.productId,
      visibleWeights: Array.isArray(incoming.visibleWeights) ? incoming.visibleWeights : [],
      weightOverrides: incoming.weightOverrides ?? {},
    });
    const configs = Array.from(byId.values());
    await prisma.setting.upsert({
      where: { id: "product_weights" },
      update: { value: { configs } },
      create: { id: "product_weights", value: { configs } },
    });
    await recordAudit({ ...auditActor(req), action: "update", entity: "product_weights", entityId: incoming.productId, before, after: { configs } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to save product weights." });
  }
});

/* ----------------------------- Audit Logs ----------------------------- */

router.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const { entity, action, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await listAuditLogs({ entity, action, limit, offset });
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch audit logs." });
  }
});

/* ----------------------------- Uploads ----------------------------- */

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image uploads are allowed."));
  },
});

// POST /api/admin/uploads (multipart, field name "file") -> { url }
router.post("/uploads", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const url = `${base.replace(/\/$/, "")}/uploads/${req.file.filename}`;
  return res.status(201).json({ url });
});

export default router;
