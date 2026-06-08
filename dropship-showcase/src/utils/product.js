/**
 * Shared product utility functions used across ProductCard, ProductListing, and Cart.
 */

const DISCOUNT_TABLE = [18, 20, 22, 25, 28, 30];

/** Returns a deterministic discount percentage (18–30%) based on product id. */
export function getDiscount(id) {
  return DISCOUNT_TABLE[Number(id) % DISCOUNT_TABLE.length];
}

export function getMRP(price, id) {
  const pct = getDiscount(id);
  const rawMrp = price / (1 - pct / 100);
  let mrp = Math.round(rawMrp / 50) * 50;
  if (mrp <= price) {
    mrp = Math.ceil(rawMrp);
  }
  return mrp;
}

/** Returns a deterministic fake review count based on product id. */
export function getReviewCount(id) {
  const base = (Number(id) * 37 + 113) % 950;
  return base + 50;
}
