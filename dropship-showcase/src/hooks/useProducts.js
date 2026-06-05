import { useEffect, useState } from "react";
import { fetchProductById, fetchProducts } from "../utils/productsApi";

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchProducts()
      .then((rows) => {
        if (!cancelled) {
          setProducts(rows);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load products right now.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading, error };
}

export function useProduct(productId) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchProductById(productId)
      .then((row) => {
        if (!cancelled) {
          setProduct(row);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProduct(null);
          setError("Could not load this product.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  return { product, loading, error };
}
