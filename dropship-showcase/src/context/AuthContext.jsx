import { createContext, useContext, useEffect, useCallback, useState } from "react";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "/api" : "https://dropship-v2.onrender.com/api");

const AuthContext = createContext(null);

function getStoredToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredToken);
  const [loading, setLoading] = useState(true);

  // Verify stored token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API}/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          // Token expired or invalid — clear it silently
          return Promise.reject(new Error("token_invalid"));
        }
        if (!r.ok) return Promise.reject(new Error("server_error"));
        return r.json();
      })
      .then(({ user: u }) => setUser(u))
      .catch(() => {
        sessionStorage.removeItem("token");
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback((newToken, newUser, options = {}) => {
    const rememberMe = options.rememberMe !== false;
    if (rememberMe) {
      localStorage.setItem("token", newToken);
      sessionStorage.removeItem("token");
    } else {
      sessionStorage.setItem("token", newToken);
      localStorage.removeItem("token");
    }
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Wraps any fetch call that requires auth.
   * Automatically logs out on 401 (expired JWT).
   */
  const authFetch = useCallback(
    (url, options = {}) => {
      const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      };
      return fetch(url, { ...options, headers }).then((res) => {
        if (res.status === 401) {
          logout();
        }
        return res;
      });
    },
    [token, logout]
  );

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
