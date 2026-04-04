import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getFirebaseAuthErrorMessage, isFirebaseAuthConfigured, signInWithGoogleFirebase } from "../lib/firebase";
import TurnstileWidget from "../components/TurnstileWidget";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://elitedrop-admin.onrender.com/api");

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
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(true);
  const [turnstileError, setTurnstileError] = useState("");

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

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

    if (!turnstileReady) {
      toast.error(turnstileError || "Security verification is temporarily unavailable. Please retry.");
      return;
    }

    if (!turnstileToken) {
      toast.error("Please complete Turnstile verification.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/signin/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          remember_me: form.rememberMe,
          turnstile_token: turnstileToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.requires_verification) {
          toast.error(data.error || "Please verify your email to continue.");
          navigate(`/verify-email?redirectTo=${encodeURIComponent(from)}`, {
            replace: true,
            state: {
              email: form.email,
              redirectTo: from,
            },
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
      if (!turnstileReady) {
        toast.error(turnstileError || "Security verification is temporarily unavailable. Please retry.");
        return;
      }

      if (!turnstileToken) {
        toast.error("Please complete Turnstile verification.");
        return;
      }

      const payload = await signInWithGoogleFirebase();
      const res = await fetch(`${API}/auth/social/firebase/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: payload.idToken,
          name: payload.name,
          remember_me: form.rememberMe,
          turnstile_token: turnstileToken,
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
    <section className="container-pad py-16 flex justify-center">
      <Helmet>
        <title>Sign In | EliteDrop</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <div className="mb-8 text-center">
            <LogIn className="w-10 h-10 mx-auto text-indigo-500 mb-3" />
            <h1 className="text-3xl font-bold">Welcome back</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Sign in to your EliteDrop account
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
              >
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
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                    errors.email
                      ? "border-red-500"
                      : "border-slate-300 dark:border-slate-700"
                  }`}
                />
                {errors.email && (
                  <p className="absolute right-3 top-3 text-xs text-red-500 bg-white dark:bg-slate-800 px-1">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
              >
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
                  className={`w-full px-4 py-2.5 pr-11 rounded-xl border text-sm bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                    errors.password
                      ? "border-red-500"
                      : "border-slate-300 dark:border-slate-700"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {errors.password && (
                  <p className="absolute right-11 top-3 text-xs text-red-500 bg-white dark:bg-slate-800 px-1">{errors.password}</p>
                )}
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading || socialLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {loading ? "Signing in…" : "Sign In"}
            </motion.button>

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.rememberMe}
                onChange={(e) => setForm((prev) => ({ ...prev, rememberMe: e.target.checked }))}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Keep me logged in
            </label>

            <TurnstileWidget
              onToken={(token) => {
                setTurnstileToken(token);
                if (token) setTurnstileError("");
              }}
              onExpire={() => setTurnstileToken("")}
              onAvailabilityChange={(isReady) => setTurnstileReady(isReady)}
              onServiceError={(message) => setTurnstileError(message)}
            />
            {turnstileError && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">{turnstileError}</p>
            )}

            <div className="relative py-1">
              <div className="h-px bg-slate-200 dark:bg-slate-700" />
              <span className="absolute inset-x-0 -top-2 mx-auto w-fit bg-white dark:bg-slate-900 px-2 text-xs text-slate-500">
                OR
              </span>
            </div>

            {hasFirebaseAuth ? (
              <button
                type="button"
                onClick={handleGoogleSignin}
                disabled={socialLoading}
                className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition"
              >
                Continue with Google
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm text-slate-400"
              >
                Continue with Google (Firebase not configured)
              </button>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              to={`/signup?redirectTo=${encodeURIComponent(from)}`}
              state={{ redirectTo: from }}
              className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </section>
  );
}
