import React, { useState, useEffect } from "react";
import {
  listOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} from "../../lib/api/admin";
import type { Offer as ApiOffer } from "../../lib/api/catalog";
import { handleApiError, OperationType } from "../../lib/api/errors";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

type Offer = ApiOffer;

export default function Offers() {
  const { t } = useTranslation();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Offer>>({
    isActive: true,
    discountPercentage: 10,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const data = await listOffers();
      setOffers(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) {
      handleApiError(e, OperationType.GET, "offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || form.discountPercentage === undefined) return;

    try {
      if (editingId) {
        const { id, createdAt, ...rest } = form as Offer;
        await updateOffer(editingId, rest);
        toast.success(t("offer_updated"));
      } else {
        await createOffer({
          ...form,
          createdAt: Date.now(),
        });
        toast.success(t("offer_created"));
      }
      setShowModal(false);
      fetchOffers();
    } catch (e) {
      handleApiError(e, OperationType.WRITE, "offers");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirm_delete_offer"))) return;
    try {
      await deleteOffer(id);
      toast.success(t("offer_deleted"));
      fetchOffers();
    } catch (e) {
      handleApiError(e, OperationType.DELETE, `offers/${id}`);
    }
  };

  const startEdit = (o: Offer) => {
    setForm(o);
    setEditingId(o.id);
    setShowModal(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-serif text-[var(--color-primary)]">
          {t("offers")}
        </h1>
        <button
          onClick={() => {
            setForm({ isActive: true, discountPercentage: 10 });
            setEditingId(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl font-medium hover:bg-[var(--color-accent)] flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> {t("add_offer")}
        </button>
      </div>

      {loading ? (
        <div className="text-stone-500 py-10">{t("loading")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-stone-50 text-[var(--color-primary)] rounded-xl">
                  <Tag className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(offer)}
                    className="text-stone-400 hover:text-blue-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(offer.id)}
                    className="text-stone-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-serif font-bold text-[var(--color-primary)] mb-2">
                {offer.title}
              </h3>
              {offer.description && (
                <p className="text-sm text-stone-500 mb-4">
                  {offer.description}
                </p>
              )}

              <div className="mt-auto pt-4 border-t border-stone-100 flex justify-between items-center">
                <span className="text-2xl font-bold text-[var(--color-primary)]">
                  {t("percent_off", { pct: offer.discountPercentage })}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${offer.isActive ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-500"}`}
                >
                  {offer.isActive ? t("active") : t("inactive")}
                </span>
              </div>
            </div>
          ))}
          {offers.length === 0 && (
            <div className="col-span-full py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-100 border-dashed">
              {t("no_offers_yet")}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-stone-100">
              <h2 className="text-xl font-serif text-[var(--color-primary)]">
                {editingId ? t("edit_offer") : t("add_offer")}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t("title_label")}
                </label>
                <input
                  required
                  type="text"
                  value={form.title || ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t("description")}
                </label>
                <textarea
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-xl"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t("discount_percentage")}
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  value={form.discountPercentage || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discountPercentage: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border rounded-xl"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="rounded text-[var(--color-primary)]"
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  {t("active")}
                </label>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-accent)]"
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
