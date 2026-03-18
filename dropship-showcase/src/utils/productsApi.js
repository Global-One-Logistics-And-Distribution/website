const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://dropship-v2.onrender.com/api");

let productsCache = null;
let productsPromise = null;

function toString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((v) => toString(v)).filter(Boolean);
  }
  const one = toString(value);
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
  const res = await fetch(`${API}/products/${id}/`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to load product details");
  }
  const data = await res.json();
  return normalizeProduct(data?.product);
}

export function clearProductsCache() {
  productsCache = null;
  productsPromise = null;
}
