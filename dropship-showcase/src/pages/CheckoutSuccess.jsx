import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { CheckCircle, Package } from "lucide-react";

export default function CheckoutSuccess() {
  const { state } = useLocation();
  const order = state?.order;

  return (
    <section className="container-pad py-20 flex justify-center">
      <Helmet>
        <title>Order Confirmed | EliteDrop</title>
      </Helmet>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
        >
          <CheckCircle className="w-20 h-20 mx-auto text-emerald-500 mb-6" />
        </motion.div>
        <h1 className="text-3xl font-bold mb-3">Order Confirmed!</h1>
        {order?.order_number && (
          <p className="text-sm font-mono bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-2 inline-block mb-4">
            Order #{order.order_number}
          </p>
        )}
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Thank you for your purchase. You can track your order in your account.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
          >
            <Package size={16} />
            Track Order
          </Link>
          <Link
            to="/products"
            className="inline-block px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Continue Shopping
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

