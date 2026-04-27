import { useMemo, useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Star, Heart, ArrowLeft, ShoppingCart, Minus, Plus, Eye, Clock, Tag, CheckCircle2, Shield } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import ProductDetailsSkeleton from "../components/ProductDetailsSkeleton";
import { formatINR } from "../utils/currency";
import { useProduct, useProducts } from "../hooks/useProducts";
import { getProductIdFromSlug, getProductSlug } from "../utils/slug";
import { getReviewCount } from "../utils/product";

const RAZORPAY_AFFORDABILITY_SCRIPT_SRC = "https://cdn.razorpay.com/widgets/affordability/affordability.js";
const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1000' height='700' viewBox='0 0 1000 700'%3E%3Crect width='1000' height='700' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' fill='%2364748b' font-family='Arial,sans-serif' font-size='42' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

export default function ProductDetails() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from || "/products";

  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();

  const { products, loading } = useProducts();
  const product = useMemo(
    () => products.find((p) => getProductSlug(p) === slug) || null,
    [products, slug]
  );
  const legacyProductId = useMemo(() => getProductIdFromSlug(slug), [slug]);
  const legacyProduct = useMemo(() => {
    if (!legacyProductId) return null;
    return products.find((p) => Number(p.id) === legacyProductId) || null;
  }, [products, legacyProductId]);
  const productId = product?.id || legacyProduct?.id || null;
  const { product: detailedProduct } = useProduct(productId);
  const hydratedProduct = detailedProduct || product || legacyProduct || null;

  const siteUrl = useMemo(() => {
    const envSite = import.meta.env.VITE_SITE_URL;
    if (typeof envSite === "string" && envSite.trim()) return envSite.trim().replace(/\/$/, "");
    if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
    return "https://www.elitedrop.net.in";
  }, []);

  const canonicalUrl = hydratedProduct ? `${siteUrl}/products/${getProductSlug(hydratedProduct)}` : `${siteUrl}/products`;
  const shortDescription = hydratedProduct?.shortDescription || hydratedProduct?.short_description || "";
  const description = hydratedProduct?.description || "";
  const features = Array.isArray(hydratedProduct?.features) ? hydratedProduct.features : [];
  const seoDescription =
    shortDescription || description ||
    "Explore authentic premium products with fast delivery and secure checkout.";
  const seoImage =
    hydratedProduct?.image_url || hydratedProduct?.image || "https://www.elitedrop.net.in/android-chrome-512x512.png";
  const ratingValue = useMemo(() => {
    const parsed = Number(hydratedProduct?.rating);
    if (!Number.isFinite(parsed)) return 4.3;
    return Math.min(5, Math.max(1, parsed));
  }, [hydratedProduct?.rating]);
  const reviewCount = useMemo(() => {
    const id = Number(hydratedProduct?.id);
    if (!Number.isFinite(id) || id <= 0) return 0;
    return getReviewCount(id);
  }, [hydratedProduct?.id]);
  const fallbackImage = FALLBACK_IMAGE;

  useEffect(() => {
    if (!hydratedProduct || !slug) return;
    const canonicalSlug = getProductSlug(hydratedProduct);
    if (slug !== canonicalSlug) {
      navigate(`/products/${canonicalSlug}`, {
        replace: true,
        state: location.state,
      });
    }
  }, [hydratedProduct, slug, navigate, location.state]);

  useEffect(() => {
    if (product || !legacyProduct || !slug) return;
    const canonicalSlug = getProductSlug(legacyProduct);
    if (canonicalSlug && slug !== canonicalSlug) {
      navigate(`/products/${canonicalSlug}`, {
        replace: true,
        state: location.state,
      });
    }
  }, [product, legacyProduct, slug, navigate, location.state]);

  const hasVariants = Array.isArray(hydratedProduct?.variants) && hydratedProduct.variants.length > 0;
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const selectedVariant = hasVariants ? hydratedProduct.variants[selectedVariantIndex] : null;

  const isShoe = hydratedProduct?.category === "Luxury Shoes";
  const shoeSizes = [7, 8, 9, 10, 11];
  const [selectedSize, setSelectedSize] = useState(null);
  const sizeStockMap = hydratedProduct?.size_stock || hydratedProduct?.sizeStock || {};

  // Quantity selector
  const [quantity, setQuantity] = useState(1);

  // Fake "people viewing" counter
  const [viewingCount, setViewingCount] = useState(() => Math.floor(Math.random() * 22) + 7);
  useEffect(() => {
    const t = setInterval(() => {
      setViewingCount((n) => {
        const delta = Math.random() < 0.5 ? 1 : -1;
        return Math.min(38, Math.max(5, n + delta));
      });
    }, Math.floor(Math.random() * 6000) + 5000);
    return () => clearInterval(t);
  }, []);

  // Countdown timer for fake offer (starts at a random value between 30–90 min)
  const offerSecondsRef = useRef(Math.floor(Math.random() * 3600) + 1800);
  const [offerTime, setOfferTime] = useState(offerSecondsRef.current);
  useEffect(() => {
    const t = setInterval(() => {
      setOfferTime((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const formatCountdown = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Fake MRP (mark up the price by 20-25%)
  const hasFakeDiscount = hydratedProduct?.price && Number(hydratedProduct.price) > 0;
  const fakeDiscountPct = useMemo(() => (hasFakeDiscount ? (Math.floor(Math.random() * 6) + 18) : 0), [hasFakeDiscount]);
  const fakeMRP = useMemo(
    () => (hasFakeDiscount ? Math.round(Number(hydratedProduct.price) * (1 + fakeDiscountPct / 100)) : 0),
    [hasFakeDiscount, hydratedProduct?.price, fakeDiscountPct]
  );

  const images = useMemo(() => {
    if (!hydratedProduct) return [fallbackImage];
    if (hasVariants) {
      if (selectedVariant?.images?.length) return selectedVariant.images;
      if (selectedVariant?.image) return [selectedVariant.image];
    }
    // Support both JSON (gallery/image) and backend (gallery_urls/image_url) field names
    const gallery = hydratedProduct.gallery_urls || hydratedProduct.gallery;
    const mainImage = hydratedProduct.image_url || hydratedProduct.image;
    if (Array.isArray(gallery) && gallery.length) return gallery.filter(Boolean);
    if (Array.isArray(mainImage) && mainImage.length) return mainImage.filter(Boolean);
    if (mainImage) return [mainImage];
    return [fallbackImage];
  }, [hydratedProduct, hasVariants, selectedVariant]);

  const [activeImage, setActiveImage] = useState(images[0]);
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "";
  const productAmountInPaise = Math.round((Number(hydratedProduct?.price) || 0) * 100);
  const affordabilityHostRef = useRef(null);

  useEffect(() => {
    const host = affordabilityHostRef.current;
    if (!host) return;

    let disposed = false;

    const targetId = `razorpay-affordability-widget-product-runtime-${Math.random().toString(36).slice(2)}`;
    const mount = document.createElement("div");
    mount.id = targetId;
    host.replaceChildren(mount);

    const renderAffordabilityWidget = () => {
      if (disposed || !host.isConnected || !mount.isConnected) return;

      if (!window.RazorpayAffordabilitySuite || !razorpayKey || productAmountInPaise <= 0) {
        mount.replaceChildren();
        return;
      }

      mount.replaceChildren();
      if (!document.getElementById(targetId)) return;

      const widgetConfig = {
        key: razorpayKey,
        amount: productAmountInPaise,
        target: `#${targetId}`,
      };
      try {
        const affordabilitySuite = new window.RazorpayAffordabilitySuite(widgetConfig);
        affordabilitySuite.render();
      } catch {
        mount.replaceChildren();
      }
    };

    const existingScript = document.querySelector(`script[src="${RAZORPAY_AFFORDABILITY_SCRIPT_SRC}"]`);
    if (existingScript) {
      renderAffordabilityWidget();
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_AFFORDABILITY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      renderAffordabilityWidget();
    };
    document.head.appendChild(script);

    return () => {
      disposed = true;
      script.onload = null;
      if (host.isConnected) host.replaceChildren();
    };
  }, [productAmountInPaise, razorpayKey]);

  useEffect(() => {
    setActiveImage(images[0]);
  }, [images]);

  const selectedSizeStock = isShoe && selectedSize != null
    ? Number(sizeStockMap[String(selectedSize)] ?? 0)
    : null;
  const stock = isShoe && selectedSize != null
    ? selectedSizeStock
    : Number(hydratedProduct?.stock);
  const maxSelectableQty = Number.isFinite(stock) && stock >= 0 ? Math.min(10, stock) : 10;
  const isOutOfStock = isShoe ? (selectedSize == null ? false : maxSelectableQty < 1) : maxSelectableQty < 1;

  useEffect(() => {
    if (isOutOfStock) {
      setQuantity(1);
      return;
    }
    setQuantity((q) => Math.min(maxSelectableQty, Math.max(1, q)));
  }, [isOutOfStock, maxSelectableQty]);

  if (loading) {
    return (
      <>
        <Helmet><title>Loading Product | EliteDrop</title></Helmet>
        <ProductDetailsSkeleton />
      </>
    );
  }

  if (!hydratedProduct) {
    return (
      <section className="container-pad py-12">
        <Helmet>
          <title>Product Not Found | EliteDrop</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <h1 className="text-2xl font-bold">Product not found</h1>
        <Link to="/products" className="inline-block mt-5 px-4 py-2 rounded-lg bg-slate-900 text-white">
          Back to Products
        </Link>
      </section>
    );
  }

  const handleAddToCart = () => {
    if (isShoe && !selectedSize) {
      toast.error("Please select a size before adding to cart.");
      return;
    }

    if (isOutOfStock) {
      toast.error("This product is out of stock");
      return;
    }

    const safeQty = Math.min(maxSelectableQty, Math.max(1, quantity));
    addToCart(hydratedProduct, safeQty, selectedSize);
    toast.success("Added to cart!");
  };

  return (
    <section className="container-pad py-10">
      <Helmet>
        <title>{hydratedProduct.name} | EliteDrop</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${hydratedProduct.name} | EliteDrop`} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={seoImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${hydratedProduct.name} | EliteDrop`} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={seoImage} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: hydratedProduct.name,
            image: Array.isArray(hydratedProduct.gallery_urls) && hydratedProduct.gallery_urls.length
              ? hydratedProduct.gallery_urls
              : [seoImage],
            description: seoDescription,
            brand: {
              "@type": "Brand",
              name: hydratedProduct.brand || "EliteDrop",
            },
            category: hydratedProduct.category,
            sku: String(hydratedProduct.id),
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              price: Number(hydratedProduct.price || 0),
              availability: Number(hydratedProduct.stock || 0) > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              url: canonicalUrl,
            },
            ...(reviewCount > 0
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue,
                    reviewCount,
                    bestRating: 5,
                    worstRating: 1,
                  },
                  review: [
                    {
                      "@type": "Review",
                      name: "Customer rating summary",
                      reviewBody: `Average customer rating ${ratingValue} out of 5 based on ${reviewCount} ratings.`,
                      author: {
                        "@type": "Organization",
                        name: "EliteDrop",
                      },
                      reviewRating: {
                        "@type": "Rating",
                        ratingValue,
                        bestRating: 5,
                        worstRating: 1,
                      },
                    },
                  ],
                }
              : {}),
          })}
        </script>
      </Helmet>

      <motion.button
        onClick={() => navigate(from)}
        whileTap={{ scale: 0.97 }}
        className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm"
      >
        <ArrowLeft size={16} /> Back
      </motion.button>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="w-full aspect-[4/3] rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden"
          >
            <img
              src={activeImage || fallbackImage}
              alt={hydratedProduct.name}
              loading="eager"
              decoding="async"
              onError={(e) => { e.target.onerror = null; e.target.src = fallbackImage; }}
              className="max-h-full max-w-full object-contain"
            />
          </motion.div>

          <div className="mt-3 grid grid-cols-4 sm:grid-cols-5 gap-2">
            {images.map((img, idx) => (
              <button
                key={`${img}-${idx}`}
                onClick={() => setActiveImage(img)}
                className={`rounded-lg overflow-hidden border h-16 transition ${
                  activeImage === img
                    ? "border-indigo-500"
                    : "border-slate-300 dark:border-slate-700 hover:border-indigo-300"
                }`}
              >
                <img
                  src={img}
                  alt={`${hydratedProduct.name} ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.target.onerror = null; e.target.src = fallbackImage; }}
                  className="h-full w-full object-contain bg-slate-100 dark:bg-slate-800"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {hydratedProduct.brand} • {hydratedProduct.category}
          </p>
          <h1 className="text-3xl font-bold mt-1">{hydratedProduct.name}</h1>

          {/* Rating */}
          {hydratedProduct.rating && (
            <div className="flex items-center gap-1.5 mt-3 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill={i < Math.round(hydratedProduct.rating) ? "currentColor" : "none"}
                />
              ))}
              <span className="text-slate-600 dark:text-slate-400 text-sm ml-1">
                {hydratedProduct.rating}
              </span>
            </div>
          )}

          {/* Price */}
          <div className="mt-4">
            {hasFakeDiscount ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatINR(hydratedProduct.price)}
                </span>
                <span className="text-lg text-slate-400 line-through">
                  {formatINR(fakeMRP)}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-white bg-green-500 px-2 py-0.5 rounded-md">
                  <Tag size={13} /> {fakeDiscountPct}% OFF
                </span>
              </div>
            ) : (
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                Price on request
              </div>
            )}
            {hasFakeDiscount && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Inclusive of all taxes. <span className="text-green-600 dark:text-green-400 font-medium">Free delivery</span> on this item.
              </p>
            )}
            {hasFakeDiscount && razorpayKey && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">EMI & Pay Later options</p>
                <div ref={affordabilityHostRef} />
              </div>
            )}
          </div>

          {/* Fake offer / countdown */}
          {hasFakeDiscount && (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Clock size={16} className="shrink-0" />
                <span className="text-sm font-semibold">Deal ends in:</span>
                <span className="font-mono font-bold text-base tracking-wider">
                  {formatCountdown(offerTime)}
                </span>
              </div>
              <span className="hidden sm:block text-slate-300 dark:text-slate-600">|</span>
              <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                Hurry up! Only a few items left at this price.
              </span>
            </div>
          )}

          {/* Viewing counter */}
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Eye size={15} className="text-indigo-500" />
            <span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{viewingCount} people</span> are viewing this right now
            </span>
          </div>

          {/* Color variants */}
          {hasVariants && (
            <div className="mt-5">
              <p className="text-sm text-slate-500 mb-2">
                Color:{" "}
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedVariant?.color}
                </span>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {hydratedProduct.variants.map((variant, idx) => (
                  <motion.button
                    key={variant.id || `${variant.color}-${idx}`}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setSelectedVariantIndex(idx);
                      const nextImg =
                        variant?.images?.[0] || variant?.image || fallbackImage;
                      setActiveImage(nextImg);
                    }}
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      idx === selectedVariantIndex
                        ? "border-indigo-500 scale-110"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                    style={{ backgroundColor: variant.colorHex || "#ccc" }}
                    title={variant.color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {shortDescription && (
            <p className="mt-5 text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed">
              {shortDescription}
            </p>
          )}

          {/* Description */}
          {description && (
            <p className="mt-5 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              {description}
            </p>
          )}

          {/* Features */}
          {features.length > 0 && (
            <ul className="mt-4 space-y-1">
              {features.map((f, idx) => (
                <li key={`${f}-${idx}`} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <CheckCircle2 size={14} className="text-indigo-500 shrink-0" />
                  {f || `Feature ${idx + 1}`}
                </li>
              ))}
            </ul>
          )}

          {/* Size selector for shoes */}
          {isShoe && (
            <div className="mt-5">
              <p className="text-sm text-slate-500 mb-2">
                Size:{" "}
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedSize ? `UK ${selectedSize}` : "Select a size"}
                </span>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {shoeSizes.map((size) => (
                  <motion.button
                    key={size}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedSize(size)}
                    disabled={Number(sizeStockMap[String(size)] ?? 0) < 1}
                    className={`h-10 min-w-[2.75rem] px-2 rounded-lg border-2 text-sm font-medium transition ${
                      selectedSize === size
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                        : "border-slate-300 dark:border-slate-700 hover:border-indigo-300 text-slate-700 dark:text-slate-300"
                    } ${Number(sizeStockMap[String(size)] ?? 0) < 1 ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {size}
                  </motion.button>
                ))}
              </div>
              {selectedSize != null && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {maxSelectableQty > 0 ? `${maxSelectableQty} left in UK ${selectedSize}` : `UK ${selectedSize} is out of stock`}
                </p>
              )}
            </div>
          )}

          {/* Quantity selector */}
          <div className="mt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-medium">Quantity</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={isOutOfStock || quantity <= 1}
                  className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-200"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="px-5 py-2 font-semibold text-slate-800 dark:text-slate-100 min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxSelectableQty, q + 1))}
                  disabled={isOutOfStock || quantity >= maxSelectableQty}
                  className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-200"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isShoe && selectedSize == null
                  ? "Select a size to check stock"
                  : isOutOfStock
                  ? "Out of stock"
                  : `Max ${maxSelectableQty} per order`}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-7 flex flex-wrap gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAddToCart}
              disabled={isShoe ? !selectedSize || isOutOfStock : isOutOfStock}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={18} />
              Add to Cart
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => toggleWishlist(hydratedProduct)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Heart
                size={18}
                fill={isInWishlist(hydratedProduct.id) ? "currentColor" : "none"}
                className={isInWishlist(hydratedProduct.id) ? "text-red-500" : ""}
              />
              {isInWishlist(hydratedProduct.id) ? "In Wishlist" : "Add to Wishlist"}
            </motion.button>
          </div>

          {!isOutOfStock && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Secure payments with</span>
              <img
                src="https://cdn.razorpay.com/logo.svg"
                alt="Razorpay"
                className="h-4 w-auto"
                loading="lazy"
              />
            </div>
          )}

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield size={14} className="text-green-500" /> Secure Payments
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-500" /> 100% Authentic
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-indigo-500" /> Ships in 2–5 days
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}