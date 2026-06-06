import { createContext, useContext, useCallback, useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { normalizeImageUrl } from "../utils/productsApi";

const API = import.meta.env.VITE_API_URL || "/api";
const GUEST_LS_KEY = "cart_items_guest";
const CART_MAX_QUANTITY = 10;

const CartContext = createContext(null);

function keyForUser() {
  return GUEST_LS_KEY;
}

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

function compactProduct(product, selectedSize) {
  if (!product || typeof product !== "object") return null;
  const imageUrl = normalizeImageUrl(product.image_url ?? product.image ?? "");
  return {
    id: product.id ?? null,
    name: product.name ?? "",
    price: product.price ?? 0,
    image_url: imageUrl,
    image: imageUrl,
    brand: product.brand ?? "",
    category: product.category ?? "",
    selectedSize: selectedSize ?? product.selectedSize ?? "",
  };
}

function compactCartItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((i) => ({
    productId: i?.productId,
    quantity: Number(i?.quantity) || 1,
    selectedSize: i?.selectedSize ?? "",
    product: compactProduct(i?.product, i?.selectedSize),
  }));
}

function maxAllowedForProduct(product) {
  const stock = Number(product?.stock);
  if (Number.isFinite(stock) && stock >= 0) {
    return Math.min(CART_MAX_QUANTITY, stock);
  }
  return CART_MAX_QUANTITY;
}

function maxAllowedForProductSize(product, selectedSize = "") {
  const category = String(product?.category || "").toLowerCase();
  const isShoe = category.includes("shoe");
  if (!isShoe) return maxAllowedForProduct(product);

  const sizeKey = String(selectedSize || "").trim();
  const sizeStock = product?.size_stock || product?.sizeStock || {};
  const perSize = Number(sizeStock?.[sizeKey]);
  if (Number.isFinite(perSize) && perSize >= 0) {
    return Math.min(CART_MAX_QUANTITY, perSize);
  }
  return 0;
}

function safeParseCart(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i) =>
          i &&
          (typeof i.productId === "number" || typeof i.productId === "string") &&
          Number(i.quantity) > 0
      )
      .map((i) => ({
        ...i,
        product: i.product ?? null,
      }));
  } catch {
    return [];
  }
}

function normalizeServerItems(payload) {
  // supports: {items:[...]}, {cart:[...]}, [...]
  const arr = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.cart)
    ? payload.cart
    : [];

  return arr
    .map((it) => ({
      productId: it.product_id ?? it.productId ?? it.id,
      quantity: Number(it.quantity) || 1,
      selectedSize: it.selected_size ?? it.selectedSize ?? "",
      product: it.product ?? null,
    }))
    .filter((it) => it.productId != null && it.quantity > 0);
}

function normalizeSize(value) {
  return String(value || "").trim();
}

function sameCartItem(item, productId, selectedSize = "") {
  return (
    String(item?.productId) === String(productId) &&
    normalizeSize(item?.selectedSize) === normalizeSize(selectedSize)
  );
}

export function CartProvider({ children }) {
  const storageKey = keyForUser();

  const [items, setItems] = useState(() =>
    safeParseCart(safeStorageGet(storageKey))
  );

  useEffect(() => {
    safeStorageSet(storageKey, JSON.stringify(compactCartItems(items)));
  }, [storageKey, items]);

  const addToCart = useCallback(
    async (product, quantity = 1, selectedSize = "") => {
      const q = Math.max(1, Number(quantity) || 1);
      const pid = product?.id;
      if (pid == null) return;

      const normalizedSize = normalizeSize(selectedSize);

      const existing = items.find((i) => sameCartItem(i, pid, normalizedSize));
      const existingQty = Number(existing?.quantity) || 0;
      const resolvedSize = normalizedSize || normalizeSize(existing?.selectedSize);
      const maxAllowed = maxAllowedForProductSize(product || existing?.product, resolvedSize);

      if (maxAllowed < 1) {
        toast.error("This product is out of stock");
        return;
      }

      if (existingQty >= maxAllowed) {
        toast.error(`Maximum quantity is ${maxAllowed} for this product`);
        return;
      }

      const nextQty = Math.min(maxAllowed, existingQty + q);
      const quantityToAdd = nextQty - existingQty;

      setItems((prev) => {
        const existingInState = prev.find((i) => sameCartItem(i, pid, resolvedSize));
        if (existingInState) {
          return prev.map((i) =>
            sameCartItem(i, pid, resolvedSize)
              ? { ...i, quantity: nextQty, selectedSize: resolvedSize, product: i.product || product || null }
              : i
          );
        }
        return [...prev, { productId: pid, quantity: nextQty, selectedSize: resolvedSize, product: product || null }];
      });

      if (quantityToAdd < q) {
        toast.success(`Added to cart (max ${maxAllowed} allowed)`);
      } else {
        toast.success("Added to cart");
      }

      if (quantityToAdd > 0) {
        try {
          // no-op: cart is now managed locally only
        } catch {}
      }
    },
    [items]
  );

  const updateQuantity = useCallback(
    async (productId, quantity, selectedSize = "") => {
      const q = Number(quantity);
      if (!Number.isFinite(q) || q < 1) return;

      const normalizedSize = normalizeSize(selectedSize);
      const existing = items.find((i) => sameCartItem(i, productId, normalizedSize));
      const maxAllowed = maxAllowedForProductSize(existing?.product, existing?.selectedSize || "");
      if (maxAllowed < 1) {
        toast.error("This product is out of stock");
        return;
      }

      const bounded = Math.min(maxAllowed, Math.max(1, Math.floor(q)));
      if (bounded !== q) {
        toast.error(`Maximum quantity is ${maxAllowed} for this product`);
      }

      setItems((prev) =>
        prev.map((i) =>
          sameCartItem(i, productId, normalizedSize) ? { ...i, quantity: bounded } : i
        )
      );

      // cart is now managed locally only
    },
    [items]
  );

  const removeFromCart = useCallback(
    async (productId, selectedSize = "") => {
      const normalizedSize = normalizeSize(selectedSize);
      setItems((prev) => prev.filter((i) => !sameCartItem(i, productId, normalizedSize)));
      toast.success("Removed from cart");

      // cart is now managed locally only
    },
    []
  );

  const clearCart = useCallback(async () => {
    setItems([]);
  }, []);

  const reloadCart = useCallback(async () => {
    setItems(safeParseCart(safeStorageGet(storageKey)));
  }, [storageKey]);

  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0),
    [items]
  );

  const totalPrice = useMemo(
    () =>
      items.reduce(
        (sum, i) => sum + (Number(i.product?.price) || 0) * (Number(i.quantity) || 0),
        0
      ),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      totalItems,
      totalPrice,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      reloadCart,
    }),
    [items, totalItems, totalPrice, addToCart, updateQuantity, removeFromCart, clearCart, reloadCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
