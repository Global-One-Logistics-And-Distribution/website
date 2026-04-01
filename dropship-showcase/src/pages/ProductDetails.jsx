import { useMemo, useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Star, Heart, ArrowLeft, ShoppingCart, CreditCard, Minus, Plus, Eye, Clock, Tag, CheckCircle2, Shield } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import ProductDetailsSkeleton from "../components/ProductDetailsSkeleton";
import { formatINR } from "../utils/currency";
import { useProducts } from "../hooks/useProducts";
import { getProductIdFromSlug, getProductSlug } from "../utils/slug";

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

  const siteUrl = useMemo(() => {
    const envSite = import.meta.env.VITE_SITE_URL;
    if (typeof envSite === "string" && envSite.trim()) return envSite.trim().replace(/\/$/, "");
    if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
    return "https://www.elitedrop.net.in";
  }, []);

  const canonicalUrl = product ? `${siteUrl}/products/${getProductSlug(product)}` : `${siteUrl}/products`;
  const seoDescription =
    product?.shortDescription || product?.short_description || product?.description ||
    "Explore authentic premium products with fast delivery and secure checkout.";
  const seoImage =
    product?.image_url || product?.image || "https://www.elitedrop.net.in/android-chrome-512x512.png";
  const fallbackImage = "https://via.placeholder.com/1000x700?text=No+Image";

  useEffect(() => {
    if (!product || !slug) return;
    const canonicalSlug = getProductSlug(product);
    if (slug !== canonicalSlug) {
      navigate(`/products/${canonicalSlug}`, {
        replace: true,
        state: location.state,
      });
    }
  }, [product, slug, navigate, location.state]);

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

  const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0;
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const selectedVariant = hasVariants ? product.variants[selectedVariantIndex] : null;

  const isShoe = product?.category === "Luxury Shoes";
  const shoeSizes = [7, 8, 9, 10, 11];
  const [selectedSize, setSelectedSize] = useState(null);

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
  const hasFakeDiscount = product?.price && Number(product.price) > 0;
  const fakeDiscountPct = useMemo(() => (hasFakeDiscount ? (Math.floor(Math.random() * 6) + 18) : 0), [hasFakeDiscount]);
  const fakeMRP = useMemo(
    () => (hasFakeDiscount ? Math.round(Number(product.price) * (1 + fakeDiscountPct / 100)) : 0),
    [hasFakeDiscount, product?.price, fakeDiscountPct]
  );

  const images = useMemo(() => {
    if (!product) return [fallbackImage];
    if (hasVariants) {
      if (selectedVariant?.images?.length) return selectedVariant.images;
      if (selectedVariant?.image) return [selectedVariant.image];
    }
    // Support both JSON (gallery/image) and backend (gallery_urls/image_url) field names
    const gallery = product.gallery_urls || product.gallery;
    const mainImage = product.image_url || product.image;
    if (Array.isArray(gallery) && gallery.length) return gallery.filter(Boolean);
    if (Array.isArray(mainImage) && mainImage.length) return mainImage.filter(Boolean);
    if (mainImage) return [mainImage];
    return [fallbackImage];
  }, [product, hasVariants, selectedVariant]);

  const [activeImage, setActiveImage] = useState(images[0]);

  useEffect(() => {
    setActiveImage(images[0]);
  }, [images]);

  const stock = Number(product?.stock);
  const maxSelectableQty = Number.isFinite(stock) && stock >= 0 ? Math.min(10, stock) : 10;
  const isOutOfStock = maxSelectableQty < 1;

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
        <Helmet><title>Loading Product | G.O.L.D</title></Helmet>
        <ProductDetailsSkeleton />
      </>
    );
  }

  if (!product) {
    return (
      <section className="container-pad py-12">
        <Helmet><title>Product Not Found | G.O.L.D</title></Helmet>
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
    addToCart(product, safeQty, selectedSize);
    toast.success("Added to cart!");
  };

  const handleBuyNow = () => {
    if (isShoe && !selectedSize) {
      toast.error("Please select a size before buying.");
      return;
    }

    if (isOutOfStock) {
      toast.error("This product is out of stock");
      return;
    }

    const safeQty = Math.min(maxSelectableQty, Math.max(1, quantity));
    addToCart(product, safeQty, selectedSize);
    navigate("/checkout");
  };

  return (
    <section className="container-pad py-10">
      <Helmet>
        <title>{product.name} | G.O.L.D</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${product.name} | G.O.L.D`} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={seoImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} | G.O.L.D`} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={seoImage} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            image: Array.isArray(product.gallery_urls) && product.gallery_urls.length
              ? product.gallery_urls
              : [seoImage],
            description: seoDescription,
            brand: {
              "@type": "Brand",
              name: product.brand || "G.O.L.D",
            },
            category: product.category,
            sku: String(product.id),
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              price: Number(product.price || 0),
              availability: Number(product.stock || 0) > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              url: canonicalUrl,
            },
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
              alt={product.name}
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
                  alt={`${product.name} ${idx + 1}`}
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
            {product.brand} • {product.category}
          </p>
          <h1 className="text-3xl font-bold mt-1">{product.name}</h1>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-1.5 mt-3 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill={i < Math.round(product.rating) ? "currentColor" : "none"}
                />
              ))}
              <span className="text-slate-600 dark:text-slate-400 text-sm ml-1">
                {product.rating}
              </span>
            </div>
          )}

          {/* Price */}
          <div className="mt-4">
            {hasFakeDiscount ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatINR(product.price)}
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
                {product.variants.map((variant, idx) => (
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
                    className={`h-10 min-w-[2.75rem] px-2 rounded-lg border-2 text-sm font-medium transition ${
                      selectedSize === size
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                        : "border-slate-300 dark:border-slate-700 hover:border-indigo-300 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {size}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <p className="mt-5 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Features */}
          {Array.isArray(product.features) && product.features.length > 0 && (
            <ul className="mt-4 space-y-1">
              {product.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <CheckCircle2 size={14} className="text-indigo-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
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
                {isOutOfStock ? "Out of stock" : `Max ${maxSelectableQty} per order`}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-7 flex flex-wrap gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={18} />
              Add to Cart
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <CreditCard size={18} />
              Buy Now
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => toggleWishlist(product)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Heart
                size={18}
                fill={isInWishlist(product.id) ? "currentColor" : "none"}
                className={isInWishlist(product.id) ? "text-red-500" : ""}
              />
              {isInWishlist(product.id) ? "In Wishlist" : "Add to Wishlist"}
            </motion.button>
          </div>

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