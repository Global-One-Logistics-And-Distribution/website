import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getFirebaseAuthErrorMessage, isFirebaseAuthConfigured, signInWithGoogleFirebase } from "../lib/firebase";

const getApiBaseUrl = () =>
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://elitedrop-admin.onrender.com/api");

const API = getApiBaseUrl();

export default function SignUp() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectParam = new URLSearchParams(location.search).get("redirectTo");
  const requestedRedirect = location.state?.redirectTo || redirectParam || "/";
  const redirectTo = typeof requestedRedirect === "string" && requestedRedirect.startsWith("/") ? requestedRedirect : "/";
  const hasFirebaseAuth = isFirebaseAuthConfigured();

  const [form, setForm] = useState({ email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email.";
    if (!form.password || form.password.length < 8)
      errs.password = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(form.password))
      errs.password = "Password must contain an uppercase letter.";
    else if (!/[0-9]/.test(form.password))
      errs.password = "Password must contain a number.";
    else if (/^\d+$/.test(form.password))
      errs.password = "Password cannot be entirely numeric.";
    else if (/(password|123456|qwerty)/i.test(form.password))
      errs.password = "Password is too common. Choose a less predictable password.";
    if (form.password !== form.confirm)
      errs.confirm = "Passwords do not match.";
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
      const res = await fetch(`${API}/auth/signup/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json().catch(() => ({}))
        : { error: await res.text().catch(() => "") };

      if (!res.ok) {
        if (Array.isArray(data.errors)) {
          const fieldErrors = {};
          data.errors.forEach((err) => {
            const key = err?.path || "form";
            if (!fieldErrors[key]) {
              fieldErrors[key] = err?.msg || "Invalid value.";
            }
          });
          const firstMsg = fieldErrors.form || fieldErrors.email || fieldErrors.password;
          if (firstMsg) toast.error(firstMsg);
          setErrors(fieldErrors);
        } else if (res.status === 409) {
          const message = data?.error || "Email is already registered.";
          setErrors({ email: message });
          toast.error(message);
        } else {
          const serverMessage =
            data?.error ||
            data?.detail ||
            data?.message ||
            (res.status >= 500 ? "Server error while creating account. Please try again." : "Sign up failed.");
          setErrors({ form: serverMessage });
          toast.error(serverMessage);
        }
        return;
      }

      if (data.requires_verification) {
        toast.success(data.message || "Verification code sent to your email.");
        const query = new URLSearchParams({
          email: data.user?.email || form.email,
          completeProfile: "1",
          redirectTo,
        }).toString();

        navigate(`/verify-email?${query}`, {
          replace: true,
          state: {
            email: data.user?.email || form.email,
            redirectTo,
            devVerificationCode: data.dev_verification_code || "",
            postVerifyRequireName: true,
          },
        });
        return;
      }

      if (data.token && data.user) {
        login(data.token, data.user);
        toast.success(`Welcome, ${data.user.name}!`);
        navigate(redirectTo, { replace: true });
      } else {
        toast.success("Account created. Please sign in.");
        navigate(`/signin?redirectTo=${encodeURIComponent(redirectTo)}`, {
          replace: true,
          state: { redirectTo },
        });
      }
    } catch (err) {
      const message = err?.message || "Network error. Please try again.";
      setErrors({ form: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const payload = await signInWithGoogleFirebase();
      const res = await fetch(`${API}/auth/social/firebase/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: payload.idToken, name: payload.name, remember_me: rememberMe }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.detail || data.error || "Firebase Google sign up failed.");
        return;
      }

      login(data.token, data.user, { rememberMe });
      toast.success(`Welcome, ${data.user.name}!`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(getFirebaseAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const strengthScore = (() => {
    let score = 0;
    if (form.password.length >= 8) score++;
    if (/[A-Z]/.test(form.password)) score++;
    if (/[0-9]/.test(form.password)) score++;
    if (/[^A-Za-z0-9]/.test(form.password)) score++;
    return score;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strengthScore];
  const strengthColor = ["", "bg-red-500", "bg-amber-400", "bg-yellow-400", "bg-emerald-500"][strengthScore];

  return (
    <section className="container-pad py-16 flex justify-center">
      <Helmet>
        <title>Sign Up | EliteDrop</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <div className="mb-8 text-center">
            <UserPlus className="w-10 h-10 mx-auto text-indigo-500 mb-3" />
            <h1 className="text-3xl font-bold">Create an account</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Sign up with email and password, then verify your email
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
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
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                    errors.email ? "border-red-500" : "border-slate-300 dark:border-slate-700"
                  }`}
                />
                {errors.email && <p id="email-error" role="alert" className="absolute right-3 top-3 text-xs text-red-500 bg-white dark:bg-slate-800 px-1">{errors.email}</p>}
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className={`w-full px-4 py-2.5 pr-11 rounded-xl border text-sm bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                    errors.password ? "border-red-500" : "border-slate-300 dark:border-slate-700"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength bar */}
              {form.password.length > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${strengthColor} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(strengthScore / 4) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-xs mt-1 text-slate-500">{strengthLabel}</p>
                </div>
              )}
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  name="confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={handleChange}
                  aria-invalid={!!errors.confirm}
                  aria-describedby={errors.confirm ? "confirm-error" : undefined}
                  placeholder="Repeat your password"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                    errors.confirm ? "border-red-500" : "border-slate-300 dark:border-slate-700"
                  }`}
                />
                {errors.confirm && <p id="confirm-error" className="absolute right-3 top-3 text-xs text-red-500 bg-white dark:bg-slate-800 px-1">{errors.confirm}</p>}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4"
              />
              Remember me
            </label>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {loading ? "Creating account…" : "Create Account"}
            </motion.button>

            <div className="relative py-1">
              <div className="h-px bg-slate-200 dark:bg-slate-700" />
              <span className="absolute inset-x-0 -top-2 mx-auto w-fit bg-white dark:bg-slate-900 px-2 text-xs text-slate-500">
                OR
              </span>
            </div>

            {hasFirebaseAuth ? (
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading}
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
            {errors.form && <p className="text-xs text-red-500 text-right">{errors.form}</p>}
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              to={`/signin?redirectTo=${encodeURIComponent(redirectTo)}`}
              state={{ redirectTo }}
              className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </section>
  );
}
