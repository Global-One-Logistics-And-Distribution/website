import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getFirebaseAuthErrorMessage, isFirebaseAuthConfigured, signInWithGoogleFirebase } from "../lib/firebase";

const API = import.meta.env.VITE_API_URL || "/api";
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.elitedrop.net.in";

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectParam = new URLSearchParams(location.search).get("redirectTo");
  const requestedRedirect = location.state?.redirectTo || location.state?.from || redirectParam || "/";
  const from = typeof requestedRedirect === "string" && requestedRedirect.startsWith("/") ? requestedRedirect : "/";
  const hasFirebaseAuth = isFirebaseAuthConfigured();

  const [form, setForm] = useState({ email: "", password: "", rememberMe: true });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email.";
    if (!form.password) errs.password = "Password is required.";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/signin/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          remember_me: form.rememberMe,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.requires_verification) {
          toast.error(data.error || "Please verify your email to continue.");
          navigate(`/verify-email?redirectTo=${encodeURIComponent(from)}`, {
            replace: true,
            state: { email: form.email, redirectTo: from },
          });
          return;
        }
        toast.error(data.error || "Sign in failed.");
        return;
      }
      login(data.token, data.user, { rememberMe: form.rememberMe });
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(from, { replace: true });
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignin = async () => {
    setSocialLoading(true);
    try {
      const payload = await signInWithGoogleFirebase();
      const res = await fetch(`${API}/auth/social/firebase/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: payload.idToken,
          name: payload.name,
          remember_me: form.rememberMe,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.detail || data.error || "Firebase Google sign in failed.");
        return;
      }
      login(data.token, data.user, { rememberMe: form.rememberMe });
      toast.success(`Welcome, ${data.user.name}!`);
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(getFirebaseAuthErrorMessage(error));
    } finally {
      setSocialLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden -mt-24 pt-24 pb-10 md:-mt-28 md:pt-28 md:pb-14">
      <Helmet>
        <title>Sign In | EliteDrop</title>
        <link rel="canonical" href={`${SITE_URL}/signin`} />
      </Helmet>

      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.26),transparent_32%),radial-gradient(circle_at_right,rgba(15,23,42,0.8),transparent_40%),linear-gradient(135deg,#050816_0%,#0f172a_45%,#111827_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-60 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:72px_72px]" />

      <div className="container-pad relative z-10 grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="order-2 lg:order-1 text-slate-700">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-4 py-1 text-[11px] font-semibold tracking-[0.24em] uppercase backdrop-blur-md text-slate-600 shadow-sm">
            Premium shopping portal
          </span>
          <h1 className="mt-5 text-4xl md:text-6xl font-semibold leading-tight max-w-xl text-slate-900">
            Sign in to a curated dropship experience.
          </h1>
          <p className="mt-4 max-w-lg text-slate-600 text-sm md:text-base leading-relaxed">
            Track orders, save favorites, and shop premium collections inside a polished glass interface built for modern commerce.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 max-w-xl">
            {[
              { label: "Fast checkout", value: "1 tap" },
              { label: "Verified catalog", value: "Live" },
              { label: "Secure access", value: "256-bit" },
              { label: "Support", value: "24/7" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white/90 p-4 backdrop-blur-xl shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="order-1 lg:order-2 w-full max-w-md mx-auto"
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl text-slate-900">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.8),transparent_36%)] pointer-events-none" />

            <div className="relative mb-8 text-center">
              <LogIn className="w-10 h-10 mx-auto text-indigo-500 mb-3" />
              <h1 className="text-3xl font-bold">Welcome back</h1>
              <p className="text-slate-500 mt-1 text-sm">Sign in to your EliteDrop account</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="relative space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-slate-700">
                  Email address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className={`w-full px-4 py-3 rounded-2xl border text-sm bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-400/70 transition backdrop-blur-md ${errors.email ? "border-red-400" : "border-slate-200"}`}
                  />
                  {errors.email && (
                    <p className="absolute right-3 top-3 text-xs text-red-600 bg-red-50 px-1 rounded">{errors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5 text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 pr-11 rounded-2xl border text-sm bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-400/70 transition backdrop-blur-md ${errors.password ? "border-red-400" : "border-slate-200"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {errors.password && (
                    <p className="absolute right-11 top-3 text-xs text-red-600 bg-red-50 px-1 rounded">{errors.password}</p>
                  )}
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading || socialLoading}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 text-white font-semibold text-sm hover:brightness-110 disabled:opacity-60 transition shadow-[0_14px_35px_rgba(56,189,248,0.20)]"
              >
                {loading ? "Signing in…" : "Sign In"}
              </motion.button>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={(e) => setForm((prev) => ({ ...prev, rememberMe: e.target.checked }))}
                  className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-400"
                />
                Keep me logged in
              </label>

              <div className="relative py-1">
                <div className="h-px bg-slate-200" />
                <span className="absolute inset-x-0 -top-2 mx-auto w-fit bg-white px-2 text-xs text-slate-500 rounded">
                  OR
                </span>
              </div>

              {hasFirebaseAuth ? (
                <button
                  type="button"
                  onClick={handleGoogleSignin}
                  disabled={socialLoading}
                  className="w-full py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition backdrop-blur-md"
                >
                  Continue with Google
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 rounded-2xl border border-slate-200 text-sm text-slate-400"
                >
                  Continue with Google (Firebase not configured)
                </button>
              )}
            </form>

            <p className="relative mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link
                to={`/signup?redirectTo=${encodeURIComponent(from)}`}
                state={{ redirectTo: from }}
                className="text-cyan-600 font-medium hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
