import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X, LayoutGrid, List, Star, ShoppingCart, Truck } from "lucide-react";
import ProductCard from "../components/ProductCard";
import Filters from "../components/Filters";
import ProductGridSkeleton from "../components/ProductGridSkeleton";
import { formatINR } from "../utils/currency";
import { useCart } from "../context/CartContext";
import { getDiscount, getMRP } from "../utils/product";
import { useProducts } from "../hooks/useProducts";
import { getProductSlug } from "../utils/slug";

function ListProductCard({ product }) {
  const { addToCart } = useCart();
  const rawImage = product.image_url || product.image;
  const imageUrl = Array.isArray(rawImage) ? rawImage[0] : rawImage || "https://placehold.co/80x80?text=N/A";
  const price = Number(product.price) || 0;
  const stock = Number(product.stock || 0);
  const inStock = stock > 0;
  const mrp = getMRP(price, product.id);
  const discount = getDiscount(product.id);
  const productPath = `/products/${getProductSlug(product)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
    >
      <Link to={productPath} className="shrink-0">
        <img src={imageUrl} alt={product.name} className="w-28 h-28 object-cover rounded-xl bg-slate-100 dark:bg-slate-800" />
      </Link>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{product.brand} • {product.category}</p>
        <Link to={productPath} className="font-semibold leading-snug hover:text-indigo-600 dark:hover:text-indigo-400 transition line-clamp-2 text-sm mt-0.5 block">
          {product.name}
        </Link>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="flex items-center gap-0.5 bg-emerald-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
            {product.rating ?? "4.3"} <Star size={8} fill="currentColor" className="ml-0.5" />
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-1 flex-wrap">
          <span className="font-bold text-slate-900 dark:text-white">{formatINR(price)}</span>
          <span className="text-xs text-slate-400 line-through">{formatINR(mrp)}</span>
          <span className="text-xs font-medium text-red-500">-{discount}%</span>
        </div>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
          <Truck size={11} /> FREE Delivery
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
          {product.shortDescription || product.short_description || product.description}
        </p>
      </div>
      <div className="shrink-0 flex flex-col gap-2 justify-center">
        {inStock ? (
          <button
            onClick={() => addToCart(product)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
          >
            <ShoppingCart size={14} /> Add to Cart
          </button>
        ) : (
          <span className="text-center px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-sm font-medium cursor-not-allowed">
            Out of Stock
          </span>
        )}
        <Link
          to={productPath}
          className="text-center px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          Details
        </Link>
      </div>
    </motion.div>
  );
}

export default function ProductListing() {
  const { products, loading } = useProducts();
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get("category");
  const siteUrl = useMemo(() => {
    const envSite = import.meta.env.VITE_SITE_URL;
    if (typeof envSite === "string" && envSite.trim()) return envSite.trim().replace(/\/$/, "");
    if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
    return "https://www.elitedrop.net.in";
  }, []);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [maxPrice, setMaxPrice] = useState(13000);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
  const brands = useMemo(() => [...new Set(products.map((p) => p.brand).filter(Boolean))], [products]);
  const maxProductPrice = useMemo(() => {
    const max = Math.max(0, ...products.map((p) => Number(p.price || 0)));
    if (max <= 0) return 13000;
    return Math.ceil(max / 500) * 500;
  }, [products]);

  useEffect(() => {
    setMaxPrice(maxProductPrice);
  }, [maxProductPrice]);

  useEffect(() => {
    if (categoryFromUrl && categories.includes(categoryFromUrl)) {
      setSelectedCategory(categoryFromUrl);
    } else {
      setSelectedCategory("All");
    }
  }, [categoryFromUrl, categories]);

  const filtered = useMemo(() => {
    let data = products.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (selectedCategory === "All" || p.category === selectedCategory) &&
        (selectedBrand === "All" || p.brand === selectedBrand) &&
        Number(p.price || 0) <= maxPrice &&
        Number(p.rating || 0) >= minRating
    );

    if (sortBy === "priceLowHigh") data = [...data].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sortBy === "priceHighLow") data = [...data].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sortBy === "ratingHigh") data = [...data].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    if (sortBy === "nameAZ") data = [...data].sort((a, b) => a.name.localeCompare(b.name));

    return data;
  }, [search, selectedCategory, selectedBrand, sortBy, maxPrice, minRating]);

  const hasActiveFilters =
    search !== "" || selectedCategory !== "All" || selectedBrand !== "All" ||
    sortBy !== "default" || maxPrice < maxProductPrice || minRating > 0;

  const clearAllFilters = () => {
    setSearch("");
    setSelectedCategory("All");
    setSelectedBrand("All");
    setSortBy("default");
    setMaxPrice(maxProductPrice);
    setMinRating(0);
  };

  const seoTitle = selectedCategory !== "All"
    ? `${selectedCategory} | EliteDrop Products`
    : "All Products | EliteDrop";
  const seoDescription = selectedCategory !== "All"
    ? `Browse ${selectedCategory} at EliteDrop. Premium quality products with secure checkout and fast delivery.`
    : "Explore all premium products at EliteDrop, including bags, watches, shoes, wallets, and accessories.";
  // Consolidate query/filter variants under one canonical listing URL.
  const canonicalUrl = `${siteUrl}/products`;

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container-pad py-10">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonicalUrl} />
      </Helmet>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {selectedCategory !== "All" ? selectedCategory : "All Products"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition ${viewMode === "grid" ? "bg-indigo-600 text-white" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition ${viewMode === "list" ? "bg-indigo-600 text-white" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition lg:hidden"
          >
            <SlidersHorizontal size={15} />
            Filters
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Search by product name, brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className={showFilters ? "block" : "hidden lg:block"}>
        <Filters
          categories={categories}
          brands={brands}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedBrand={selectedBrand}
          setSelectedBrand={setSelectedBrand}
          sortBy={sortBy}
          setSortBy={setSortBy}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          minRating={minRating}
          setMinRating={setMinRating}
          priceMin={500}
          priceMax={maxProductPrice}
          priceStep={500}
        />
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">Active filters:</span>
          {selectedCategory !== "All" && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium">
              {selectedCategory}
              <button onClick={() => setSelectedCategory("All")}><X size={11} /></button>
            </span>
          )}
          {selectedBrand !== "All" && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium">
              {selectedBrand}
              <button onClick={() => setSelectedBrand("All")}><X size={11} /></button>
            </span>
          )}
          {minRating > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
              ★ {minRating}+
              <button onClick={() => setMinRating(0)}><X size={11} /></button>
            </span>
          )}
          {maxPrice < maxProductPrice && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
              ≤ {formatINR(maxPrice)}
              <button onClick={() => setMaxPrice(maxProductPrice)}><X size={11} /></button>
            </span>
          )}
          <button onClick={clearAllFilters} className="text-xs text-red-500 hover:underline ml-1">
            Clear all
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg font-semibold mb-2">No products found</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Try adjusting your search or filters.</p>
          <button onClick={clearAllFilters} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
            Clear Filters
          </button>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-3">
          {filtered.map((p) => (
            <ListProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </motion.section>
  );
}
