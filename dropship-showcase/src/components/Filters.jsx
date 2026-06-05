export default function Filters({
  categories,
  brands = [],
  selectedCategory,
  setSelectedCategory,
  selectedBrand,
  setSelectedBrand,
  sortBy,
  setSortBy,
  maxPrice,
  setMaxPrice,
  minRating = 0,
  setMinRating,
  priceMin = 500,
  priceMax = 13000,
  priceStep = 500,
}) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6 p-4 rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.10)]">
      {/* Category */}
      <select
        className="px-3 py-2 rounded-lg border border-slate-200/70 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
      >
        <option value="All">All Categories</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Brand */}
      <select
        className="px-3 py-2 rounded-lg border border-slate-200/70 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
        value={selectedBrand}
        onChange={(e) => setSelectedBrand(e.target.value)}
      >
        <option value="All">All Brands</option>
        {brands.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>

      {/* Sort */}
      <select
        className="px-3 py-2 rounded-lg border border-slate-200/70 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
      >
        <option value="default">Sort: Relevance</option>
        <option value="priceLowHigh">Price: Low → High</option>
        <option value="priceHighLow">Price: High → Low</option>
        <option value="ratingHigh">Rating: High → Low</option>
        <option value="nameAZ">Name: A → Z</option>
      </select>

      {/* Min rating */}
      <select
        className="px-3 py-2 rounded-lg border border-slate-200/70 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
        value={minRating}
        onChange={(e) => setMinRating(Number(e.target.value))}
      >
        <option value={0}>Any Rating</option>
        <option value={3}>★ 3 &amp; above</option>
        <option value={4}>★ 4 &amp; above</option>
        <option value={4.5}>★ 4.5 &amp; above</option>
      </select>

      {/* Price range */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Max Price</span>
          <span className="font-semibold text-slate-700">₹{maxPrice.toLocaleString("en-IN")}</span>
        </div>
        <input
          type="range"
          min={priceMin}
          max={priceMax}
          step={priceStep}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>₹{priceMin.toLocaleString("en-IN")}</span>
          <span>₹{priceMax.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}