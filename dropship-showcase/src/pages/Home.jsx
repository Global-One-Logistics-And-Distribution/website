import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Phone, UserCircle2, ShieldCheck, Truck, Headphones, Star, ChevronRight } from "lucide-react";
import ProductCard from "../components/ProductCard";
import Carousel from "../components/Carousel";
import AdSlider from "../components/AdSlider";
import ProductGridSkeleton from "../components/ProductGridSkeleton";
import { useProducts } from "../hooks/useProducts";

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "100% Authentic", sub: "Only verified genuine products", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" },
  { icon: Truck, label: "Free Delivery", sub: "On all orders", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30" },
  { icon: Headphones, label: "Customer Support", sub: "Dedicated customer care", color: "text-rose-600 bg-rose-50 dark:bg-rose-900/30" },
];

const TESTIMONIALS = [
  { name: "Priya S.", rating: 5, text: "Absolutely love my Michael Kors bag! Arrived perfectly wrapped in just 3 days. Will definitely shop again.", location: "Mumbai" },
  { name: "Rahul M.", rating: 5, text: "The quality of the watch I ordered is outstanding. EliteDrop is my go-to for luxury accessories.", location: "Delhi" },
  { name: "Ananya K.", rating: 4, text: "Great collection, fast shipping. The Aldo shoes were exactly as described. Very happy!", location: "Bangalore" },
  { name: "Vikram P.", rating: 5, text: "Excellent customer service and authentic products. My Gucci sunglasses are stunning!", location: "Chennai" },
  { name: "Sneha R.", rating: 5, text: "The wallet I bought is of great quality. Took a bit longer to arrive but worth the wait.", location: "Hyderabad" },
  { name: "Arjun N.", rating: 4, text: "Outstanding quality and fast delivery. My Louis Vuitton backpack is amazing!", location: "Kolkata" },
];

export default function Home() {
  const { products, loading } = useProducts();
  const featured = useMemo(() => products.slice(0, 8), [products]);
  const trending = useMemo(() => products.slice(0, 10), [products]);
  const topRated = useMemo(
    () => [...products].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 4),
    [products]
  );
  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const navigate = useNavigate();
  const siteUrl = useMemo(() => {
    const envSite = import.meta.env.VITE_SITE_URL;
    if (typeof envSite === "string" && envSite.trim()) return envSite.trim().replace(/\/$/, "");
    if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
    return "https://www.elitedrop.net.in";
  }, []);
  const canonicalUrl = `${siteUrl}/`;
  const seoTitle = "EliteDrop | Premium Bags, Shoes, Wallets & Watches";
  const seoDescription =
    "Shop premium handbags, watches, shoes and accessories at EliteDrop. Discover curated collections with secure checkout and fast delivery.";
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "EliteDrop",
    url: siteUrl,
    logo: `${siteUrl}/android-chrome-512x512.png`,
  };
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "EliteDrop",
    url: siteUrl,
  };

  const contacts = [
    { id: 1, name: "EliteDrop", role: "Customer Service", phone: "+91 7208999095", email: "support@elitedrop.net.in", accent: "from-indigo-500 to-blue-500" },
  ];

  const goToCategory = (category) => navigate(`/products?category=${encodeURIComponent(category)}`);

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={`${siteUrl}/android-chrome-512x512.png`} />
        <script type="application/ld+json">
          {JSON.stringify([organizationSchema, websiteSchema])}
        </script>
      </Helmet>

      {/* Ad / Promo Slider */}
      <AdSlider />

      {/* Trust badges strip */}
      <section className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="container-pad py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST_BADGES.map(({ icon: Icon, label, sub, color }) => (
              <motion.div
                key={label}
                whileHover={{ y: -3 }}
                className="flex items-center gap-3"
              >
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-pad py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Shop by Category</h2>
          <Link to="/products" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            All products <ChevronRight size={14} />
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => goToCategory(c)}
              className="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition font-medium"
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-pad py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Featured Products</h2>
          <Link to="/products" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Trending Carousel */}
      <section className="container-pad py-8">
        <h2 className="text-2xl font-bold mb-4">Trending Now 🔥</h2>
        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <Carousel products={trending} />
        )}
      </section>

      {/* Top Rated */}
      <section className="container-pad py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Top Rated ⭐</h2>
          <Link to="/products?sort=ratingHigh" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            See more <ChevronRight size={14} />
          </Link>
        </div>
        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topRated.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Testimonials */}
      <section className="container-pad py-10">
        <h2 className="text-2xl font-bold mb-6 text-center">What Our Customers Say</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, idx) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.35 }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
            >
              <div className="flex items-center gap-1 text-amber-500 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">"{t.text}"</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact Cards */}
      <section className="container-pad py-10">
        <h2 className="text-2xl font-bold mb-4">Contact Persons</h2>

        <div className="grid md:grid-cols-2 gap-5">
          {contacts.map((person, idx) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.35 }}
              whileHover={{ y: -6, scale: 1.01 }}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
            >
              <div className={`absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r ${person.accent}`} />

              <div className="flex items-start gap-4">
                <div className="rounded-xl p-3 bg-slate-100 dark:bg-slate-800 group-hover:scale-105 transition">
                  <UserCircle2 className="w-7 h-7 text-slate-700 dark:text-slate-200" />
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{person.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{person.role}</p>

                  <div className="mt-4 space-y-2">
                    <a
                      href={`tel:${person.phone.replace(/\s+/g, "")}`}
                      className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                    >
                      <Phone size={15} />
                      <span>{person.phone}</span>
                    </a>
                    <a
                      href={`mailto:${person.email}`}
                      className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                    >
                      <Mail size={15} />
                      <span>{person.email}</span>
                    </a>
                  </div>

                  <Link
                    to="/contact"
                    className="mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition"
                  >
                    Contact {person.name}
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}