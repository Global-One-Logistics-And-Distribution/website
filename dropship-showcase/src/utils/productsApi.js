const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://dropship-v2.onrender.com/api");

let productsCache = null;
let productsPromise = null;
let productByIdCache = new Map();
let productByIdPromises = new Map();

const PRODUCT_DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;

function toString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeImageUrl(url) {
  const value = toString(url);
  if (!value) return "";

  try {
    const parsed = new URL(value);
    if (parsed.hostname === "www.myluxezone.com") {
      parsed.hostname = "myluxezone.com";
      return parsed.toString();
    }
    return value;
  } catch {
    return value;
  }
}

function asStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((v) => normalizeImageUrl(v)).filter(Boolean);
  }
  const one = normalizeImageUrl(value);
  return one ? [one] : [];
}

export function normalizeProduct(raw) {
  if (!raw || typeof raw !== "object") return null;

  const gallery = asStringArray(raw.gallery_urls || raw.gallery);
  const imageValues = asStringArray(raw.image_url || raw.image);
  const image = imageValues.length ? imageValues[0] : gallery[0] || "";

  return {
    ...raw,
    id: Number(raw.id),
    image_url: image,
    image,
    gallery_urls: gallery.length ? gallery : (image ? [image] : []),
    gallery: gallery.length ? gallery : (image ? [image] : []),
    short_description: raw.short_description || raw.shortDescription || "",
    shortDescription: raw.shortDescription || raw.short_description || "",
    product_code: raw.product_code || raw.productCode || "",
    productCode: raw.productCode || raw.product_code || "",
  };
}

export async function fetchProducts({ useCache = true } = {}) {
  if (useCache && productsCache) return productsCache;
  if (useCache && productsPromise) return productsPromise;

  productsPromise = fetch(`${API}/products/`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    })
    .then((data) => {
      const rows = Array.isArray(data?.products) ? data.products : [];
      const normalized = rows.map(normalizeProduct).filter(Boolean);
      productsCache = normalized;
      return normalized;
    })
    .finally(() => {
      productsPromise = null;
    });

  return productsPromise;
}

export async function fetchProductById(id) {
  const key = String(id);
  const cached = productByIdCache.get(key);
  if (cached && Date.now() - cached.cachedAt < PRODUCT_DETAIL_CACHE_TTL_MS) {
    return cached.value;
  }

  if (productByIdPromises.has(key)) {
    return productByIdPromises.get(key);
  }

  const request = fetch(`${API}/products/${id}/`)
    .then((res) => {
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to load product details");
      }
      return res.json();
    })
    .then((data) => {
      const normalized = normalizeProduct(data?.product);
      productByIdCache.set(key, { value: normalized, cachedAt: Date.now() });
      return normalized;
    })
    .finally(() => {
      productByIdPromises.delete(key);
    });

  productByIdPromises.set(key, request);
  return request;
}

export function clearProductsCache() {
  productsCache = null;
  productsPromise = null;
  productByIdCache = new Map();
  productByIdPromises = new Map();
}
