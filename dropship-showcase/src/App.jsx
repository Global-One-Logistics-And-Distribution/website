import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import MaintenanceNotice from "./components/MaintenanceNotice";

const Home = lazy(() => import("./pages/Home"));
const ProductListing = lazy(() => import("./pages/ProductListing"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Account = lazy(() => import("./pages/Account"));
const Orders = lazy(() => import("./pages/Orders"));
const ReturnPolicy = lazy(() => import("./pages/ReturnPolicy"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));

const API = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://elitedrop-admin.onrender.com/api")
).replace(/\/$/, "");


function MaintenanceGate({ enabled, title, message, children }) {
  if (enabled) {
    return <MaintenanceNotice title={title} message={message} />;
  }
  return children;
}


function PageFallback() {
  return (
    <section className="container-pad py-12" aria-busy="true" aria-live="polite">
      <div className="h-8 w-56 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="mt-4 h-4 w-80 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-40 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          />
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);
  const [maintenance, setMaintenance] = useState({
    whole_site: false,
    products: false,
    sign: false,
    checkout: false,
    message: "This section is under maintenance.",
  });

  useEffect(() => {
    let active = true;
    let timerId = null;
    const BASE_REFRESH_INTERVAL_MS = 12000;
    const MAX_REFRESH_INTERVAL_MS = 60000;
    const EVENT_TRIGGER_DEDUPE_MS = 1000;
    let nextRefreshIntervalMs = BASE_REFRESH_INTERVAL_MS;
    let lastEventTriggeredRefreshAt = 0;

    const scheduleNext = (delayMs = nextRefreshIntervalMs) => {
      if (!active) return;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
      timerId = window.setTimeout(() => {
        loadMaintenance();
      }, delayMs);
    };

    const loadMaintenance = async () => {
      try {
        const res = await fetch(`${API}/products/site-settings/`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (res.status === 429) {
          nextRefreshIntervalMs = Math.min(nextRefreshIntervalMs * 2, MAX_REFRESH_INTERVAL_MS);
          return;
        }

        if (!res.ok) {
          nextRefreshIntervalMs = Math.min(nextRefreshIntervalMs * 2, MAX_REFRESH_INTERVAL_MS);
          return;
        }

        const data = await res.json().catch(() => ({}));
        const payload = data?.maintenance;
        if (!active || !payload || typeof payload !== "object") {
          nextRefreshIntervalMs = Math.min(nextRefreshIntervalMs * 2, MAX_REFRESH_INTERVAL_MS);
          return;
        }

        setMaintenance((prev) => ({
          ...prev,
          whole_site: Boolean(payload.whole_site),
          products: Boolean(payload.products),
          sign: Boolean(payload.sign),
          checkout: Boolean(payload.checkout),
          message: String(payload.message || prev.message),
        }));
        nextRefreshIntervalMs = BASE_REFRESH_INTERVAL_MS;
      } catch {
        // Keep defaults when maintenance settings endpoint is temporarily unavailable.
        nextRefreshIntervalMs = Math.min(nextRefreshIntervalMs * 2, MAX_REFRESH_INTERVAL_MS);
      } finally {
        if (active) {
          setMaintenanceLoaded(true);
          scheduleNext();
        }
      }
    };

    loadMaintenance();

    const triggerImmediateRefreshFromEvent = () => {
      const now = Date.now();
      if (now - lastEventTriggeredRefreshAt < EVENT_TRIGGER_DEDUPE_MS) {
        return;
      }
      lastEventTriggeredRefreshAt = now;
      nextRefreshIntervalMs = BASE_REFRESH_INTERVAL_MS;
      loadMaintenance();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerImmediateRefreshFromEvent();
      }
    };
    const handleWindowFocus = () => {
      triggerImmediateRefreshFromEvent();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      active = false;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  const maintenanceMessage = useMemo(
    () => maintenance.message || "This section is under maintenance.",
    [maintenance.message]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </Helmet>
      <Navbar />
      <AnimatePresence mode="wait">
        <main className="flex-1">
          {!maintenanceLoaded ? (
            <PageFallback />
          ) : (
            maintenance.whole_site ? (
              <MaintenanceNotice title="Site Under Maintenance" message={maintenanceMessage} />
            ) : (
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/products"
                element={(
                  <MaintenanceGate
                    enabled={maintenance.products}
                    title="Products Temporarily Unavailable"
                    message={maintenanceMessage}
                  >
                    <ProductListing />
                  </MaintenanceGate>
                )}
              />
              <Route
                path="/products/:slug"
                element={(
                  <MaintenanceGate
                    enabled={maintenance.products}
                    title="Products Temporarily Unavailable"
                    message={maintenanceMessage}
                  >
                    <ProductDetails />
                  </MaintenanceGate>
                )}
              />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/cart" element={<Cart />} />
              <Route
                path="/checkout"
                element={(
                  <MaintenanceGate
                    enabled={maintenance.checkout}
                    title="Checkout Temporarily Unavailable"
                    message={maintenanceMessage}
                  >
                    <Checkout />
                  </MaintenanceGate>
                )}
              />
              <Route
                path="/checkout/success"
                element={(
                  <MaintenanceGate
                    enabled={maintenance.checkout}
                    title="Checkout Temporarily Unavailable"
                    message={maintenanceMessage}
                  >
                    <CheckoutSuccess />
                  </MaintenanceGate>
                )}
              />
              <Route
                path="/signin"
                element={(
                  <MaintenanceGate
                    enabled={maintenance.sign}
                    title="Sign In Temporarily Unavailable"
                    message={maintenanceMessage}
                  >
                    <SignIn />
                  </MaintenanceGate>
                )}
              />
              <Route
                path="/signup"
                element={(
                  <MaintenanceGate
                    enabled={maintenance.sign}
                    title="Sign Up Temporarily Unavailable"
                    message={maintenanceMessage}
                  >
                    <SignUp />
                  </MaintenanceGate>
                )}
              />
              <Route
                path="/verify-email"
                element={(
                  <MaintenanceGate
                    enabled={maintenance.sign}
                    title="Sign In Temporarily Unavailable"
                    message={maintenanceMessage}
                  >
                    <VerifyEmail />
                  </MaintenanceGate>
                )}
              />
              <Route
                path="/complete-profile"
                element={(
                  <MaintenanceGate
                    enabled={maintenance.sign}
                    title="Sign In Temporarily Unavailable"
                    message={maintenanceMessage}
                  >
                    <CompleteProfile />
                  </MaintenanceGate>
                )}
              />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/account" element={<Account />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/return-policy" element={<ReturnPolicy />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/shipping-policy" element={<ShippingPolicy />} />
              {/* Catch-all: redirect unknown routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
            )
          )}
        </main>
      </AnimatePresence>
      <Footer />
    </div>
  );
}
