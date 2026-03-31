import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Heart, ShoppingCart, Truck } from "lucide-react";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { formatINR } from "../utils/currency";
import { getDiscount, getMRP, getReviewCount } from "../utils/product";

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
  const mrp = getMRP(price, discountPct);
  const savings = mrp - price;
  const reviewCount = getReviewCount(product.id);
  const { label: stockLabel, cls: stockCls } = stockInfo(product.stock);
  const inStock = stockLabel !== "Out of Stock";
  const inWishlist = isInWishlist(product.id);

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative group"
    >
      {/* Discount badge */}
      {price > 0 && (
        <span className="absolute top-2.5 left-2.5 z-10 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
          -{discountPct}%
        </span>
      )}

      {/* Wishlist button overlay */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => toggleWishlist(product)}
        className="absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 shadow-sm hover:scale-105 transition"
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          size={15}
          fill={inWishlist ? "currentColor" : "none"}
          className={inWishlist ? "text-red-500" : "text-slate-400"}
        />
      </motion.button>

      <Link
        to={`/products/${product.id}`}
        state={{ from: location.pathname + location.search }}
        className="block overflow-hidden"
      >
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
          onError={(e) => { e.target.onerror = null; e.target.src = fallbackImage; }}
          className="h-52 w-full object-cover group-hover:scale-105 transition duration-300"
        />
      </Link>

      <div className="p-4 space-y-1.5">
        {/* Brand & category */}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {product.brand} • {product.category}
        </p>

        {/* Product name */}
        <h3 className="font-semibold leading-snug line-clamp-2 text-sm">{product.name}</h3>

        {/* Ratings */}
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 bg-emerald-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
            {product.rating ?? "4.3"} <Star size={9} fill="currentColor" className="ml-0.5" />
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({reviewCount.toLocaleString("en-IN")})
          </span>
        </div>

        {/* Price block */}
        {price > 0 ? (
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {formatINR(price)}
            </span>
            <span className="text-xs text-slate-400 line-through">{formatINR(mrp)}</span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Save {formatINR(savings)}
            </span>
          </div>
        ) : (
          <p className="text-sm font-medium text-slate-500">Price on request</p>
        )}

        {/* Stock status & free delivery */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className={`font-medium ${stockCls}`}>{stockLabel}</span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <Truck size={11} /> FREE Delivery
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {inStock ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => addToCart(product)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
            >
              <ShoppingCart size={14} />
              Add to Cart
            </motion.button>
          ) : (
            <span className="flex-1 text-center px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-sm font-medium cursor-not-allowed">
              Out of Stock
            </span>
          )}

          <Link
            to={`/products/${product.id}`}
            state={{ from: location.pathname + location.search }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Details
          </Link>
        </div>
      </div>
    </motion.article>
  );
}