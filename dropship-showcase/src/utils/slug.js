export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getProductSlug(product) {
  const base = slugify(product?.name || "product");
  const id = String(product?.id || "").trim();
  return id ? `${base || "product"}-${id}` : base || "product";
}

export function getProductIdFromSlug(slugOrId) {
  const raw = String(slugOrId || "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);

  const match = raw.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}