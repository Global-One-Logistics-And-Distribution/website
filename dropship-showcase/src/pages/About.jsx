import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Building2, ShieldCheck, Globe2, ShoppingBag } from "lucide-react";

export default function About() {
  const siteUrl = "https://www.elitedrop.net.in";
  const faqItems = [
    {
      question: "Are products authentic?",
      answer:
        "Yes. EliteDrop focuses on verified listings and quality checks so customers can shop with confidence.",
    },
    {
      question: "How long does delivery take?",
      answer:
        "Most orders arrive within 3 to 7 business days, depending on location and product availability.",
    },
    {
      question: "What payment methods are supported?",
      answer:
        "We support secure checkout options including cards and UPI where available.",
    },
    {
      question: "Can I return or exchange items?",
      answer:
        "Return and exchange eligibility varies by product. Check the Return Policy for details before purchase.",
    },
  ];
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "EliteDrop",
    url: siteUrl,
    logo: `${siteUrl}/android-chrome-512x512.png`,
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section className="container-pad py-10">
      <Helmet>
        <title>EliteDrop | About</title>
        <meta
          name="description"
          content="Learn about EliteDrop."
        />
        <link rel="canonical" href="https://www.elitedrop.net.in/about" />
        <script type="application/ld+json">
          {JSON.stringify([organizationSchema, faqSchema])}
        </script>
      </Helmet>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-3xl font-bold">About Our Company</h1>
        </div>

        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          EliteDrop is a modern product discovery platform crafted for those who value style and quality. 
          We curate a refined selection of premium essentials across categories like bags, shoes, sunglasses, 
          perfumes, and wallets—bringing timeless design and everyday luxury into one seamless experience. 
          Discover standout pieces, elevate your style, and shop with confidence—all in one place.
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
            <ShieldCheck className="w-5 h-5 mb-2 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold">Secure Checkout</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Safe and seamless checkout experience.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <Globe2 className="w-5 h-5 mb-2 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold">Global Shipping</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Fast delivery to customers worldwide.
            </p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Shipping and Service Overview</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Service</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Details</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Typical Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr>
                  <td className="px-4 py-3 font-medium">Standard Delivery</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Tracked shipping on most orders.</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">3 to 7 business days</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Customer Support</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Order help, product questions, and returns.</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Response within 2 to 3 days</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Secure Checkout</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Protected payments and confirmations.</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Instant confirmation</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {faqItems.map((item) => (
              <div
                key={item.question}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
              >
                <h3 className="text-lg font-semibold">{item.question}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

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