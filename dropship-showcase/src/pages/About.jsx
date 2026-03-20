import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Building2, ShieldCheck, Globe2, ShoppingBag } from "lucide-react";

export default function About() {
  return (
    <section className="container-pad py-10">
      <Helmet>
        <title>GOLD | About</title>
        <meta
          name="description"
          content="Learn about GOLD."
        />
      </Helmet>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-3xl font-bold">About Our Company</h1>
        </div>

        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          GOLD is a modern product discovery platform built for dropshipping.
          Our website helps customers browse curated premium products across
          multiple categories such as bags, shoes, sunglasses, perfumes, and wallets.
        </p>


        <div className="grid md:grid-cols-3 gap-4 mt-7">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <ShoppingBag className="w-5 h-5 mb-2 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold">Curated Catalog</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Clean, categorized product listing for quick browsing.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <Globe2 className="w-5 h-5 mb-2 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold">Global Supplier Links</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Direct redirect to supplier product pages via Buy Now.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <ShieldCheck className="w-5 h-5 mb-2 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold">Transparent Model</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              No hidden checkout here — external purchase flow is explicit.
            </p>
          </div>
        </div>

        <Link
          to="/contact"
          className="inline-block mt-7 px-5 py-3 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900"
        >
          Contact Our Team
        </Link>
      </div>
    </section>
  );
}