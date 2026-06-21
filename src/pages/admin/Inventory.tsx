import { useEffect, useState } from "react";
import { listProducts, updateProductStock } from "../../lib/api/admin";
import type { Product as ApiProduct } from "../../lib/api/catalog";
import { handleApiError, OperationType } from "../../lib/api/errors";
import { toast } from "sonner";
import { AlertCircle, CheckCircle } from "lucide-react";
import ProductPriceCell from "../../components/ProductPriceCell";

type Product = Pick<ApiProduct, "id" | "name" | "price" | "stockCount" | "isAvailable" | "categoryId">;

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<number>(0);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setLoading(true);
    try {
      const prods = await listProducts();
      setProducts(prods);
    } catch (e) {
      handleApiError(e, OperationType.GET, "products");
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStock = async (id: string) => {
    try {
      if (editStock < 0) return;
      await updateProductStock(id, editStock);
      setProducts(
        products.map((p) =>
          p.id === id ? { ...p, stockCount: editStock } : p,
        ),
      );
      setEditingId(null);
      toast.success("Stock updated");
    } catch (e) {
      handleApiError(e, OperationType.UPDATE, "products");
      toast.error("Failed to update stock");
    }
  };

  const filteredProducts = products.filter((p) => {
    if (filter === "low") return p.stockCount > 0 && p.stockCount <= 5;
    if (filter === "out") return p.stockCount === 0;
    return true;
  });

  if (loading)
    return <div className="text-stone-500 py-10">Loading inventory...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-serif text-[var(--color-primary)]">
          Inventory Management
        </h1>
        <div className="flex gap-2 bg-stone-200 p-1 rounded-lg">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${filter === "all" ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-stone-500 hover:text-stone-700"}`}
          >
            All Stock
          </button>
          <button
            onClick={() => setFilter("low")}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${filter === "low" ? "bg-white shadow-sm text-yellow-600" : "text-stone-500 hover:text-stone-700"}`}
          >
            Low Stock
          </button>
          <button
            onClick={() => setFilter("out")}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${filter === "out" ? "bg-white shadow-sm text-red-600" : "text-stone-500 hover:text-stone-700"}`}
          >
            Out of Stock
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100 text-sm">
                <th className="p-4 font-medium text-stone-600">Product</th>
                <th className="p-4 font-medium text-stone-600">Price</th>
                <th className="p-4 font-medium text-stone-600">Status</th>
                <th className="p-4 font-medium text-stone-600">Stock Count</th>
                <th className="p-4 font-medium text-stone-600 w-32">
                  Quick Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.map((prod) => (
                <tr
                  key={prod.id}
                  className="hover:bg-stone-50 transition-colors"
                >
                  <td className="p-4">
                    <div className="font-medium text-[var(--color-primary)]">
                      {prod.name}
                    </div>
                  </td>
                  <td className="p-4 text-stone-600">
                    <ProductPriceCell productId={prod.id} basePrice={prod.price} />
                  </td>
                  <td className="p-4">
                    {prod.stockCount === 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertCircle className="w-3 h-3" /> Out of stock
                      </span>
                    ) : prod.stockCount <= 5 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertCircle className="w-3 h-3" /> Low stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" /> In stock
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-stone-600 font-medium">
                    {editingId === prod.id ? (
                      <input
                        type="number"
                        min="0"
                        className="w-20 px-2 py-1 border border-stone-300 rounded focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
                        value={editStock}
                        onChange={(e) =>
                          setEditStock(parseInt(e.target.value) || 0)
                        }
                      />
                    ) : (
                      <span>{prod.stockCount}</span>
                    )}
                  </td>
                  <td className="p-4">
                    {editingId === prod.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateStock(prod.id)}
                          className="text-sm px-3 py-1 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-accent)]"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-sm px-2 text-stone-500 hover:text-stone-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(prod.id);
                          setEditStock(prod.stockCount);
                        }}
                        className="text-sm px-3 py-1 border border-stone-200 text-stone-600 rounded hover:bg-stone-100"
                      >
                        Update
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-stone-500">
                    No products match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
