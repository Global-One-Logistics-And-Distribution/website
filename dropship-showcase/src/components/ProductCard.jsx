import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Heart, ShoppingCart, Truck } from "lucide-react";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { formatINR } from "../utils/currency";
import { getDiscount, getMRP, getReviewCount } from "../utils/product";
import { getProductSlug } from "../utils/slug";
import { fetchProductById } from "../utils/productsApi";

/** Stock label from product.stock. */
function stockInfo(stock) {
  const n = Number(stock);
  if (!n || n === 0) return { label: "Out of Stock", cls: "text-red-500" };
  if (n <= 5) return { label: `Only ${n} left`, cls: "text-orange-500" };
  return { label: "In Stock", cls: "text-emerald-600 dark:text-emerald-400" };
}

export default function ProductCard({ product }) {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();
  const location = useLocation();

  const fallbackImage = "https://placehold.co/600x400?text=No+Image";
  const rawImage = product.image_url || product.image;
  const imageUrl = Array.isArray(rawImage) ? rawImage[0] : rawImage || fallbackImage;

  const price = Number(product.price) || 0;
  const discountPct = getDiscount(product.id);
  const mrp = getMRP(price, product.id);
  const reviewCount = getReviewCount(product.id);
  const { label: stockLabel, cls: stockCls } = stockInfo(product.stock);
  const inStock = stockLabel !== "Out of Stock";
  const inWishlist = isInWishlist(product.id);
  const productPath = `/products/${getProductSlug(product)}`;

  return (
    <motion.article
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="rounded-[20px] overflow-hidden border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:shadow-slate-200/50 relative group flex flex-col h-full"
    >
      {/* Discount badge */}
      {price > 0 && (
        <span className="absolute top-3 left-3 z-10 bg-rose-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide uppercase">
          {discountPct}% OFF
        </span>
      )}

      {/* Wishlist button overlay */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => toggleWishlist(product)}
        className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 backdrop-blur border border-white/50 shadow-sm hover:scale-110 transition"
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          size={16}
          fill={inWishlist ? "currentColor" : "none"}
          className={inWishlist ? "text-rose-500" : "text-slate-400"}
        />
      </motion.button>

      <Link
        to={productPath}
        state={{ from: location.pathname + location.search }}
        className="block overflow-hidden relative bg-slate-50 aspect-[4/3] sm:aspect-square"
        onMouseEnter={() => fetchProductById(product.id).catch(() => {})}
        onFocus={() => fetchProductById(product.id).catch(() => {})}
      >
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
          onError={(e) => { e.target.onerror = null; e.target.src = fallbackImage; }}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500 ease-out"
        />
        {/* Subtle overlay on hover */}
        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition duration-300" />
      </Link>

      <div className="p-5 space-y-3 flex-1 flex flex-col">
        {/* Brand & category */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {product.brand} <span className="opacity-50 mx-1">•</span> {product.category}
        </p>

        {/* Product name */}
        <h3 className="font-semibold text-slate-800 leading-snug line-clamp-2 text-sm md:text-base group-hover:text-indigo-600 transition">
          {product.name}
        </h3>

        {/* Ratings */}
        <div className="flex items-center gap-2 mt-auto">
          <span className="flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold px-2 py-0.5 rounded-md">
            {product.rating ?? "4.3"} <Star size={10} fill="currentColor" className="ml-0.5" />
          </span>
          <span className="text-xs text-slate-400 font-medium">
            ({reviewCount.toLocaleString("en-IN")})
          </span>
        </div>

        {/* Price block */}
        {price > 0 ? (
          <div className="flex items-end gap-2 flex-wrap pt-1">
            <span className="text-lg font-black text-slate-900 tracking-tight">
              {formatINR(price)}
            </span>
            <span className="text-xs text-slate-400 line-through mb-1">{formatINR(mrp)}</span>
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-500 pt-1">Price on request</p>
        )}

        {/* Stock status */}
        <div className="flex items-center justify-between text-[11px] font-semibold tracking-wide uppercase pt-1 border-t border-slate-100">
          <span className={stockCls}>{stockLabel}</span>
          {inStock && (
            <span className="text-emerald-600">Free Ship</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="pt-2 flex gap-2">
          {inStock ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => addToCart(product)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-indigo-600 transition shadow-md shadow-slate-900/10"
            >
              <ShoppingCart size={15} />
              Add
            </motion.button>
          ) : (
            <span className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-sm font-bold cursor-not-allowed">
              Sold Out
            </span>
          )}

          <Link
            to={productPath}
            state={{ from: location.pathname + location.search }}
            className="flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition"
          >
            View
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
