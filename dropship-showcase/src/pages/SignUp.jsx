import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://dropship-v2.onrender.com/api");

export default function SignUp() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
        }).toString();

        navigate(`/verify-email?${query}`, {
          replace: true,
          state: {
            email: data.user?.email || form.email,
            redirectTo: "/",
            devVerificationCode: data.dev_verification_code || "",
            postVerifyRequireName: true,
          },
        });
        return;
      }

      if (data.token && data.user) {
        login(data.token, data.user);
        toast.success(`Welcome, ${data.user.name}!`);
        navigate("/");
      } else {
        toast.success("Account created. Please sign in.");
        navigate("/signin");
      }
    } catch (err) {
      const message = err?.message || "Network error. Please try again.";
      setErrors({ form: message });
      toast.error(message);
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
        <title>Sign Up | G.O.L.D</title>
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
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                    errors.email ? "border-red-500" : "border-slate-300 dark:border-slate-700"
                  }`}
                />
                {errors.email && <p className="absolute right-3 top-3 text-xs text-red-500 bg-white dark:bg-slate-800 px-1">{errors.email}</p>}
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
                  placeholder="Repeat your password"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                    errors.confirm ? "border-red-500" : "border-slate-300 dark:border-slate-700"
                  }`}
                />
                {errors.confirm && <p className="absolute right-3 top-3 text-xs text-red-500 bg-white dark:bg-slate-800 px-1">{errors.confirm}</p>}
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {loading ? "Creating account…" : "Create Account"}
            </motion.button>
            {errors.form && <p className="text-xs text-red-500 text-right">{errors.form}</p>}
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              to="/signin"
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
