import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, Minus, ShoppingCart, Truck, ChevronRight, ShieldCheck } from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatINR } from "../utils/currency";
import { getMRP } from "../utils/product";
import { getProductSlug } from "../utils/slug";

/** Delivery date = today + 3-5 business days */
function estimatedDelivery() {
  const d = new Date();
  d.setDate(d.getDate() + 4);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

const FREE_DELIVERY_THRESHOLD = 0;

export default function Cart() {
  const cart = useCart() || {};
  const items = Array.isArray(cart.items) ? cart.items : [];
  const totalItems = Number(cart.totalItems) || 0;
  const totalPrice = Number(cart.totalPrice) || 0;
  const updateQuantity = cart.updateQuantity || (() => {});
  const removeFromCart = cart.removeFromCart || (() => {});

  const finalPrice = totalPrice;

  const totalMRP = items.reduce((sum, item) => {
    const price = Number(item?.product?.price) || 0;
    const qty = Number(item?.quantity) || 1;
    const id = item?.productId ?? item?.product?.id;
    return sum + getMRP(price, id) * qty;
  }, 0);
  const totalSavings = totalMRP - totalPrice;

  const remaining = FREE_DELIVERY_THRESHOLD - totalPrice;
  const freeDelivery = remaining <= 0;
  const deliveryCharge = freeDelivery ? 0 : 79;

  if (items.length === 0) {
    return (
      <section className="container-pad py-16 text-center">
        <Helmet>
          <title>Cart | G.O.L.D</title>
        </Helmet>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <ShoppingCart className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Add some products to get started.
          </p>
          <Link
            to="/products"
            className="inline-block px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
          >
            Browse Products
          </Link>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="container-pad py-10">
      <Helmet>
        <title>{`Cart (${totalItems}) | G.O.L.D`}</title>
      </Helmet>

      <motion.h1
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-3xl font-bold mb-4"
      >
        Shopping Cart
        <span className="ml-3 text-lg font-normal text-slate-500 dark:text-slate-400">
          ({totalItems} {totalItems === 1 ? "item" : "items"})
        </span>
      </motion.h1>

      {/* Free delivery progress bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3"
      >
        {freeDelivery ? (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <Truck size={16} />
            🎉 You get <strong>FREE Delivery</strong> on this order!
          </p>
        ) : (
          <>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
              <Truck size={16} />
              Add <strong className="mx-1">{formatINR(remaining)}</strong> more for <strong className="ml-1">FREE Delivery</strong>
            </p>
            <div className="w-full bg-emerald-200 dark:bg-emerald-900 rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalPrice / FREE_DELIVERY_THRESHOLD) * 100)}%` }}
              />
            </div>
          </>
        )}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Item list */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {items.map((item) => {
              const product = item?.product || {};
              const quantity = Number(item?.quantity) || 1;
              const productId = item?.productId ?? product?.id;
              const price = Number(product?.price) || 0;
              const stock = Number(product?.stock);
              const maxAllowed = Number.isFinite(stock) && stock >= 0 ? Math.min(10, stock) : 10;
              const mrp = price > 0 ? getMRP(price, productId) : 0;
              const rawImage = product?.image_url || product?.image;
              const image =
                (Array.isArray(rawImage) ? rawImage[0] : rawImage) ||
                "https://placehold.co/120x120?text=No+Image";
              const productPath = `/products/${getProductSlug(product)}`;

              return (
                <motion.div
                  key={productId}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.25 }}
                  className="flex gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
                >
                  <Link to={productPath} className="shrink-0">
                    <img
                      src={image}
                      alt={product?.name || "Product"}
                      className="w-24 h-24 object-cover rounded-xl bg-slate-100 dark:bg-slate-800"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      to={productPath}
                      className="font-semibold leading-snug hover:text-indigo-600 dark:hover:text-indigo-400 transition line-clamp-2"
                    >
                      {product?.name || `Product #${productId}`}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {product?.brand || "—"} • {product?.category || "—"}
                      {item.selectedSize && <span> • Size: {item.selectedSize}</span>}
                    </p>

                    {/* Delivery estimate */}
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                      <Truck size={11} /> Delivery by {estimatedDelivery()}
                    </p>

                    <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(productId, quantity - 1)}
                          disabled={quantity <= 1}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-medium">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(productId, quantity + 1)}
                          disabled={quantity >= maxAllowed}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                        >
                          <Plus size={14} />
                        </button>
                        <span className="ml-1 text-[11px] text-slate-500 dark:text-slate-400">
                          Max {maxAllowed}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {price > 0 ? formatINR(price * quantity) : "Price on request"}
                          </span>
                          {mrp > 0 && (
                            <span className="block text-xs text-slate-400 line-through">
                              {formatINR(mrp * quantity)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(productId)}
                          className="text-slate-400 hover:text-red-500 transition"
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Coupons are currently disabled.
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm h-fit sticky top-24"
        >
          <h2 className="text-xl font-bold mb-5">Order Summary</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Price ({totalItems} {totalItems === 1 ? "item" : "items"})</span>
              <span className="font-medium text-slate-900 dark:text-white">{formatINR(totalMRP)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Discount</span>
              <span>– {formatINR(totalMRP - totalPrice)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Delivery Charges</span>
              {freeDelivery ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">FREE</span>
              ) : (
                <span>₹{deliveryCharge}</span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-lg">
            <span>Total Amount</span>
            <span className="text-indigo-600 dark:text-indigo-400">
              {formatINR(finalPrice + deliveryCharge)}
            </span>
          </div>

          {totalSavings > 0 && (
            <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 font-medium text-center">
              🎉 You are saving {formatINR(totalSavings)} on this order!
            </div>
          )}

          <Link
            to="/checkout"
            className="mt-5 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
          >
            Proceed to Checkout
            <ChevronRight size={16} />
          </Link>

          <Link
            to="/products"
            className="mt-3 block text-center w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Continue Shopping
          </Link>

          {/* Trust badges */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck size={13} className="text-emerald-500" /> 100% Secure Checkout
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Truck size={13} className="text-indigo-500" /> Estimated delivery: {estimatedDelivery()}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}