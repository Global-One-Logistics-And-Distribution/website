import { Helmet } from "react-helmet-async";

export default function Contact() {
  return (
    <section className="container-pad py-10">
      <Helmet><title>GOLD | Contact</title></Helmet>

      <h1 className="text-3xl font-bold mb-6">Contact</h1>

      <p className="max-w-xl mb-8 text-slate-700 dark:text-slate-300">
        We’re here to help you with any questions, feedback, or support you may need.
        Reach out to us and our team will get back to you promptly.
      </p>

      <div className="max-w-xl space-y-6 text-slate-700 dark:text-slate-300">

        {/* Email */}
        <div className="flex flex-col">
          <h2 className="font-semibold text-lg mb-1">Email</h2>
          <a href="mailto:support@goldstore.com" className="hover:underline flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v16H4V4zm2 2v2l6 3.5L18 8V6H6zm0 4v8h12v-8l-6 3.5L6 10z"/>
            </svg>
             No Email Yet!!
          </a>
        </div>

        {/* Phone */}
        <div className="flex flex-col">
          <h2 className="font-semibold text-lg mb-1">Phone</h2>
          <a href="tel:+917208999095" className="hover:underline flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1v3.5a1 1 0 01-1 1C9.5 22 2 14.5 2 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.35.26 2.67.76 3.88a1 1 0 01-.21 1.11l-2.2 2.2z"/>
            </svg>
            Call +91 7208999095
          </a>
        </div>

        <div>
  <h2 className="font-semibold text-lg mb-1">WhatsApp</h2>
  <a
    href="https://wa.me/917208999095?text=Hi%20I%20have%20a%20question%20about%20a%20product"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center mt-1 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition"
  >
    {/* WhatsApp Icon (SVG) */}
    <svg
      className="w-5 h-5 mr-2"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12.041 2C6.488 2 2 6.488 2 12.041c0 2.138.559 4.141 1.534 5.909L2 22l4.148-1.521a9.928 9.928 0 005.893 1.562C17.493 22.041 22 17.553 22 12.041 22 6.488 17.553 2 12.041 2zm5.323 14.509c-.231.647-1.348 1.218-1.892 1.296-.51.069-1.13.099-3.03-.935-2.526-1.29-4.134-4.435-4.258-4.583-.124-.148-1.018-1.486-1.018-2.833 0-1.347.707-2.008.957-2.283.249-.275.543-.343.726-.343.184 0 .368 0 .528.003.164.003.385-.062.588.443.203.505.688 1.746.748 1.875.061.128.102.276.017.446-.085.17-.126.276-.248.437-.124.162-.262.36-.37.482-.108.123-.221.27-.108.527.113.256.503 1.062 1.077 1.715.744.799 1.363 1.064 1.609 1.184.247.122.392.104.537-.063.145-.168.617-.719.783-.963.166-.243.34-.204.566-.123.226.081 1.425.672 1.671.793.246.122.41.183.47.285.061.102.061.592-.17 1.239z" />
    </svg>
    Chat on WhatsApp
  </a>
</div>

        {/* Location */}
        <div>
          <h2 className="font-semibold text-lg mb-1">Location</h2>
          <p>Navi Mumbai, India</p>
        </div>

        {/* Working Hours */}
        <div>
          <h2 className="font-semibold text-lg mb-1">Working Hours</h2>
          <p>Monday – Saturday, 10:00 AM – 7:00 PM</p>
        </div>

        {/* Response time */}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Our team usually responds within 2–3 days.
        </p>
      </div>
    </section>
  );
}