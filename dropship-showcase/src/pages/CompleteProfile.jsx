import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://elitedrop-admin.onrender.com/api");
const SITE_URL = "https://www.elitedrop.net.in";

export default function CompleteProfile() {
  const { user, token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(() => location.state?.redirectTo || "/", [location.state]);
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  if (!user || !token) {
    navigate("/signin", { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Please enter your full name.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/me/update/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Could not save your profile.");
        return;
      }

      login(token, data.user);
      toast.success("Profile updated!");
      navigate(redirectTo, { replace: true });
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="container-pad py-16 flex justify-center">
      <Helmet>
        <title>Complete Profile | EliteDrop</title>
        <link rel="canonical" href={`${SITE_URL}/complete-profile`} />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <div className="mb-6 text-center">
            <User className="w-10 h-10 mx-auto text-indigo-500 mb-3" />
            <h1 className="text-3xl font-bold">One last step</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Tell us your name so we can personalize your orders.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                minLength={2}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save and Continue"}
            </button>
          </form>
        </div>
      </motion.div>
    </section>
  );
}
