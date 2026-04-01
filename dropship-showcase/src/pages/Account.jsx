import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { User, Mail, Lock, Trash2, Save, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://dropship-v2.onrender.com/api");

export default function Account() {
  const { user, token, login, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user) {
    return (
      <section className="container-pad py-16 text-center">
        <Helmet>
          <title>Account | EliteDrop</title>
        </Helmet>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          Please sign in to view your account.
        </p>
        <button
          onClick={() => navigate("/signin")}
          className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
        >
          Sign In
        </button>
      </section>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
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
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update profile.");
        return;
      }
      login(token, data.user);
      toast.success("Profile updated!");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      toast.error("Please enter your password to confirm.");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`${API}/auth/me/delete/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete account.");
        return;
      }
      logout();
      toast.success("Account deleted.");
      navigate("/");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="container-pad py-10 max-w-2xl mx-auto">
      <Helmet>
        <title>Account | EliteDrop</title>
      </Helmet>

      <motion.h1
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-3xl font-bold mb-8"
      >
        My Account
      </motion.h1>

      {/* Profile edit form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm mb-6"
      >
        <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
          <User size={18} className="text-indigo-500" />
          Edit Profile
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Your full name"
                minLength={2}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Your email"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition"
          >
            <Save size={15} />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </motion.div>

      {/* Order history shortcut */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm mb-6"
      >
        <h2 className="text-lg font-semibold mb-2">My Orders</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          View your order history and track deliveries.
        </p>
        <button
          onClick={() => navigate("/orders")}
          className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          View Orders
        </button>
      </motion.div>

      {/* Delete account */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
          <AlertTriangle size={18} />
          Danger Zone
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition"
          >
            <Trash2 size={15} />
            Delete Account
          </button>
        ) : (
          <form onSubmit={handleDelete} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-red-600 dark:text-red-400">
                Enter your password to confirm
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-red-300 dark:border-red-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Your password"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition"
              >
                <Trash2 size={15} />
                {deleting ? "Deleting…" : "Confirm Delete"}
              </button>
              <button
                type="button"
                onClick={() => { setShowDelete(false); setDeletePassword(""); }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </section>
  );
}
