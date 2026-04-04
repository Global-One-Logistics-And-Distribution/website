import { Helmet } from "react-helmet-async";

const RETURN_WINDOW_DAYS = 7;

export default function ReturnPolicy() {
  return (
    <section className="container-pad py-10 sm:py-14">
      <Helmet>
        <title>Return Policy | EliteDrop</title>
        <meta
          name="description"
          content="Read EliteDrop return and replacement policy, eligibility rules, timelines, and refund process details."
        />
        <link rel="canonical" href="https://www.elitedrop.net.in/return-policy" />
      </Helmet>

      <div className="max-w-3xl mx-auto">
        <p className="text-xs font-semibold tracking-widest uppercase text-indigo-600 dark:text-indigo-400">
          Support
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
          Return Policy
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">
          We want you to shop with confidence. If a delivered item is defective, damaged,
          or not as described, you can request a return or replacement within {RETURN_WINDOW_DAYS} days
          from delivery.
        </p>

        <div className="mt-8 space-y-6">
          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
            <h2 className="text-lg font-semibold">1. Eligibility</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>Return request must be raised within 7 days of delivery.</li>
              <li>Product must be unused, with original tags, packaging, and accessories.</li>
              <li>Unboxing video and clear product photos may be required for verification.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
            <h2 className="text-lg font-semibold">2. Non-Returnable Cases</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>Items requested after the return window.</li>
              <li>Products showing signs of use, damage, or missing components.</li>
              <li>Products returned without original packaging or invoice details.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
            <h2 className="text-lg font-semibold">3. How To Request a Return</h2>
            <ol className="mt-3 list-decimal pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>Contact support with your order number and reason for return.</li>
              <li>Share required photos/video if asked by our support team.</li>
              <li>After approval, follow the pickup or shipping instructions.</li>
            </ol>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
            <h2 className="text-lg font-semibold">4. Refund Timeline</h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Once returned item quality-check is completed, refunds are processed to the original
              payment method within 5 to 7 business days. Bank and payment gateway processing times
              may vary.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
            <h2 className="text-lg font-semibold">5. Need Help?</h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              For return support, contact us at support@elitedrop.net.in or call +91 7208999095.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
