import { Helmet } from "react-helmet-async";

export default function PrivacyPolicy() {
  return (
    <section className="container-pad py-10 sm:py-14">
      <Helmet>
        <title>Privacy Policy | EliteDrop</title>
        <meta
          name="description"
          content="Read how EliteDrop collects, uses, and protects your personal information."
        />
        <link rel="canonical" href="https://www.elitedrop.net.in/privacy-policy" />
      </Helmet>

      <div className="max-w-3xl mx-auto">
        <p className="text-xs font-semibold tracking-widest uppercase text-indigo-600 dark:text-indigo-400">
          Legal
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Last updated: April 4, 2026
        </p>

        <div className="mt-8 space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold">1. Information We Collect</h2>
            <p className="mt-2">
              We may collect your name, phone number, email address, shipping address,
              and order details when you use our services.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold">2. How We Use Information</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>To process and deliver orders.</li>
              <li>To provide support and order updates.</li>
              <li>To improve website performance and shopping experience.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold">3. Data Sharing</h2>
            <p className="mt-2">
              We share only necessary information with trusted logistics and payment
              partners to complete your order and payments. We do not sell personal data.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold">4. Security</h2>
            <p className="mt-2">
              We use reasonable technical and organizational safeguards to protect your data.
              However, no internet transmission is 100% secure.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-white/80 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold">5. Contact</h2>
            <p className="mt-2">
              For privacy concerns, write to support@elitedrop.net.in.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
