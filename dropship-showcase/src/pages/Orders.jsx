import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Package, ChevronDown, ChevronUp, Clock, CheckCircle, Truck, Home, XCircle, Loader2, Download, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { formatINR } from "../utils/currency";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://elitedrop-admin.onrender.com/api");

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Clock },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  shipped: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  out_for_delivery: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
  delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

function TrackingBar({ status }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm py-2">
        <XCircle size={16} />
        Order Cancelled
      </div>
    );
  }

  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="relative flex items-center justify-between mt-2 mb-1">
      {/* Progress line */}
      <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
      <div
        className="absolute left-0 top-4 h-0.5 bg-indigo-500 z-0 transition-all duration-500"
        style={{
          width: currentIndex < 0 ? "0%" : `${(currentIndex / (STATUS_STEPS.length - 1)) * 100}%`,
        }}
      />

      {STATUS_STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done = idx <= currentIndex;
        const active = idx === currentIndex;
        return (
          <div key={step.key} className="relative z-10 flex flex-col items-center gap-1 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                ${done
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-400"
                }
                ${active ? "ring-2 ring-indigo-300 ring-offset-1" : ""}
              `}
            >
              {done && !active ? (
                <CheckCircle size={16} />
              ) : (
                <Icon size={14} />
              )}
            </div>
            <span className={`text-[10px] font-medium text-center leading-tight ${done ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order, token, onOrderPatched }) {
  const [expanded, setExpanded] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnResolution, setReturnResolution] = useState("refund");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const returnRequests = Array.isArray(order.return_requests) ? order.return_requests : [];
  const hasReturnRequest = returnRequests.length > 0;
  const canRequestReturn = !hasReturnRequest;

  const handleDownloadInvoice = async () => {
    if (!token) {
      toast.error("Please sign in to download invoice.");
      return;
    }

    setDownloadingInvoice(true);
    try {
      const res = await fetch(`${API}/orders/${encodeURIComponent(order.order_number)}/invoice/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Unable to download invoice.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `invoice-${order.order_number}.html`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded.");
    } catch (error) {
      toast.error(error?.message || "Unable to download invoice.");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleSubmitReturn = async () => {
    const reason = String(returnReason || "").trim();
    if (reason.length < 10) {
      toast.error("Please provide a detailed return reason.");
      return;
    }

    setReturnSubmitting(true);
    try {
      const res = await fetch(`${API}/orders/returns/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_number: order.order_number, reason, resolution: returnResolution }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.errors?.reason?.[0] || "Unable to create return request.");
      }

      const created = data?.request || null;
      if (created) {
        onOrderPatched?.({
          ...order,
          return_requests: [...returnRequests.filter((item) => item.id !== created.id), created],
        });
      }
      setReturnReason("");
      setReturnResolution("Refund");
      setShowReturnForm(false);
      toast.success("Return request submitted");
    } catch (error) {
      toast.error(error?.message || "Unable to submit return request.");
    } finally {
      setReturnSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="w-full p-5 flex items-start justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <span className="font-semibold text-sm font-mono">{order.order_number}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || ""}`}>
              {order.status_display}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {new Date(order.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {order.items?.length} {order.items?.length === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-2">
          <p className="font-bold text-base">{formatINR(Number(order.total_amount))}</p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label={expanded ? "Collapse order" : "Expand order"}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-5">
          {/* Tracking */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Delivery Tracking</h3>
            <TrackingBar status={order.status} />
          </div>

          {/* Items */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Items</h3>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-12 h-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                      <Package size={20} className="text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{item.product_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatINR(Number(item.price))} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold shrink-0">
                    {formatINR(Number(item.subtotal))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Shipping Address</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {order.shipping_name}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {order.shipping_address}, {order.shipping_city}
              {order.shipping_state ? `, ${order.shipping_state}` : ""} – {order.shipping_pincode}
            </p>
            {order.shipping_phone && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{order.shipping_phone}</p>
            )}
          </div>

          {/* Total */}
          <div className="flex justify-between text-sm font-semibold border-t border-slate-100 dark:border-slate-800 pt-3">
            <span>Order Total</span>
            <span>{formatINR(Number(order.total_amount))}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Invoice: HTML download
            </p>
            <button
              type="button"
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition"
            >
              {downloadingInvoice ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download Invoice
            </button>
          </div>

          {returnRequests.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              {returnRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-cyan-950/30 p-4 text-sm shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {request.status?.replace(/_/g, " ") || "Requested"}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
                      {request.resolution_display || request.resolution || "Refund"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Refund status: {request.refund_status?.replace(/_/g, " ") || "Pending"}</span>
                    {request.resolved_at && <span>Resolved</span>}
                  </div>
                  <p className="mt-2 text-slate-700 dark:text-slate-200 line-clamp-3">{request.reason}</p>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            {showReturnForm ? (
              <div className="space-y-3 rounded-2xl border border-indigo-200/70 dark:border-indigo-900 bg-gradient-to-br from-indigo-50 via-white to-amber-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-amber-950/30 p-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Return or Refund</label>
                  <select
                    value={returnResolution}
                    onChange={(e) => setReturnResolution(e.target.value)}
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="refund">Refund</option>
                    <option value="return">Return</option>
                  </select>
                </div>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={3}
                  placeholder="Tell us why you need a return or refund..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSubmitReturn}
                    disabled={returnSubmitting}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition"
                  >
                    {returnSubmitting ? "Submitting..." : "Submit Refund Request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReturnForm(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              canRequestReturn && (
                <button
                  type="button"
                  onClick={() => {
                    setShowReturnForm(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
                >
                  <RotateCcw size={14} /> Initiate Refund
                </button>
              )
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function Orders() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleOrderPatched = (patchedOrder) => {
    if (!patchedOrder?.id) return;
    setOrders((prev) => prev.map((item) => (item.id === patchedOrder.id ? patchedOrder : item)));
  };

  useEffect(() => {
    if (!user || !token) {
      setLoading(false);
      return;
    }
    fetch(`${API}/orders/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setOrders(Array.isArray(data.orders) ? data.orders : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user, token]);

  if (!user) {
    return (
      <section className="container-pad py-16 text-center">
        <Helmet><title>My Orders | EliteDrop</title></Helmet>
        <p className="text-slate-500 dark:text-slate-400 mb-4">Please sign in to view your orders.</p>
        <button
          onClick={() => navigate("/signin")}
          className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
        >
          Sign In
        </button>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="container-pad py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </section>
    );
  }

  if (orders.length === 0) {
    return (
      <section className="container-pad py-16 text-center">
        <Helmet><title>My Orders | EliteDrop</title></Helmet>
        <Package className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2">No orders yet</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">Place your first order to see it here.</p>
        <button
          onClick={() => navigate("/products")}
          className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
        >
          Browse Products
        </button>
      </section>
    );
  }

  return (
    <section className="container-pad py-10">
      <Helmet><title>My Orders | EliteDrop</title></Helmet>
      <motion.h1
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-3xl font-bold mb-8"
      >
        My Orders
      </motion.h1>
      <div className="space-y-4 max-w-3xl">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            token={token}
            onOrderPatched={handleOrderPatched}
          />
        ))}
      </div>
    </section>
  );
}
