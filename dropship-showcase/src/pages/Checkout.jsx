import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, MapPin, User, Mail, Phone, ArrowRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { formatINR } from "../utils/currency";
import { normalizeImageUrl } from "../utils/productsApi";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://elitedrop-admin.onrender.com/api");

function getProductImage(product) {
  const raw = product?.image_url || product?.image;
  return normalizeImageUrl((Array.isArray(raw) ? raw[0] : raw) || "");
}

function parseBackendError(data) {
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (data?.error && typeof data.error === "string") return data.error;
  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((e) => (typeof e === "string" ? e : e?.msg || e?.message || JSON.stringify(e)))
      .join(", ");
  }
  if (data?.errors && typeof data.errors === "object") {
    return Object.values(data.errors).flat().join(", ");
  }
  return "Failed to place order. Please try again.";
}

function buildOrderFailureNotice({ message, statusCode, paymentMethod }) {
  const text = String(message || "").toLowerCase();
  const reasons = [];

  if (text.includes("verify")) {
    reasons.push("Your account email is not verified yet.");
  }
  if (text.includes("unavailable") || text.includes("out of stock")) {
    reasons.push("One or more items became unavailable while you were checking out.");
  }
  if (text.includes("shoe size")) {
    reasons.push("A required shoe size is missing or invalid for at least one item.");
  }
  if (statusCode === 422) {
    reasons.push("Some shipping or order details are invalid. Please review your form fields.");
  }
  if (statusCode === 500) {
    reasons.push("The order service is temporarily unavailable.");
  }
  if (paymentMethod === "razorpay") {
    reasons.push("Payment authorization may have failed or was cancelled before order confirmation.");
  }
  if (!reasons.length) {
    reasons.push("Your request could not be processed right now.");
  }

  return {
    title: "We couldn't place your order",
    message: message || "Please try again after checking the details below.",
    reasons,
    terms: [
  "Payments may fail due to insufficient balance, incorrect card/UPI details, or expired cards.",
  "Bank or network issues (including UPI downtime or OTP delays) can interrupt transactions.",
  "Payment failures can occur if the user does not complete authentication (OTP/UPI approval) in time.",
  "Transactions may be declined by the bank due to security checks or exceeded limits.",
  "Technical issues on the payment gateway or website (timeouts, connectivity problems) may cause failures.",
  "Incorrect payment configuration or interrupted sessions can lead to unsuccessful transactions.",
  "In rare cases, payments may appear failed due to delayed confirmation; users are advised to check transaction status before retrying.",
  "If any amount is deducted despite a failed transaction, it will be automatically refunded to the original payment method within 5–7 business days.",
  "For any payment-related issues or delays, users can contact our customer support team for quick assistance and resolution."
],
  };
}

export default function Checkout() {
  const cart = useCart() || {};
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const isVerified = user?.email_verified !== false;
  const items = Array.isArray(cart.items) ? cart.items : [];
  const totalPrice = Number(cart.totalPrice) || 0;
  const totalItems = Number(cart.totalItems) || 0;

  const [form, setForm] = useState({
    shipping_name: user?.name || "",
    shipping_email: user?.email || "",
    shipping_phone: "",
    shipping_address: "",
    shipping_city: "",
    shipping_pincode: "",
    shipping_state: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [orderFailure, setOrderFailure] = useState(null);
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const errs = {};
    const rawPhone = form.shipping_phone.trim();
    const digits = rawPhone.startsWith("+91")
      ? rawPhone.slice(3).trim()
      : rawPhone.startsWith("91") && rawPhone.length === 10
      ? rawPhone.slice(2)
      : rawPhone;
    if (!digits) {
      errs.shipping_phone = "Phone number is required.";
    } else if (!/^\d{10}$/.test(digits)) {
      errs.shipping_phone = "Enter a valid 10-digit mobile number (e.g. 98765 43210).";
    }
    if (!form.shipping_pincode.trim()) {
      errs.shipping_pincode = "Pincode is required.";
    } else if (!/^\d{6}$/.test(form.shipping_pincode.trim())) {
      errs.shipping_pincode = "Enter a valid 6-digit pincode.";
    }
    if (!form.shipping_state.trim()) {
      errs.shipping_state = "State is required.";
    }
    return errs;
  };

  if (items.length === 0) {
    return (
      <section className="container-pad py-16 text-center">
        <Helmet>
          <title>Checkout | EliteDrop</title>
        </Helmet>
        <ShoppingCart className="w-14 h-14 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <Link
          to="/products"
          className="mt-4 inline-block px-6 py-3 rounded-xl bg-indigo-600 text-white"
        >
          Browse Products
        </Link>
      </section>
    );
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!user || !token) {
      toast.error("Please sign in to place an order.");
      navigate("/signin");
      return;
    }

    if (!isVerified) {
      toast.error("Verify your email to place orders.");
      navigate("/verify-email", {
        state: { email: user.email, redirectTo: "/checkout" },
      });
      return;
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }

    const missingSizeItem = items.find((item) => {
      const category = String(item?.product?.category || "").toLowerCase();
      const isShoe = category.includes("shoe");
      const selected = String(item?.selectedSize || item?.product?.selectedSize || "").trim();
      return isShoe && !selected;
    });
    if (missingSizeItem) {
      toast.error("Please select a shoe size in your cart before placing the order.");
      navigate("/cart");
      return;
    }

    setPlacing(true);
    try {
      const orderItems = items.map((item) => {
        const image = getProductImage(item.product);
        return {
          product_id: item.productId,
          product_name: item.product?.name || `Product #${item.productId}`,
          product_image: image,
          price: Number(item.product?.price) || 0,
          quantity: Number(item.quantity) || 1,
          shoe_size: item.selectedSize || item.product?.selectedSize || "",
        };
      });

      const submitOrder = async (notesOverride = null) => {
        const payload = {
          ...form,
          notes: notesOverride ?? form.notes,
          items: orderItems,
        };
        const res = await fetch(`${API}/orders/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const errorMessage = typeof data?.error === "string" ? data.error.toLowerCase() : "";
          if (res.status === 403 && errorMessage.includes("verify")) {
            navigate("/verify-email", {
              state: { email: user.email, redirectTo: "/checkout" },
            });
          }
          const parsedMessage = parseBackendError(data);
          setOrderFailure(
            buildOrderFailureNotice({
              message: parsedMessage,
              statusCode: res.status,
              paymentMethod,
            })
          );
          toast.error(parsedMessage);
          return false;
        }

        setOrderFailure(null);
        cart.clearCart?.();
        toast.success("Order placed successfully!");
        const orderNumber = data?.order?.order_number;
        const successPath = orderNumber
          ? `/checkout/success?order=${encodeURIComponent(orderNumber)}`
          : "/checkout/success";
        navigate(successPath, { state: { order: data.order } });
        return true;
      };

      const loadRazorpayScript = () => {
        if (window.Razorpay) return Promise.resolve(true);
        return new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      if (paymentMethod === "razorpay") {
        if (!razorpayKey) {
          toast.error("Razorpay key is missing. Set VITE_RAZORPAY_KEY_ID to test payment.");
          return;
        }

        const loaded = await loadRazorpayScript();
        if (!loaded) {
          toast.error("Unable to load Razorpay checkout. Please try again.");
          return;
        }

        const amountInPaise = Math.round(totalPrice * 100);
        if (!amountInPaise || amountInPaise <= 0) {
          toast.error("Invalid order amount for payment.");
          return;
        }

        const options = {
          key: razorpayKey,
          amount: amountInPaise,
          currency: "INR",
          name: "EliteDrop",
          description: "Test payment",
          prefill: {
            name: form.shipping_name,
            email: form.shipping_email,
            contact: form.shipping_phone,
          },
          theme: {
            color: "#4f46e5",
          },
          modal: {
            ondismiss: () => {
              toast("Payment cancelled.");
              setPlacing(false);
            },
          },
          handler: async (response) => {
            const paymentTag = `Paid via Razorpay (test). Payment ID: ${response.razorpay_payment_id || "N/A"}`;
            const composedNotes = form.notes ? `${form.notes}\n${paymentTag}` : paymentTag;
            await submitOrder(composedNotes);
            setPlacing(false);
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on("payment.failed", (resp) => {
          const reason = resp?.error?.description || "Payment failed.";
          setOrderFailure(
            buildOrderFailureNotice({
              message: reason,
              statusCode: 402,
              paymentMethod,
            })
          );
          toast.error(reason);
          setPlacing(false);
        });
        razorpay.open();
        return;
      }

      await submitOrder();
    } catch {
      const message = "Network error. Please try again.";
      setOrderFailure(
        buildOrderFailureNotice({
          message,
          statusCode: 0,
          paymentMethod,
        })
      );
      toast.error(message);
    } finally {
      if (paymentMethod !== "razorpay") {
        setPlacing(false);
      }
    }
  };

  return (
    <section className="container-pad py-10">
      <Helmet>
        <title>Checkout | EliteDrop</title>
      </Helmet>

      <motion.h1
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-3xl font-bold mb-8"
      >
        Checkout
      </motion.h1>

      <form onSubmit={handlePlaceOrder}>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Shipping form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4"
          >
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <MapPin size={18} className="text-indigo-500" />
              Shipping Details
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.shipping_name}
                    onChange={set("shipping_name")}
                    required
                    minLength={2}
                    placeholder="Your name"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={form.shipping_email}
                    onChange={set("shipping_email")}
                    required
                    placeholder="your@email.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone *</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={form.shipping_phone}
                  onChange={set("shipping_phone")}
                  placeholder="10-digit mobile number"
                  maxLength={14}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                    errors.shipping_phone
                      ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  }`}
                />
              </div>
              {errors.shipping_phone && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.shipping_phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Address *</label>
              <textarea
                value={form.shipping_address}
                onChange={set("shipping_address")}
                required
                rows={2}
                placeholder="House/Flat no., Street, Area"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">City *</label>
                <input
                  type="text"
                  value={form.shipping_city}
                  onChange={set("shipping_city")}
                  required
                  placeholder="City"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State *</label>
                <input
                  type="text"
                  value={form.shipping_state}
                  onChange={set("shipping_state")}
                  placeholder="State"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                    errors.shipping_state
                      ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  }`}
                />
                {errors.shipping_state && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.shipping_state}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pincode *</label>
                <input
                  type="text"
                  value={form.shipping_pincode}
                  onChange={set("shipping_pincode")}
                  required
                  maxLength={6}
                  placeholder="6-digit pincode"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                    errors.shipping_pincode
                      ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  }`}
                />
                {errors.shipping_pincode && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.shipping_pincode}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Order Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={set("notes")}
                rows={2}
                placeholder="Any special delivery instructions…"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Payment Method</label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className={`rounded-xl border px-4 py-3 text-sm cursor-pointer transition ${paymentMethod === "cod" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="mr-2"
                  />
                  Cash on Delivery
                </label>
                <label className={`rounded-xl border px-4 py-3 text-sm cursor-pointer transition ${paymentMethod === "razorpay" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="razorpay"
                    checked={paymentMethod === "razorpay"}
                    onChange={() => setPaymentMethod("razorpay")}
                    className="mr-2"
                  />
                  Razorpay (Test)
                </label>
              </div>
              {paymentMethod === "razorpay" && !razorpayKey && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Set VITE_RAZORPAY_KEY_ID in frontend env to enable Razorpay test checkout.
                </p>
              )}
            </div>

            {!user && (
              <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-4 py-3">
                You need to{" "}
                <Link to="/signin" className="underline font-medium">sign in</Link>{" "}
                to place an order.
              </p>
            )}
            {user && !isVerified && (
              <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <span>Please verify your email before placing an order.</span>
                <button
                  type="button"
                  onClick={() => navigate("/verify-email", { state: { email: user.email, redirectTo: "/checkout" } })}
                  className="text-indigo-600 dark:text-indigo-400 underline font-medium"
                >
                  Verify now
                </button>
              </p>
            )}

            {orderFailure && (
              <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm">
                <p className="font-semibold text-red-700 dark:text-red-300">{orderFailure.title}</p>
                <p className="mt-1 text-red-700 dark:text-red-300">{orderFailure.message}</p>
                <div className="mt-2 text-red-700 dark:text-red-300">
                  <p className="font-medium">Possible reasons:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {orderFailure.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-2 text-red-700 dark:text-red-300">
                  <p className="font-medium">Important terms:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {orderFailure.terms.map((term) => (
                      <li key={term}>{term}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={placing || !user || !isVerified}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 transition text-sm"
            >
              {placing ? (
                <><Loader2 size={16} className="animate-spin" /> Placing Order…</>
              ) : (
                <>{paymentMethod === "razorpay" ? "Pay & Place Order" : "Place Order"} <ArrowRight size={16} /></>
              )}
            </button>
          </motion.div>

          {/* Order summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm h-fit"
          >
            <h2 className="text-xl font-bold mb-5">
              Order Summary ({totalItems} {totalItems === 1 ? "item" : "items"})
            </h2>

            <div className="space-y-3 text-sm">
              {items.map((item) => {
                const price = Number(item.product?.price) || 0;
                const image =
                  getProductImage(item.product) ||
                  "https://via.placeholder.com/64?text=No+Image";

                return (
                  <div key={item.productId} className="flex items-center gap-3">
                    <img
                      src={image}
                      alt={item.product?.name || "Product"}
                      className="w-12 h-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-1 font-medium">
                        {item.product?.name || `#${item.productId}`}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-semibold shrink-0">
                      {price > 0 ? formatINR(price * item.quantity) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span>{totalPrice > 0 ? formatINR(totalPrice) : "—"}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Shipping</span>
                <span className="text-emerald-600 dark:text-emerald-400">Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Total</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  {totalPrice > 0 ? formatINR(totalPrice) : "—"}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </form>
    </section>
  );
}
