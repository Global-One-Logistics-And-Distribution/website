import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Truck,
  RefreshCcw,
  Headphones,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  CreditCard,
  Smartphone,
  Banknote,
} from "lucide-react";

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "100% Genuine", sub: "Verified products only" },
  { icon: Truck, label: "Free Delivery", sub: "On all orders" },
  { icon: Headphones, label: "24/7 Support", sub: "Always here to help" },
];

const QUICK_LINKS = [
  { label: "Home", to: "/" },
  { label: "Products", to: "/products" },
  { label: "About Us", to: "/about" },
  { label: "Contact Us", to: "/contact" },
  { label: "My Orders", to: "/orders" },
  { label: "Wishlist", to: "/wishlist" },
];

const HELP_LINKS = [
  { label: "My Account", to: "/account" },
  { label: "Track Order", to: "/orders" },
  { label: "Return Policy", to: "/return-policy" },
  { label: "Shipping Info", to: "/shipping-policy" },
  { label: "FAQ", to: "/contact" },
];

const CATEGORIES = [
  "Luxury Bags",
  "Luxury Watches",
  "Luxury Shoes",
  "Sunglasses",
  "Accessories",
];

const SOCIALS = [
  { icon: Instagram, label: "Instagram", href: "https://instagram.com/elitedrop_g.o.l.d" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!e.target.checkValidity()) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="relative isolate overflow-hidden border-t border-slate-200 dark:border-slate-800 mt-16 bg-[linear-gradient(125deg,#ecfeff_0%,#f8fafc_40%,#ecfccb_100%)] dark:bg-[linear-gradient(125deg,#020617_0%,#0f172a_45%,#083344_100%)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-28 left-1/4 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/20" />
        <div className="absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-lime-300/20 blur-3xl dark:bg-emerald-500/15" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.55),transparent_42%)] dark:bg-[radial-gradient(circle_at_25%_20%,rgba(15,118,110,0.28),transparent_42%)]" />
      </div>
      {/* Trust badges strip */}
      <div className="border-b border-slate-100 dark:border-slate-800 bg-white/75 dark:bg-slate-900/65 backdrop-blur-md">
        <div className="container-pad py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <Icon size={18} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer columns */}
      <div className="container-pad py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
              EliteDrop
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
              Your premium destination for authentic luxury goods — handbags, watches, shoes, and accessories delivered straight to your door.
            </p>

            {/* Contact info */}
            <div className="space-y-2">
              <a href="tel:+917208999095" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                <Phone size={14} /> +91 7208999095
              </a>
              <a href="mailto:support@elitedrop.net.in" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                <Mail size={14} /> support@elitedrop.net.in
              </a>
              <p className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                <MapPin size={14} className="mt-0.5 shrink-0" /> Mumbai, Maharashtra, India – 400706
              </p>
            </div>

            {/* Socials */}
            <div className="flex gap-3 pt-1">
              {SOCIALS.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 transition"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {QUICK_LINKS.map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    <ChevronRight size={13} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4">Help & Support</h3>
            <ul className="space-y-2">
              {HELP_LINKS.map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    <ChevronRight size={13} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200 mt-6 mb-4">Categories</h3>
            <ul className="space-y-2">
              {CATEGORIES.map((cat) => (
                <li key={cat}>
                  <Link
                    to={`/products?category=${encodeURIComponent(cat)}`}
                    className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    <ChevronRight size={13} />
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>

            {/* Payment methods */}
            <div className="mt-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">We Accept</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: CreditCard, label: "Cards" },
                  { icon: Smartphone, label: "UPI" },
                  { icon: Banknote, label: "COD" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium"
                  >
                    <Icon size={13} />
                    {label}
                  </div>
                ))}
                <div className="flex items-center px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Net Banking
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-100 dark:border-slate-800 bg-white/55 dark:bg-slate-900/55 backdrop-blur-md">
        <div className="container-pad py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500">
          <p>© {new Date().getFullYear()} Global One Logistics And Distribution. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="hover:text-indigo-500 transition">Privacy Policy</Link>
            <Link to="/about" className="hover:text-indigo-500 transition">Terms of Service</Link>
            <Link to="/return-policy" className="hover:text-indigo-500 transition">Return Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}