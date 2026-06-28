import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { getTheme, getFont } from "../../lib/api/catalog";
import { updateTheme, updateFont, getAnalytics, listOffers, importData } from "../../lib/api/admin";
import { handleApiError, OperationType } from "../../lib/api/errors";
import { toast } from "sonner";
import { Palette, CheckCircle2, Download, Upload, Type } from "lucide-react";
import * as XLSX from "xlsx";

const themes = [
  {
    id: "default",
    name: "Default (Stone)",
    primary: "#1C1C1C",
    accent: "#8C7A6B",
  },
  { id: "ocean", name: "Ocean", primary: "#0F2C59", accent: "#DAC0A3" },
  { id: "forest", name: "Forest", primary: "#1A3636", accent: "#D6BD98" },
  { id: "sunset", name: "Sunset", primary: "#451952", accent: "#F39F5A" },
];

export default function AdminSettings() {
  const [selected, setSelected] = useState("default");
  const [selectedFont, setSelectedFont] = useState("default");
  const [saving, setSaving] = useState(false);
  const [savingFont, setSavingFont] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getTheme(), getFont()])
      .then(([theme, font]) => {
        if (theme.selectedTheme) {
          setSelected(theme.selectedTheme);
        }
        if (font.selectedFont) {
          setSelectedFont(font.selectedFont);
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
      toast.success("Theme updated for all users");
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
      toast.success("Font updated for all users");
    } catch (e) {
      handleApiError(e, OperationType.WRITE, "settings/font");
    } finally {
      setSavingFont(false);
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

      toast.success("Export successful!");
    } catch (e) {
      toast.error("Failed to export data");
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
        "This will overwrite existing records with matching IDs. Continue?",
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
          `Imported ${result.categories} categories, ${result.products} products, ` +
            `${result.offers} offers, ${result.orders} orders.`,
        );
      } catch (err) {
        toast.error("Failed to import data");
        handleApiError(err, OperationType.WRITE, "mega import");
      } finally {
        setImporting(false);
        if (importInputRef.current) importInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-[var(--color-primary)] flex items-center gap-3">
          <Palette className="w-8 h-8" />
          Settings
        </h1>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-stone-100 shadow-sm">
         <div className="flex justify-between items-start mb-6">
           <div>
             <h2 className="text-xl font-medium text-stone-800">
               Data Management
             </h2>
             <p className="text-stone-500 mt-2">
               Download a complete dump of all your store data (Products, Categories, Orders, Offers, Customers).
             </p>
           </div>
           <div className="flex items-center gap-3">
             <button
               onClick={handleMegaExport}
               disabled={exporting || importing}
               className="px-6 py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 disabled:opacity-50 flex items-center gap-2"
             >
               <Download className="w-5 h-5" />
               {exporting ? "Exporting..." : "Mega Export"}
             </button>
             <button
               onClick={() => importInputRef.current?.click()}
               disabled={exporting || importing}
               className="px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 disabled:opacity-50 flex items-center gap-2 border border-stone-200"
             >
               <Upload className="w-5 h-5" />
               {importing ? "Importing..." : "Mega Import"}
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
          Global Theme
        </h2>
        <p className="text-stone-500 mb-8">
          Select a theme for your storefront and admin dashboard. This will be
          applied to all your customers immediately.
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
                  {theme.name}
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-8 h-8 rounded-full shadow-sm border border-stone-200"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <span className="text-xs text-stone-500 font-mono">
                      Primary
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-8 h-8 rounded-full shadow-sm border border-stone-200"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span className="text-xs text-stone-500 font-mono">
                      Accent
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
          Global Font
        </h2>
        <p className="text-stone-500 mb-8">
          Select a font family for your storefront and admin dashboard. This will update the typography style across the website immediately.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { id: "default", name: "Maj (Default)", description: "Default font · supports English & Arabic" },
            { id: "majalla", name: "Majalla Font", description: "Elegant classic Arabic font" }
          ].map((fontOption) => {
            const isActive = selectedFont === fontOption.id;
            return (
              <button
                key={fontOption.id}
                onClick={() => handleSaveFont(fontOption.id)}
                disabled={savingFont}
                className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                  isActive
                    ? "border-[var(--color-accent)] bg-stone-50"
                    : "border-stone-100 hover:border-stone-200 hover:bg-stone-50"
                }`}
                style={{
                  fontFamily: fontOption.id === "majalla" ? "Majalla" : "Maj"
                }}
              >
                {isActive && (
                  <CheckCircle2 className="absolute top-4 right-4 w-6 h-6 text-[var(--color-accent)]" />
                )}
                <div className="font-medium text-lg text-stone-800 mb-1 font-serif">
                  {fontOption.name}
                </div>
                <div className="text-xs text-stone-500 mb-4">
                  {fontOption.description}
                </div>
                <div className="text-lg border border-dashed border-stone-200 p-3 rounded-lg bg-white text-stone-800 font-serif">
                  {fontOption.id === "majalla" ? "خط المجلة - Jamhawi" : "جمهاوي - Jamhawi"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
