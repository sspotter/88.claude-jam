import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  listProducts,
  listCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkImportProducts,
  listOrders,
} from "../../lib/api/admin";
import type { Product as ApiProduct, Category as ApiCategory } from "../../lib/api/catalog";
import { handleApiError, OperationType } from "../../lib/api/errors";
import {
  Edit,
  Trash2,
  Plus,
  X,
  Upload,
  Download,
  Image as ImageIcon,
  BarChart2,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { saveProductPrice } from "../../lib/pricing/productPriceService";
import { BASE_CURRENCY } from "../../lib/pricing/constants";
import ProductPriceCell from "../../components/ProductPriceCell";
import { useAmountFormatter } from "../../hooks/usePricing";

type Product = ApiProduct & {
  pricingType?: "per_kg" | "fixed";
  description: string;
  image: string;
};
type Category = Pick<ApiCategory, "id" | "name">;

export default function Products() {
  const { t } = useTranslation();
  const { format: formatAmount } = useAmountFormatter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    price: 0,
    pricingType: "fixed" as "per_kg" | "fixed",
    categoryId: "",
    image: "",
    description: "",
    isAvailable: true,
    stockCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");

  // Performance Modal
  const [viewingPerformanceFor, setViewingPerformanceFor] =
    useState<Product | null>(null);
  const [performanceData, setPerformanceData] = useState<{
    totalRevenue: number;
    unitsSold: number;
    lastSoldDate: number | null;
  } | null>(null);
  const [loadingPerf, setLoadingPerf] = useState(false);

  const fetchCategories = async () => {
    try {
      const cats = await listCategories();
      setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
    } catch (e) {
      handleApiError(e, OperationType.GET, "categories");
    }
  };

  const fetchProducts = async () => {
    try {
      const prods = await listProducts();
      setProducts(
        prods.sort((a, b) => b.createdAt - a.createdAt) as Product[],
      );
    } catch (error) {
      handleApiError(error, OperationType.GET, "products");
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const handleViewPerformance = async (prod: Product) => {
    setViewingPerformanceFor(prod);
    setLoadingPerf(true);
    try {
      const orders = await listOrders();
      let rev = 0;
      let units = 0;
      let lastDate: number | null = null;

      orders.forEach((order) => {
        order.items?.forEach((item) => {
          if (item.productId === prod.id) {
            rev += item.price * item.quantity;
            units += item.quantity;
            if (!lastDate || order.createdAt > lastDate) {
              lastDate = order.createdAt;
            }
          }
        });
      });

      setPerformanceData({
        totalRevenue: rev,
        unitsSold: units,
        lastSoldDate: lastDate,
      });
    } catch (e) {
      handleApiError(e, OperationType.GET, "orders (performance)");
    } finally {
      setLoadingPerf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.categoryId || form.price < 0) return;
    if (!form.price && form.price !== 0) {
      toast.error(t("aed_price_required"));
      return;
    }
    setLoading(true);

    try {
      if (isEditing) {
        await updateProduct(isEditing, form);
        await saveProductPrice(isEditing, BASE_CURRENCY, form.price, true);
        toast.success(t("save") + "!");
      } else {
        const created = await createProduct({
          ...form,
          createdAt: Date.now(),
        });
        await saveProductPrice(created.id, BASE_CURRENCY, form.price, true);
        toast.success(t("save") + "!");
      }
      closeModal();
      await fetchProducts();
    } catch (error: unknown) {
      handleApiError(error, OperationType.WRITE, "products");
      const message = error instanceof Error ? error.message : "";
      toast.error(message || "Error saving product");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setLoading(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dy8n4jopb";
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "Radwan";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || "Cloudinary upload failed");
      }

      const data = await response.json();
      setForm((prev) => ({ ...prev, image: data.secure_url }));
      setImageInputMode("upload");
      toast.success("Image uploaded to Cloudinary");
    } catch (error: any) {
      toast.error(`Error uploading image: ${error?.message || "Unknown error"}`);
      console.error(error);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "products.xlsx");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const productsToImport = data
          .filter((row) => row.name && row.categoryId && row.price !== undefined)
          .map((row) => ({
            name: row.name,
            nameAr: row.nameAr || "",
            price: Number(row.price),
            pricingType: row.pricingType === "per_kg" ? "per_kg" : "fixed",
            categoryId: row.categoryId,
            image: row.image || "",
            description: row.description || "",
            isAvailable:
              row.isAvailable !== undefined ? Boolean(row.isAvailable) : true,
            stockCount:
              row.stockCount !== undefined ? Number(row.stockCount) : 0,
            createdAt: Date.now(),
          }));

        const result = await bulkImportProducts(productsToImport);
        toast.success(`Imported ${result.count} products`);
        await fetchProducts();
      } catch (error) {
        console.error(error);
        toast.error("Error importing products");
      } finally {
        setLoading(false);
        if (importInputRef.current) importInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await deleteProduct(id);
      toast.success(t("delete") + "!");
      await fetchProducts();
    } catch (error) {
      handleApiError(error, OperationType.DELETE, "products");
      toast.error("Error deleting product");
    }
  };

  const startEdit = (prod: Product) => {
    setIsEditing(prod.id);
    setForm({
      name: prod.name,
      nameAr: prod.nameAr || "",
      price: prod.price,
      pricingType: prod.pricingType ?? "fixed",
      categoryId: prod.categoryId,
      image: prod.image,
      description: prod.description,
      isAvailable: prod.isAvailable,
      stockCount: prod.stockCount || 0,
    });
    setImageInputMode("upload");
    setShowModal(true);
  };

  const openNew = () => {
    setIsEditing(null);
    setForm({
      name: "",
      nameAr: "",
      price: 0,
      pricingType: "fixed",
      categoryId: categories.length > 0 ? categories[0].id : "",
      image: "",
      description: "",
      isAvailable: true,
      stockCount: 0,
    });
    setImageInputMode("upload");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(null);
  };

  const getCatName = (id: string) =>
    categories.find((c) => c.id === id)?.name || "Unknown";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-serif text-[var(--color-primary)]">
          {t("manage_products")}
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl font-medium flex items-center gap-2 transition-colors border border-stone-200"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export XLS</span>
          </button>

          <button
            onClick={() => importInputRef.current?.click()}
            className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl font-medium flex items-center gap-2 transition-colors border border-stone-200"
            disabled={loading}
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import XLS</span>
          </button>
          <input
            type="file"
            ref={importInputRef}
            onChange={handleImport}
            accept=".xlsx, .xls"
            className="hidden"
          />

          <button
            onClick={openNew}
            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-xl font-medium hover:bg-[var(--color-accent)] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t("add_product")}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="p-4 font-medium text-stone-600">{t("name")}</th>
                <th className="p-4 font-medium text-stone-600">
                  {t("category")}
                </th>
                <th className="p-4 font-medium text-stone-600">{t("price")}</th>
                <th className="p-4 font-medium text-stone-600">Stock</th>
                <th className="p-4 font-medium text-stone-600">
                  {t("available")}
                </th>
                <th className="p-4 font-medium text-stone-600 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map((prod) => (
                <tr
                  key={prod.id}
                  className="hover:bg-stone-50 transition-colors"
                >
                  <td className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-stone-200 overflow-hidden shrink-0">
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-[var(--color-primary)]">
                        {prod.name}
                      </span>
                      {prod.nameAr && (
                        <span className="text-sm text-stone-500">
                          {prod.nameAr}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-stone-600">
                    {getCatName(prod.categoryId)}
                  </td>
                  <td className="p-4 font-medium text-[var(--color-primary)]">
                    <ProductPriceCell productId={prod.id} basePrice={prod.price} />
                  </td>
                  <td className="p-4 text-stone-600 font-medium">
                    {(prod.stockCount || 0) <= 5 ? (
                      <span className="text-red-600">
                        {prod.stockCount || 0} (Low)
                      </span>
                    ) : (
                      <span>{prod.stockCount || 0}</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${prod.isAvailable && (prod.stockCount || 0) > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {prod.isAvailable && (prod.stockCount || 0) > 0
                        ? "Yes"
                        : "No"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleViewPerformance(prod)}
                        className="p-2 text-stone-400 hover:text-[var(--color-accent)] transition-colors"
                        title="Performance"
                      >
                        <BarChart2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => startEdit(prod)}
                        className="p-2 text-stone-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id)}
                        className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <div className="text-center py-10 text-stone-500">
              No products found.
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-stone-100">
              <h2 className="text-2xl font-serif text-[var(--color-primary)]">
                {isEditing ? t("edit") : t("add_product")}
              </h2>
              <button
                onClick={closeModal}
                className="text-stone-400 hover:text-[var(--color-primary)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto flex-grow space-y-4"
            >
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    {t("name")} (EN)
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    {t("name")} (AR)
                  </label>
                  <input
                    type="text"
                    value={form.nameAr}
                    onChange={(e) =>
                      setForm({ ...form, nameAr: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    {form.pricingType === "per_kg"
                      ? t("price_per_kg")
                      : t("price")}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    {t("pricing_type")}
                  </label>
                  <select
                    value={form.pricingType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pricingType: e.target.value as "per_kg" | "fixed",
                      })
                    }
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
                  >
                    <option value="fixed">{t("pricing_type_fixed")}</option>
                    <option value="per_kg">{t("pricing_type_per_kg")}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    {t("category")}
                  </label>
                  <select
                    required
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm({ ...form, categoryId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t("image")}
                </label>
                {/* Tab toggle */}
                <div className="flex rounded-xl border border-stone-200 overflow-hidden mb-3">
                  <button
                    type="button"
                    onClick={() => setImageInputMode("upload")}
                    className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${imageInputMode === "upload" ? "bg-[var(--color-primary)] text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode("url")}
                    className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${imageInputMode === "url" ? "bg-[var(--color-primary)] text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
                  >
                    <LinkIcon className="w-4 h-4" />
                    URL Link
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {form.image && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                      <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {imageInputMode === "upload" ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-600 hover:bg-stone-50 hover:border-[var(--color-accent)] transition-colors"
                    >
                      <ImageIcon className="w-5 h-5" />
                      <span>{loading ? "Uploading..." : "Choose Image"}</span>
                    </button>
                  ) : (
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={form.image}
                      onChange={(e) => setForm({ ...form, image: e.target.value })}
                      className="flex-1 px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none text-sm"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t("description")}
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
                ></textarea>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Stock Count
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={form.stockCount}
                    onChange={(e) =>
                      setForm({ ...form, stockCount: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex-1 flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="avail"
                    checked={form.isAvailable}
                    onChange={(e) =>
                      setForm({ ...form, isAvailable: e.target.checked })
                    }
                    className="w-5 h-5 text-[var(--color-accent)] rounded focus:ring-[var(--color-accent)]"
                  />
                  <label
                    htmlFor="avail"
                    className="text-sm font-medium text-stone-700"
                  >
                    {t("available")}
                  </label>
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-stone-100 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
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

      {/* Performance Modal */}
      {viewingPerformanceFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-stone-100">
              <h2 className="text-xl font-serif text-[var(--color-primary)]">
                Performance: {viewingPerformanceFor.name}
              </h2>
              <button
                onClick={() => setViewingPerformanceFor(null)}
                className="text-stone-400 hover:text-[var(--color-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {loadingPerf ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : performanceData ? (
                <div className="space-y-4">
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex justify-between items-center">
                    <span className="text-stone-600 font-medium">
                      Revenue Generated
                    </span>
                    <span className="text-xl font-serif font-bold text-[var(--color-primary)]">
                      {formatAmount(performanceData.totalRevenue)}
                    </span>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex justify-between items-center">
                    <span className="text-stone-600 font-medium">
                      Units Sold
                    </span>
                    <span className="text-xl font-serif font-bold text-[var(--color-primary)]">
                      {performanceData.unitsSold}
                    </span>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex justify-between items-center">
                    <span className="text-stone-600 font-medium">
                      Last Sold Date
                    </span>
                    <span className="text-stone-800 font-medium">
                      {performanceData.lastSoldDate
                        ? new Date(
                            performanceData.lastSoldDate,
                          ).toLocaleString()
                        : "Never"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-stone-500 text-center">No data found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
