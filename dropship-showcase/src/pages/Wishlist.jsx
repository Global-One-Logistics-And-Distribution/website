import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { formatINR } from "../utils/currency";
import { useProducts } from "../hooks/useProducts";
import { getProductSlug } from "../utils/slug";

export default function Wishlist() {
  const { wishlistIds, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { products, loading } = useProducts();

  // Resolve full product objects from wishlist IDs
  const wishlistProducts = products.filter(
    (p) => wishlistIds.has(p.id) || wishlistIds.has(String(p.id))
  );

  return (
    <section className="container-pad py-10">
      <Helmet>
        <title>Wishlist | EliteDrop</title>
      </Helmet>
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Heart className="w-7 h-7 text-red-500" fill="currentColor" />
        Your Wishlist
        <span className="text-lg font-normal text-slate-500 dark:text-slate-400">
          ({wishlistProducts.length})
        </span>
      </h1>

      {!loading && wishlistProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <Heart className="w-14 h-14 mx-auto text-slate-200 dark:text-slate-700 mb-4" />
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            No products in your wishlist yet.
          </p>
          <Link
            to="/products"
            className="inline-block px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
          >
            Browse Products
          </Link>
        </motion.div>
      ) : loading ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
          Loading wishlist...
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {wishlistProducts.map((product, idx) => {
            const rawImage = product.image_url || product.image;
            const imageUrl = Array.isArray(rawImage)
              ? rawImage[0]
              : rawImage || "https://placehold.co/600x400?text=No+Image";

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
              >
                <Link to={`/products/${getProductSlug(product)}`} className="block">
                  <img
                    src={imageUrl}
                    alt={product.name}
                    loading="lazy"
                    className="h-48 w-full object-cover hover:scale-105 transition duration-300"
                  />
                </Link>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold leading-snug line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {product.brand} • {product.category}
                  </p>
                  <div className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    {product.price && Number(product.price) > 0
                      ? formatINR(product.price)
                      : "Price on request"}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => addToCart(product)}
                      className="flex-1 text-center px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={() => toggleWishlist(product)}
                      className="px-3 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      aria-label="Remove from wishlist"
                    >
                      <Heart size={16} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}