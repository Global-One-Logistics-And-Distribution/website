import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, ExternalLink, AlertCircle, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://elitedrop-admin.onrender.com/api");

export default function OrderInvoiceCreate() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");

  useEffect(() => {
    if (!token) {
      toast.error("Please sign in to create the invoice.");
      navigate(`/signin?redirectTo=${encodeURIComponent(`/orders/${orderNumber}/invoice/create`)}`);
      return;
    }

    if (!orderNumber) {
      setError("Invalid order number.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetch(`${API}/orders/${encodeURIComponent(orderNumber)}/invoice/create/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || data?.detail || "Unable to create Razorpay invoice.");
        }
        if (cancelled) return;
        const nextUrl = data?.invoice_url || "";
        setInvoiceUrl(nextUrl);
        if (nextUrl) {
          window.location.replace(nextUrl);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Unable to create Razorpay invoice.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, orderNumber, navigate]);

  return (
    <section className="container-pad py-20 flex justify-center">
      <Helmet>
        <title>Create Invoice | EliteDrop</title>
      </Helmet>
      <div className="max-w-md w-full text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300">
          {loading ? <Loader2 className="h-7 w-7 animate-spin" /> : <FileText className="h-7 w-7" />}
        </div>
        <h1 className="text-2xl font-bold mb-2">Creating Razorpay invoice</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {loading
            ? "Please wait while we prepare your invoice link."
            : error || "The invoice is ready."}
        </p>

        {error ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-4 text-left mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {invoiceUrl ? (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
            >
              <ExternalLink size={16} />
              Open Invoice
            </a>
          ) : null}
          <Link
            to="/orders"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    </section>
  );
}
