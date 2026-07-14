import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../lib/api/admin";
import type { Category as ApiCategory } from "../../lib/api/catalog";
import { handleApiError, OperationType } from "../../lib/api/errors";
import { Edit, Trash2, Plus, Image as ImageIcon, Link as LinkIcon, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Category = ApiCategory;

export default function Categories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formNameAr, setFormNameAr] = useState("");
  const [formImage, setFormImage] = useState("");
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCategories = async () => {
    try {
      const cats = await listCategories();
      setCategories(cats.sort((a, b) => a.createdAt - b.createdAt));
    } catch (error) {
      handleApiError(error, OperationType.GET, "categories");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setLoading(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dy8n4jopb";
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "Jamhawy";

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
      setFormImage(data.secure_url);
      toast.success("Image uploaded to Cloudinary");
    } catch (error: any) {
      console.error("Cloudinary upload error:", error);
      toast.error(`Upload failed: ${error?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setLoading(true);

    try {
      if (isEditing) {
        const cat = categories.find((c) => c.id === isEditing);
        if (cat) {
          await updateCategory(isEditing, {
            name: formName,
            nameAr: formNameAr,
            image: formImage,
            createdAt: cat.createdAt,
            isHidden: cat.isHidden ?? false,
          });
          toast.success(t("save") + "!");
        }
      } else {
        await createCategory({
          name: formName,
          nameAr: formNameAr,
          image: formImage,
          createdAt: Date.now(),
          isHidden: false,
        });
        toast.success(t("add_category") + "!");
      }
      resetForm();
      await fetchCategories();
    } catch (error) {
      handleApiError(error, OperationType.WRITE, "categories");
      toast.error("Error saving category");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (cat: Category) => {
    try {
      await updateCategory(cat.id, { isHidden: !cat.isHidden });
      toast.success(cat.isHidden ? "Category is now visible" : "Category hidden from users");
      await fetchCategories();
    } catch (error) {
      handleApiError(error, OperationType.UPDATE, "categories");
      toast.error("Error updating visibility");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await deleteCategory(id);
      toast.success(t("delete") + "!");
      await fetchCategories();
    } catch (error) {
      handleApiError(error, OperationType.DELETE, "categories");
      toast.error("Error deleting category");
    }
  };

  const startEdit = (cat: Category) => {
    setIsEditing(cat.id);
    setFormName(cat.name);
    setFormNameAr(cat.nameAr || "");
    setFormImage(cat.image || "");
    setImageInputMode(cat.image && !cat.image.includes("firebasestorage") ? "url" : "upload");
  };

  const resetForm = () => {
    setIsEditing(null);
    setFormName("");
    setFormNameAr("");
    setFormImage("");
    setImageInputMode("upload");
  };

  return (
    <div>
      <h1 className="text-3xl font-serif text-[var(--color-primary)] mb-8">
        {t("manage_categories")}
      </h1>

      <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm mb-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Names row */}
          <div className="flex gap-4">
            <div className="flex-grow">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {isEditing ? t("edit") : t("add_category")} (EN)
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none transition-all"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="flex-grow">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {isEditing ? t("edit") : t("add_category")} (AR)
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none transition-all"
                value={formNameAr}
                onChange={(e) => setFormNameAr(e.target.value)}
              />
            </div>
          </div>

          {/* Image section */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {t("category_image")}
            </label>
            {/* Tab toggle */}
            <div className="flex rounded-xl border border-stone-200 overflow-hidden mb-3">
              <button
                type="button"
                onClick={() => setImageInputMode("upload")}
                className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${imageInputMode === "upload" ? "bg-[var(--color-primary)] text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
              >
                <ImageIcon className="w-4 h-4" />
                {t("upload_file")}
              </button>
              <button
                type="button"
                onClick={() => setImageInputMode("url")}
                className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${imageInputMode === "url" ? "bg-[var(--color-primary)] text-white" : "bg-white text-stone-600 hover:bg-stone-50"}`}
              >
                <LinkIcon className="w-4 h-4" />
                {t("url_link")}
              </button>
            </div>

            <div className="flex items-center gap-4">
              {formImage && (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                  <img src={formImage} alt="Preview" className="w-full h-full object-cover" />
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
                  <span>{loading ? t("uploading") : t("choose_image")}</span>
                </button>
              ) : (
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
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

          {/* Actions */}
          <div className="flex gap-2 self-end">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-300"
              >
                {t("cancel")}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-xl font-medium hover:bg-[var(--color-accent)] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("save")}
            </button>
          </div>
        </form>
      </div>

      {/* Categories list */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <ul className="divide-y divide-stone-100">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className={`p-4 flex justify-between items-center transition-colors ${cat.isHidden ? "bg-stone-50 opacity-60" : "hover:bg-stone-50"}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-100">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-stone-300" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-lg text-[var(--color-primary)]">
                      {cat.name}
                    </span>
                    {cat.isHidden && (
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 flex items-center gap-1">
                        <EyeOff className="w-3 h-3" />
                        Hidden
                      </span>
                    )}
                  </div>
                  {cat.nameAr && (
                    <span className="text-sm text-stone-500">{cat.nameAr}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleVisibility(cat)}
                  title={cat.isHidden ? "Show to users" : "Hide from users"}
                  className={`p-2 transition-colors rounded-lg ${cat.isHidden ? "text-stone-400 hover:text-green-600 hover:bg-green-50" : "text-stone-400 hover:text-amber-600 hover:bg-amber-50"}`}
                >
                  {cat.isHidden ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => startEdit(cat)}
                  className="p-2 text-stone-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="p-2 text-stone-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </li>
          ))}
          {categories.length === 0 && (
            <li className="p-8 text-center text-stone-500">No categories found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
