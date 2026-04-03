import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import { normalizeImageUrl } from "../utils/productsApi";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://elitedrop-admin.onrender.com/api");
const GUEST_LS_KEY = "cart_items_guest";
const CART_MAX_QUANTITY = 10;

const CartContext = createContext(null);

function keyForUser(user) {
  return user?.id ? `cart_items_user_${user.id}` : GUEST_LS_KEY;
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

export function CartProvider({ children }) {
  const { user, token } = useAuth();
  const storageKey = keyForUser(user);

  const [items, setItems] = useState(() =>
    safeParseCart(safeStorageGet(storageKey))
  );
  const [hydratedStorageKey, setHydratedStorageKey] = useState(storageKey);

  useEffect(() => {
    // Read first when account context changes to avoid writing old items into a new key.
    setItems(safeParseCart(safeStorageGet(storageKey)));
    setHydratedStorageKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (hydratedStorageKey !== storageKey) return;
    safeStorageSet(storageKey, JSON.stringify(compactCartItems(items)));
  }, [storageKey, hydratedStorageKey, items]);

  useEffect(() => {
    if (!user || !token) return;

    let cancelled = false;

    const loadServerCart = async () => {
      try {
        const guestItems = safeParseCart(safeStorageGet(GUEST_LS_KEY));
        const syncRes = await fetch(`${API}/cart/sync/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items: guestItems }),
        });
        if (!syncRes.ok || cancelled) return;

        const syncData = await syncRes.json();
        const finalItems = normalizeServerItems(syncData);

        if (guestItems.length) {
          safeStorageRemove(GUEST_LS_KEY);
        }

        if (!cancelled) {
          setItems((prev) =>
            finalItems.map((s) => {
              const local = prev.find((p) => String(p.productId) === String(s.productId));
              const product = s.product || local?.product || null;
              return {
                productId: s.productId,
                quantity: s.quantity,
                selectedSize: s.selectedSize || local?.selectedSize || "",
                product,
              };
            })
          );
        }
      } catch {
        // keep cached user-specific state if API fails
      }
    };

    loadServerCart();
    return () => {
      cancelled = true;
    };
  }, [user?.id, token, storageKey]);

  const addToCart = useCallback(
    async (product, quantity = 1, selectedSize = "") => {
      const q = Math.max(1, Number(quantity) || 1);
      const pid = product?.id;
      if (pid == null) return;

      const existing = items.find((i) => String(i.productId) === String(pid));
      const existingQty = Number(existing?.quantity) || 0;
      const resolvedSize = selectedSize || existing?.selectedSize || "";
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
        const existingInState = prev.find((i) => String(i.productId) === String(pid));
        if (existingInState) {
          return prev.map((i) =>
            String(i.productId) === String(pid)
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

      if (user && token && quantityToAdd > 0) {
        try {
          const res = await fetch(`${API}/cart/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              productId: pid,
              quantity: quantityToAdd,
              selectedSize: resolvedSize,
            }),
          });
          if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            const msg =
              payload?.errors?.quantity?.[0] || payload?.error || "Could not update cart";
            toast.error(msg);

            const getRes = await fetch(`${API}/cart/`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (getRes.ok) {
              const getData = await getRes.json();
              setItems(normalizeServerItems(getData));
            }
          }
        } catch {}
      }
    },
    [items, user, token]
  );

  const updateQuantity = useCallback(
    async (productId, quantity) => {
      const q = Number(quantity);
      if (!Number.isFinite(q) || q < 1) return;

      const existing = items.find((i) => String(i.productId) === String(productId));
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
          String(i.productId) === String(productId) ? { ...i, quantity: bounded } : i
        )
      );

      if (user && token) {
        try {
          const res = await fetch(`${API}/cart/${productId}/`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ quantity: bounded }),
          });
          if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            const msg =
              payload?.errors?.quantity?.[0] || payload?.error || "Could not update cart";
            toast.error(msg);

            const getRes = await fetch(`${API}/cart/`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (getRes.ok) {
              const getData = await getRes.json();
              setItems(normalizeServerItems(getData));
            }
          }
        } catch {}
      }
    },
    [items, user, token]
  );

  const removeFromCart = useCallback(
    async (productId) => {
      setItems((prev) => prev.filter((i) => String(i.productId) !== String(productId)));
      toast.success("Removed from cart");

      if (user && token) {
        try {
          await fetch(`${API}/cart/${productId}/`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {}
      }
    },
    [user, token]
  );

  const clearCart = useCallback(async () => {
    setItems([]);
    if (user && token) {
      try {
        await fetch(`${API}/cart/`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
  }, [user, token]);

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
    }),
    [items, totalItems, totalPrice, addToCart, updateQuantity, removeFromCart, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);