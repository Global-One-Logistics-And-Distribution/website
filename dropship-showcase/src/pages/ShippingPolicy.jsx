import { Helmet } from "react-helmet-async";

export default function ShippingPolicy() {
  return (
    <section className="container-pad py-10 sm:py-14">
      <Helmet>
        <title>Shipping Policy | EliteDrop</title>
        <meta
          name="description"
          content="Learn about EliteDrop shipping timelines, coverage, charges, and delivery process."
        />
        <link rel="canonical" href="https://www.elitedrop.net.in/shipping-policy" />
      </Helmet>

      <div className="max-w-3xl mx-auto">
        <p className="text-xs font-semibold tracking-widest uppercase text-indigo-600 dark:text-indigo-400">
          Support
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">Shipping Policy</h1>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Last updated: April 4, 2026
        </p>

        <div className="mt-8 space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold">1. Delivery Coverage</h2>
            <p className="mt-2">
              We currently ship across major serviceable pin codes in India.
              Delivery availability depends on courier coverage.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold">2. Processing Time</h2>
            <p className="mt-2">
              Orders are generally processed within 24 to 48 hours after confirmation,
              excluding Sundays and public holidays.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold">3. Estimated Delivery Time</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>Metro cities: 2 to 5 business days</li>
              <li>Other locations: 4 to 8 business days</li>
            </ul>
            <p className="mt-2">
              Timelines are estimates and may vary during peak demand, weather, or logistics disruptions.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold">4. Shipping Charges</h2>
            <p className="mt-2">
              Shipping charges, if any, are shown at checkout before payment.
              Promotional free-shipping offers may apply based on order value or campaign terms.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold">5. Tracking & Support</h2>
            <p className="mt-2">
              You can track orders from your account order section. For support,
              contact support@elitedrop.net.in or +91 7208999095.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
