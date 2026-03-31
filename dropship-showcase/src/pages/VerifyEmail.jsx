import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://dropship-v2.onrender.com/api");

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const fallbackEmail = useMemo(() => {
    const urlEmail = new URLSearchParams(location.search).get("email");
    return location.state?.email || urlEmail || user?.email || "";
  }, [location.search, location.state, user?.email]);

  const redirectTo = location.state?.redirectTo || "/";

  const [email, setEmail] = useState(fallbackEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    setEmail(fallbackEmail);
  }, [fallbackEmail]);

  useEffect(() => {
    if (user?.email_verified) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo, user?.email_verified]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Enter a valid email.");
      return;
    }
    if (!code || code.trim().length < 4) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-email/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || "Verification failed.");
        return;
      }

      if (data.token && data.user) {
        login(data.token, data.user);
        toast.success("Email verified!");
        navigate(redirectTo, { replace: true });
      } else {
        toast.success("Email verified! You can sign in now.");
        navigate("/signin", { replace: true });
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Enter a valid email to resend the code.");
      return;
    }
    setResending(true);
    try {
      const res = await fetch(`${API}/auth/resend-verification/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not resend code.");
        return;
      }
      toast.success(data.message || "Verification code sent.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <section className="container-pad py-16 flex justify-center">
      <Helmet>
        <title>Verify Email | G.O.L.D</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <div className="mb-6 text-center">
            <MailCheck className="w-10 h-10 mx-auto text-indigo-500 mb-3" />
            <h1 className="text-3xl font-bold">Verify your email</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Enter the 6-digit code we just sent to your inbox.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition border-slate-300 dark:border-slate-700"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\\D/g, ""))}
                className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition tracking-widest text-center font-semibold border-slate-300 dark:border-slate-700"
                placeholder="123456"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                </>
              ) : (
                "Verify Email"
              )}
            </motion.button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-60"
            >
              <RefreshCw className="w-4 h-4" />
              {resending ? "Sending…" : "Resend code"}
            </button>
            <Link to="/signin" className="hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
