import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, User, LogOut, Menu, X, Package, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import brandLogo from "../assets/logo4.png";

export default function Navbar() {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const mainLinkCls = ({ isActive }) =>
    `px-5 py-2 rounded-full text-sm font-semibold transition ${
      isActive
        ? "bg-sky-100 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const utilityLinkCls = ({ isActive }) =>
    `relative px-2.5 py-2 rounded-full text-sm font-medium transition ${
      isActive
        ? "bg-sky-100 text-slate-900"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const mobileLinkCls = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive
        ? "bg-sky-100 text-slate-900"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="fixed top-3 md:top-4 left-0 right-0 z-50">
      <div className="container-pad pt-0">
        <nav className="h-20 rounded-[2rem] border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-[0_18px_40px_rgba(15,23,42,0.12)] px-3 md:px-6 flex items-center justify-between gap-2">
          {/* Logo */}
          <NavLink to="/" className="leading-tight select-none shrink-0 flex items-center gap-3">
            <img
              src={brandLogo}
              alt="EliteDrop logo"
              className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
            />
            <span>
              <span
                className="block text-xl md:text-2xl font-extrabold tracking-tight"
                style={{ color: "#0f172a" }}
              >
                EliteDrop
              </span>
              <span className="block text-[10px] md:text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">
                By G.O.L.D.
              </span>
            </span>
          </NavLink>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
            <NavLink to="/" className={mainLinkCls}>Home</NavLink>
            <NavLink to="/products" className={mainLinkCls}>Products</NavLink>
            <NavLink to="/about" className={mainLinkCls}>About</NavLink>
            <NavLink to="/contact" className={mainLinkCls}>Contact</NavLink>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Wishlist */}
          <NavLink to="/wishlist" className={utilityLinkCls} aria-label="Wishlist">
            <Heart className="inline w-4 h-4" />
          </NavLink>

          {/* Cart */}
          <NavLink to="/cart" className={utilityLinkCls} aria-label="Cart">
            <ShoppingCart className="inline w-4 h-4" />
            {totalItems > 0 && (
              <motion.span
                key={totalItems}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-cyan-400 text-slate-900 text-[10px] font-bold px-1"
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
                className="px-2.5 py-2 rounded-full text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition flex items-center gap-1.5"
              >
                <User size={16} />
                <span className="hidden md:inline max-w-[80px] truncate">
                  {user.name}
                </span>
              </button>
            ) : (
              <NavLink to="/signin" className={utilityLinkCls}>
                <User className="inline w-4 h-4" />
              </NavLink>
            )}

            <AnimatePresence>
              {userMenuOpen && user && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-lg py-1 z-50"
                >
                  <div className="px-4 py-2 border-b border-slate-200">
                    <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={() => { navigate("/orders"); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
                  >
                    <Package size={14} className="text-slate-500" />
                    My Orders
                  </button>
                  <button
                    onClick={() => { navigate("/account"); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
                  >
                    <Settings size={14} className="text-slate-500" />
                    Account Settings
                  </button>
                  <div className="border-t border-slate-200 mt-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden px-2 py-2 rounded-full text-slate-700 hover:bg-slate-100 transition"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        </nav>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden container-pad overflow-hidden"
          >
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl p-3 flex flex-col gap-1 shadow-[0_16px_35px_rgba(15,23,42,0.12)]">
              {[
                { to: "/", label: "Home" },
                { to: "/products", label: "Products" },
                { to: "/about", label: "About" },
                { to: "/contact", label: "Contact" },
              ].map(({ to, label }) => (
                <NavLink
                  key={`${to}-${label}`}
                  to={to}
                  className={mobileLinkCls}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
              {user && (
                <>
                  <NavLink to="/orders" className={mobileLinkCls} onClick={() => setMobileOpen(false)}>
                    My Orders
                  </NavLink>
                  <NavLink to="/account" className={mobileLinkCls} onClick={() => setMobileOpen(false)}>
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