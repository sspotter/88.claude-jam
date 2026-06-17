import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCategories, getProducts } from "../lib/api/catalog";
import { handleApiError, OperationType } from "../lib/api/errors";
import { Link } from "react-router-dom";
import { useSearchStore } from "../store/searchStore";
import JamhawiLogo from "../components/JamhawiLogo";
import ProductListPrice from "../components/ProductListPrice";

interface Category {
  id: string;
  name: string;
  nameAr?: string;
  image?: string;
  isHidden?: boolean;
}

interface Product {
  id: string;
  name: string;
  nameAr?: string;
  price: number;
  categoryId: string;
  image: string;
  isAvailable: boolean;
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const searchQuery = useSearchStore((state) => state.searchQuery);
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc">(
    "default",
  );
  const [availability, setAvailability] = useState<"all" | "in_stock">("all");

  useEffect(() => {
    async function fetchData() {
      try {
        const [cats, prods] = await Promise.all([
          getCategories(),
          getProducts(),
        ]);

        setCategories(cats.filter((cat) => !cat.isHidden));
        setProducts(prods as Product[]);
      } catch (error) {
        handleApiError(error, OperationType.GET, "categories/products");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20 text-[var(--color-accent)]">
        {t("loading")}
      </div>
    );
  }

  let filteredProducts = [...products];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameAr && p.nameAr.toLowerCase().includes(q)),
    );
  }

  if (availability === "in_stock") {
    filteredProducts = filteredProducts.filter((p) => p.isAvailable);
  }

  if (sortBy === "price_asc") {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price_desc") {
    filteredProducts.sort((a, b) => b.price - a.price);
  }

  return (
    <div className="space-y-16">
      {!searchQuery && (
        <>
          <section className="relative overflow-hidden rounded-3xl bg-white border border-stone-200/60 p-6 md:p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] mb-12 md:mb-16 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500">
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center">
              <div className="w-full max-w-2xl py-4 md:py-8 transform hover:scale-[1.01] transition-transform duration-500">
                <JamhawiLogo variant="full" className="w-full h-auto" />
              </div>
              <p className="text-base sm:text-lg text-stone-500 max-w-2xl mx-auto font-sans leading-relaxed mt-4">
                Fresh, organic produce and premium artisanal delicacies delivered straight from our orchards to your doorstep.
              </p>
              <div className="pt-8 flex flex-wrap justify-center gap-4">
                <a
                  href="#products"
                  className="inline-flex items-center justify-center px-6 py-3 bg-[var(--color-primary)] text-white font-medium rounded-xl hover:bg-[var(--color-accent)] shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  Shop Fresh Items
                </a>
                <Link
                  to="/animation"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-[var(--color-primary)] border border-stone-200 font-medium rounded-xl hover:bg-stone-50 transition-all duration-300"
                >
                  Cinematic Story 🎬
                </Link>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl text-[var(--color-primary)] font-serif font-bold">
                {t("categories")}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.id}`}
                  className="group relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 p-6 text-center border border-stone-100 hover:border-[var(--color-accent)]/30 flex flex-col justify-center items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center group-hover:bg-[var(--color-accent)] group-hover:text-white transition-all duration-300">
                    <span className="text-lg font-serif font-bold">
                      {(i18n.language === "ar" ? category.nameAr || category.name : category.name).charAt(0)}
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-serif font-semibold text-[var(--color-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                    {i18n.language === "ar"
                      ? category.nameAr || category.name
                      : category.name}
                  </h3>
                </Link>
              ))}
              {categories.length === 0 && (
                <div className="col-span-full text-center text-stone-500 py-10">
                  No categories found.
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <section id="products">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
          <h2 className="text-3xl text-[var(--color-primary)] font-serif font-bold">
            {searchQuery
              ? `Search Results for "${searchQuery}"`
              : t("products")}
          </h2>

          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as any)}
              className="px-3 md:px-4 py-2 bg-white border border-stone-200 rounded-lg md:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] w-full sm:w-auto shadow-sm"
            >
              <option value="all">All Items</option>
              <option value="in_stock">In Stock only</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 md:px-4 py-2 bg-white border border-stone-200 rounded-lg md:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] w-full sm:w-auto shadow-sm"
            >
              <option value="default">Default Sorting</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="group block bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 p-3"
            >
              <div className="aspect-[3/4] sm:aspect-[4/5] bg-stone-50 rounded-xl overflow-hidden mb-3 md:mb-4 relative shadow-inner">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400">
                    No Image
                  </div>
                )}
                {!product.isAvailable && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-[2px]">
                    <span className="font-bold text-xs tracking-wider uppercase text-red-600 bg-white px-3 py-1.5 rounded-full shadow-sm border border-red-100">
                      {t("out_of_stock")}
                    </span>
                  </div>
                )}
                {product.isAvailable && (
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-10">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary)] text-white shadow-md hover:bg-[var(--color-accent)] text-lg font-bold">
                      +
                    </span>
                  </div>
                )}
              </div>
              <div className="px-1 py-1">
                <h3 className="font-serif font-bold text-base md:text-lg text-[var(--color-primary)] mb-1.5 truncate group-hover:text-[var(--color-accent)] transition-colors">
                  {i18n.language === "ar"
                    ? product.nameAr || product.name
                    : product.name}
                </h3>
                <div className="flex items-center justify-between">
                  <p className="text-[var(--color-accent)] font-semibold text-sm md:text-base">
                    <ProductListPrice
                      productId={product.id}
                      basePrice={product.price}
                    />
                  </p>
                  {product.isAvailable ? (
                    <span className="text-[9px] uppercase font-bold tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                      In Stock
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase font-bold tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                      Out of stock
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center text-stone-500 py-10">
            No products found.
          </div>
        )}
      </section>
    </div>
  );
}
