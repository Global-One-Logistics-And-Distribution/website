import { createContext, useContext, useEffect, useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://elitedrop-admin.onrender.com/api");
const GUEST_LS_KEY = "wishlist_ids_guest";

const WishlistContext = createContext(null);

function keyForUser(user) {
  return user?.id ? `wishlist_ids_user_${user.id}` : GUEST_LS_KEY;
}

function readWishlistSet(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (!Array.isArray(saved)) return new Set();
    return new Set(saved.map((id) => String(id)));
  } catch {
    return new Set();
  }
}

export function WishlistProvider({ children }) {
  const { user, token } = useAuth();
  const storageKey = keyForUser(user);

  // Store wishlist as a Set of product IDs for O(1) lookups
  const [wishlistIds, setWishlistIds] = useState(() => readWishlistSet(GUEST_LS_KEY));

  // Legacy field kept for compatibility with older components.
  const wishlistProducts = [];

  // Persist IDs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...wishlistIds]));
  }, [storageKey, wishlistIds]);

  // ── Load scope-specific wishlist state ─────────────────────────────────────
  useEffect(() => {
    if (!user || !token) {
      setWishlistIds(readWishlistSet(GUEST_LS_KEY));
      return;
    }

    // Show cached user-specific wishlist immediately while API request loads.
    setWishlistIds(readWishlistSet(storageKey));

    let cancelled = false;

    const loadWishlist = async () => {
      try {
        const res = await fetch(`${API}/wishlist/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;

        const data = await res.json();
        const ids = Array.isArray(data?.items)
          ? data.items.map((id) => String(id))
          : [];

        if (!cancelled) {
          setWishlistIds(new Set(ids));
        }
      } catch {
        // Keep cached scoped state if request fails.
      }
    };

    loadWishlist();
    return () => {
      cancelled = true;
    };
  }, [user?.id, token, storageKey]);

  // ── Toggle (add or remove) ─────────────────────────────────────────────────
  const toggleWishlist = useCallback(
    async (product) => {
      const productId = product?.id;
      if (productId == null) return;
      const normalizedId = String(productId);
      let nextAction = "added";

      // Optimistic update
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (next.has(normalizedId)) {
          next.delete(normalizedId);
          nextAction = "removed";
        } else {
          next.add(normalizedId);
          nextAction = "added";
        }
        return next;
      });

      toast.success(nextAction === "removed" ? "Removed from wishlist" : "Added to wishlist");

      // Sync to backend if authenticated
      if (user && token) {
        try {
          await fetch(`${API}/wishlist/toggle/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ productId: Number(productId) }),
          });
        } catch {
          // Offline — localStorage already updated
        }
      }
    },
    [user, token]
  );

  const isInWishlist = useCallback((id) => wishlistIds.has(String(id)), [wishlistIds]);

  const value = useMemo(
    () => ({
      wishlist: wishlistProducts,
      wishlistIds,
      toggleWishlist,
      isInWishlist,
      // Legacy compat shims
      addToWishlist: toggleWishlist,
      removeFromWishlist: (id) => toggleWishlist({ id }),
    }),
    [wishlistProducts, wishlistIds, toggleWishlist, isInWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
