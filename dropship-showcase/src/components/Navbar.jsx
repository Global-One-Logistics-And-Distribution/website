import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, User, LogOut, Menu, X, Package, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const linkCls = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive
        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
        : "hover:bg-slate-100 dark:hover:bg-slate-800"
    }`;

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
      <nav className="container-pad h-16 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="text-xl font-bold">
          <img src="" alt="Logo" className="h-8" />
        </NavLink>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/" className={linkCls}>Home</NavLink>
          <NavLink to="/products" className={linkCls}>Products</NavLink>
          <NavLink to="/about" className={linkCls}>About</NavLink>
          <NavLink to="/contact" className={linkCls}>Contact</NavLink>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Wishlist */}
          <NavLink to="/wishlist" className={linkCls} aria-label="Wishlist">
            <Heart className="inline w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Wishlist</span>
          </NavLink>

          {/* Cart */}
          <NavLink to="/cart" className={({ isActive }) =>
            `relative px-3 py-2 rounded-lg text-sm font-medium transition ${
              isActive
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`
          } aria-label="Cart">
            <ShoppingCart className="inline w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Cart</span>
            {totalItems > 0 && (
              <motion.span
                key={totalItems}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold px-1"
              >
                {totalItems > 99 ? "99+" : totalItems}
              </motion.span>
            )}
          </NavLink>

          {/* User menu */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <User size={16} />
                <span className="hidden sm:inline max-w-[80px] truncate">
                  {user.name}
                </span>
              </button>
            ) : (
              <NavLink to="/signin" className={linkCls}>
                <User className="inline w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Sign In</span>
              </NavLink>
            )}

            <AnimatePresence>
              {userMenuOpen && user && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1 z-50"
                >
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={() => { navigate("/orders"); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <Package size={14} className="text-slate-500" />
                    My Orders
                  </button>
                  <button
                    onClick={() => { navigate("/account"); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <Settings size={14} className="text-slate-500" />
                    Account Settings
                  </button>
                  <div className="border-t border-slate-100 dark:border-slate-800 mt-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ThemeToggle />

          {/* Mobile menu toggle */}
          <button
            className="md:hidden px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden"
          >
            <div className="container-pad py-3 flex flex-col gap-1">
              {[
                { to: "/", label: "Home" },
                { to: "/products", label: "Products" },
                { to: "/about", label: "About" },
                { to: "/contact", label: "Contact" },
              ].map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={linkCls}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
              {user && (
                <>
                  <NavLink to="/orders" className={linkCls} onClick={() => setMobileOpen(false)}>
                    My Orders
                  </NavLink>
                  <NavLink to="/account" className={linkCls} onClick={() => setMobileOpen(false)}>
                    Account Settings
                  </NavLink>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}