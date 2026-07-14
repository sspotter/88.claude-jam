import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { getTheme, getFont, getLanguageSettings } from "../../lib/api/catalog";
import { updateTheme, updateFont, updateLanguage, getAnalytics, listOffers, importData, uploadFont } from "../../lib/api/admin";
import { handleApiError, OperationType } from "../../lib/api/errors";
import { applyCustomFont } from "../../lib/customFont";
import { toast } from "sonner";
import { Palette, CheckCircle2, Download, Upload, Type, Languages } from "lucide-react";
import * as XLSX from "xlsx";

const themes = [
  {
    id: "default",
    nameKey: "theme_default_name",
    primary: "#1C1C1C",
    accent: "#8C7A6B",
  },
  { id: "ocean", nameKey: "theme_ocean_name", primary: "#0F2C59", accent: "#DAC0A3" },
  { id: "forest", nameKey: "theme_forest_name", primary: "#1A3636", accent: "#D6BD98" },
  { id: "sunset", nameKey: "theme_sunset_name", primary: "#451952", accent: "#F39F5A" },
];

export default function AdminSettings() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState("default");
  const [selectedFont, setSelectedFont] = useState("default");
  const [selectedLanguage, setSelectedLanguage] = useState("ar");
  const [saving, setSaving] = useState(false);
  const [savingFont, setSavingFont] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [customFont, setCustomFont] = useState<{ name: string; url: string } | null>(null);
  const [uploadingFont, setUploadingFont] = useState(false);
  const fontInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getTheme(), getFont(), getLanguageSettings()])
      .then(([theme, font, language]) => {
        if (theme.selectedTheme) {
          setSelected(theme.selectedTheme);
        }
        if (font.selectedFont) {
          setSelectedFont(font.selectedFont);
        }
        if (font.custom) {
          setCustomFont(font.custom);
          applyCustomFont(font.custom.url);
        }
        if (language.defaultLanguage) {
          setSelectedLanguage(language.defaultLanguage);
        }
      })
      .catch((e) => handleApiError(e, OperationType.GET, "settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (themeId: string) => {
    setSelected(themeId);
    setSaving(true);
    try {
      await updateTheme(themeId);
      toast.success(t("theme_updated"));
    } catch (e) {
      handleApiError(e, OperationType.WRITE, "settings/theme");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFont = async (fontId: string) => {
    setSelectedFont(fontId);
    setSavingFont(true);
    try {
      await updateFont(fontId);
      document.documentElement.dataset.font = fontId;
      toast.success(t("font_updated"));
    } catch (e) {
      handleApiError(e, OperationType.WRITE, "settings/font");
    } finally {
      setSavingFont(false);
    }
  };

  const handleFontUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFont(true);
    try {
      const result = await uploadFont(file);
      if (result.custom) {
        setCustomFont(result.custom);
        applyCustomFont(result.custom.url);
      }
      const next = result.selectedFont ?? "custom";
      setSelectedFont(next);
      document.documentElement.dataset.font = next;
      toast.success(t("custom_font_uploaded"));
    } catch (err) {
      handleApiError(err, OperationType.WRITE, "settings/font/upload");
    } finally {
      setUploadingFont(false);
      if (fontInputRef.current) fontInputRef.current.value = "";
    }
  };

  const handleSaveLanguage = async (languageId: string) => {
    setSelectedLanguage(languageId);
    setSavingLanguage(true);
    try {
      await updateLanguage(languageId);
      toast.success(t("default_language_updated"));
    } catch (e) {
      handleApiError(e, OperationType.WRITE, "settings/language");
    } finally {
      setSavingLanguage(false);
    }
  };

  const handleMegaExport = async () => {
    setExporting(true);
    try {
      const [{ products, categories, orders }, offers] = await Promise.all([
        getAnalytics(),
        listOffers(),
      ]);

      const flatOrders = orders.map((o) => ({
        id: o.id,
        customerName: o.customerName,
        phone: o.phone,
        status: o.status,
        totalPrice: o.totalPrice,
        createdAt: new Date(o.createdAt).toLocaleString(),
        itemsCount: o.items?.length || 0,
        couponCode: o.coupon?.code || "",
        couponDiscount: o.coupon?.discountPercentage || 0,
        address: o.address,
      }));

      const customerMap = new Map<string, {
        phone: string;
        name: string;
        address: string;
        totalOrders: number;
        totalSpent: number;
      }>();
      orders.forEach((o) => {
        if (!customerMap.has(o.phone)) {
          customerMap.set(o.phone, {
            phone: o.phone,
            name: o.customerName,
            address: o.address,
            totalOrders: 0,
            totalSpent: 0,
          });
        }
        const c = customerMap.get(o.phone)!;
        c.totalOrders++;
        c.totalSpent += o.totalPrice;
      });
      const customers = Array.from(customerMap.values());

      const wb = XLSX.utils.book_new();
      
      const wsOrders = XLSX.utils.json_to_sheet(flatOrders);
      XLSX.utils.book_append_sheet(wb, wsOrders, "Orders");
      
      const wsProducts = XLSX.utils.json_to_sheet(products);
      XLSX.utils.book_append_sheet(wb, wsProducts, "Products");
      
      const wsCategories = XLSX.utils.json_to_sheet(categories);
      XLSX.utils.book_append_sheet(wb, wsCategories, "Categories");

      const wsOffers = XLSX.utils.json_to_sheet(offers);
      XLSX.utils.book_append_sheet(wb, wsOffers, "Offers");

      const wsCustomers = XLSX.utils.json_to_sheet(customers);
      XLSX.utils.book_append_sheet(wb, wsCustomers, "Customers");

      XLSX.writeFile(wb, `Mega_Export_${new Date().toISOString().split("T")[0]}.xlsx`);

      toast.success(t("export_successful"));
    } catch (e) {
      toast.error(t("failed_to_export_data"));
      handleApiError(e, OperationType.GET, "analytics export");
    } finally {
      setExporting(false);
    }
  };

  const handleMegaImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !window.confirm(
        t("confirm_overwrite_import"),
      )
    ) {
      if (importInputRef.current) importInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      setImporting(true);
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const readSheet = (name: string): Record<string, unknown>[] => {
          const ws = wb.Sheets[name];
          return ws ? (XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]) : [];
        };

        // The Customers sheet is derived data and is not consumed by /import.
        const result = await importData({
          categories: readSheet("Categories"),
          products: readSheet("Products"),
          offers: readSheet("Offers"),
          orders: readSheet("Orders"),
        });

        toast.success(
          t("import_summary", {
            categories: result.categories,
            products: result.products,
            offers: result.offers,
            orders: result.orders,
          }),
        );
      } catch (err) {
        toast.error(t("failed_to_import_data"));
        handleApiError(err, OperationType.WRITE, "mega import");
      } finally {
        setImporting(false);
        if (importInputRef.current) importInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  if (loading) return <div>{t("loading")}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-[var(--color-primary)] flex items-center gap-3">
          <Palette className="w-8 h-8" />
          {t("settings")}
        </h1>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-stone-100 shadow-sm">
         <div className="flex justify-between items-start mb-6">
           <div>
             <h2 className="text-xl font-medium text-stone-800">
               {t("data_management")}
             </h2>
             <p className="text-stone-500 mt-2">
               {t("data_management_desc")}
             </p>
           </div>
           <div className="flex items-center gap-3">
             <button
               onClick={handleMegaExport}
               disabled={exporting || importing}
               className="px-6 py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 disabled:opacity-50 flex items-center gap-2"
             >
               <Download className="w-5 h-5" />
               {exporting ? t("exporting") : t("mega_export")}
             </button>
             <button
               onClick={() => importInputRef.current?.click()}
               disabled={exporting || importing}
               className="px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 disabled:opacity-50 flex items-center gap-2 border border-stone-200"
             >
               <Upload className="w-5 h-5" />
               {importing ? t("importing") : t("mega_import")}
             </button>
             <input
               type="file"
               ref={importInputRef}
               onChange={handleMegaImport}
               accept=".xlsx, .xls"
               className="hidden"
             />
           </div>
         </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-stone-100 shadow-sm">
        <h2 className="text-xl font-medium text-stone-800 mb-6 font-serif">
          {t("global_theme")}
        </h2>
        <p className="text-stone-500 mb-8">
          {t("global_theme_desc")}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {themes.map((theme) => {
            const isActive = selected === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => handleSave(theme.id)}
                disabled={saving}
                className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                  isActive
                    ? "border-[var(--color-accent)] bg-stone-50"
                    : "border-stone-100 hover:border-stone-200 hover:bg-stone-50"
                }`}
              >
                {isActive && (
                  <CheckCircle2 className="absolute top-4 right-4 w-6 h-6 text-[var(--color-accent)]" />
                )}
                <div className="font-medium text-lg text-stone-800 mb-4 font-serif">
                  {t(theme.nameKey)}
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-8 h-8 rounded-full shadow-sm border border-stone-200"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <span className="text-xs text-stone-500 font-mono">
                      {t("theme_primary")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-8 h-8 rounded-full shadow-sm border border-stone-200"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span className="text-xs text-stone-500 font-mono">
                      {t("theme_accent")}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-stone-100 shadow-sm">
        <h2 className="text-xl font-medium text-stone-800 mb-6 flex items-center gap-3 font-serif">
          <Type className="w-6 h-6 text-stone-600" />
          {t("global_font")}
        </h2>
        <p className="text-stone-500 mb-8">
          {t("global_font_desc")}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { id: "default", nameKey: "font_default_name", descKey: "font_default_desc", family: "Maj", sample: "جمحاوي - Jamhawi" },
            { id: "majalla", nameKey: "font_majalla_name", descKey: "font_majalla_desc", family: "'Sakkal Majalla', 'Majalla'", sample: "خط المجلة - Jamhawi" },
          ].map((fontOption) => {
            const isActive = selectedFont === fontOption.id;
            return (
              <button
                key={fontOption.id}
                onClick={() => handleSaveFont(fontOption.id)}
                disabled={savingFont || uploadingFont}
                className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                  isActive
                    ? "border-[var(--color-accent)] bg-stone-50"
                    : "border-stone-100 hover:border-stone-200 hover:bg-stone-50"
                }`}
                style={{ fontFamily: fontOption.family }}
              >
                {isActive && (
                  <CheckCircle2 className="absolute top-4 right-4 w-6 h-6 text-[var(--color-accent)]" />
                )}
                <div className="font-medium text-lg text-stone-800 mb-1 font-serif">
                  {t(fontOption.nameKey)}
                </div>
                <div className="text-xs text-stone-500 mb-4">
                  {t(fontOption.descKey)}
                </div>
                <div className="text-lg border border-dashed border-stone-200 p-3 rounded-lg bg-white text-stone-800 font-serif">
                  {fontOption.sample}
                </div>
              </button>
            );
          })}

          {/* Custom uploaded font */}
          <div
            className={`relative p-6 rounded-2xl border-2 text-left transition-all sm:col-span-2 ${
              selectedFont === "custom"
                ? "border-[var(--color-accent)] bg-stone-50"
                : "border-stone-100"
            }`}
          >
            {selectedFont === "custom" && (
              <CheckCircle2 className="absolute top-4 right-4 w-6 h-6 text-[var(--color-accent)]" />
            )}
            <div className="font-medium text-lg text-stone-800 mb-1 font-serif">
              {t("custom_font")}
            </div>
            <div className="text-xs text-stone-500 mb-4">
              {customFont ? t("uploaded_font_name", { name: customFont.name }) : t("upload_font_file_types")}
            </div>

            {customFont && (
              <button
                type="button"
                onClick={() => handleSaveFont("custom")}
                disabled={savingFont || uploadingFont}
                className="w-full text-lg border border-dashed border-stone-200 p-3 rounded-lg bg-white text-stone-800 mb-4 text-left"
                style={{ fontFamily: "AppCustomFont" }}
              >
                خط مخصص - Custom Jamhawi
              </button>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fontInputRef.current?.click()}
                disabled={uploadingFont || savingFont}
                className="px-5 py-2.5 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                {uploadingFont ? t("uploading") : customFont ? t("replace_font") : t("upload_font")}
              </button>
              <input
                type="file"
                ref={fontInputRef}
                onChange={handleFontUpload}
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-stone-100 shadow-sm">
        <h2 className="text-xl font-medium text-stone-800 mb-6 flex items-center gap-3 font-serif">
          <Languages className="w-6 h-6 text-stone-600" />
          {t("default_language")}
        </h2>
        <p className="text-stone-500 mb-8">
          {t("default_language_desc")}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { id: "ar", nameKey: "language_arabic", sample: "جمحاوي" },
            { id: "en", nameKey: "language_english", sample: "Jamhawi" },
          ].map((option) => {
            const isActive = selectedLanguage === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleSaveLanguage(option.id)}
                disabled={savingLanguage}
                className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                  isActive
                    ? "border-[var(--color-accent)] bg-stone-50"
                    : "border-stone-100 hover:border-stone-200 hover:bg-stone-50"
                }`}
              >
                {isActive && (
                  <CheckCircle2 className="absolute top-4 right-4 w-6 h-6 text-[var(--color-accent)]" />
                )}
                <div className="font-medium text-lg text-stone-800 mb-4 font-serif">
                  {t(option.nameKey)}
                </div>
                <div className="text-lg border border-dashed border-stone-200 p-3 rounded-lg bg-white text-stone-800 font-serif">
                  {option.sample}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
