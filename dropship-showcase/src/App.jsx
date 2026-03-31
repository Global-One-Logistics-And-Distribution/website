import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const Home = lazy(() => import("./pages/Home"));
const ProductListing = lazy(() => import("./pages/ProductListing"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Account = lazy(() => import("./pages/Account"));
const Orders = lazy(() => import("./pages/Orders"));


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
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<ProductListing />} />
              <Route path="/products/:id" element={<ProductDetails />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/account" element={<Account />} />
              <Route path="/orders" element={<Orders />} />
              {/* Catch-all: redirect unknown routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </AnimatePresence>
      <Footer />
    </div>
  );
}