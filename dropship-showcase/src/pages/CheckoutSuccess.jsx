import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { CheckCircle, Download, ExternalLink, Loader2, Package } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://elitedrop-admin.onrender.com/api");

export default function CheckoutSuccess() {
  const { user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const orderFromState = location.state?.order;
  const [order, setOrder] = useState(orderFromState || null);
  const [loading, setLoading] = useState(!orderFromState);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [creatingRazorpayInvoice, setCreatingRazorpayInvoice] = useState(false);

  const orderNumber = useMemo(() => {
    if (orderFromState?.order_number) return orderFromState.order_number;
    const params = new URLSearchParams(location.search);
    return params.get("order") || "";
  }, [location.search, orderFromState]);

  useEffect(() => {
    if (!user || !token) {
      toast.error("Please sign in to view order confirmation.");
      navigate("/signin", { replace: true, state: { redirectTo: location.pathname + location.search } });
      return;
    }

    if (!orderNumber) {
      toast.error("Order confirmation link is invalid.");
      navigate("/orders", { replace: true });
      return;
    }

    if (orderFromState?.order_number === orderNumber) {
      setOrder(orderFromState);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`${API}/orders/${encodeURIComponent(orderNumber)}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Unable to load order confirmation.");
        }
        if (!cancelled) {
          setOrder(data?.order || null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Unable to verify this order confirmation.");
          navigate("/orders", { replace: true });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, token, navigate, location.pathname, location.search, orderNumber, orderFromState]);

  useEffect(() => {
    if (!token || !order?.order_number || order?.invoice_url || creatingRazorpayInvoice) {
      return;
    }

    let cancelled = false;
    setCreatingRazorpayInvoice(true);

    fetch(`${API}/orders/${encodeURIComponent(order.order_number)}/invoice/create/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Unable to prepare Razorpay invoice.");
        }

        if (!cancelled) {
          setOrder((prev) => ({
            ...(prev || {}),
            invoice_id: data?.invoice_id || prev?.invoice_id || "",
            invoice_number: data?.invoice_number || prev?.invoice_number || "",
            invoice_status: data?.invoice_status || prev?.invoice_status || "",
            invoice_url: data?.invoice_url || prev?.invoice_url || "",
          }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not prepare Razorpay invoice link. You can still download the invoice.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCreatingRazorpayInvoice(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, order?.order_number, order?.invoice_url, creatingRazorpayInvoice]);

  if (loading) {
    return (
      <section className="container-pad py-20 flex justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
          <p className="text-slate-600 dark:text-slate-300">Verifying your order confirmation...</p>
        </div>
      </section>
    );
  }

  if (!order) {
    return null;
  }

  const handleDownloadInvoice = async () => {
    if (!token || !order?.order_number) {
      toast.error("Invoice is not available right now.");
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
          Thank you for your purchase. Your Razorpay invoice is shown below and has also been emailed to you.
        </p>
        {creatingRazorpayInvoice && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Preparing Razorpay invoice link...
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {order?.invoice_url ? (
            <a
              href={order.invoice_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
            >
              <ExternalLink size={16} />
              View Razorpay Invoice
            </a>
          ) : (
            <button
              type="button"
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice || creatingRazorpayInvoice}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-60"
            >
              {downloadingInvoice ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Download Invoice
            </button>
          )}
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

