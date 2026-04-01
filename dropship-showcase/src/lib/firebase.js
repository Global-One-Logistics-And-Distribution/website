import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);

export const firebaseApp = firebaseConfigured ? initializeApp(firebaseConfig) : null;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

let analyticsPromise = null;

export function initFirebaseAnalytics() {
  if (!firebaseApp || typeof window === "undefined") return Promise.resolve(null);
  if (analyticsPromise) return analyticsPromise;

  analyticsPromise = isSupported()
    .then((supported) => {
      if (!supported) return null;
      return getAnalytics(firebaseApp);
    })
    .catch(() => null);

  return analyticsPromise;
}

export function isFirebaseAuthConfigured() {
  return Boolean(firebaseAuth);
}

export async function signInWithGoogleFirebase() {
  if (!firebaseAuth) throw new Error("Firebase auth not configured");
  const credential = await signInWithPopup(firebaseAuth, googleProvider);
  const idToken = await credential.user.getIdToken();
  return {
    idToken,
    name: credential.user.displayName || "",
  };
}

export function getFirebaseAuthErrorMessage(error) {
  const code = String(error?.code || "").toLowerCase();
  const fallback = "Google sign in failed. Please try again.";

  if (code.includes("auth/unauthorized-domain")) {
    return "This domain is not authorized in Firebase Auth. Add your production domain under Firebase Authentication > Settings > Authorized domains.";
  }
  if (code.includes("auth/operation-not-allowed")) {
    return "Google sign-in is not enabled in Firebase Authentication. Enable the Google provider in Firebase Console.";
  }
  if (code.includes("auth/popup-blocked")) {
    return "Popup was blocked by the browser. Allow popups for this site and try again.";
  }
  if (code.includes("auth/popup-closed-by-user") || code.includes("auth/cancelled-popup-request")) {
    return "Google sign-in was cancelled before completion.";
  }
  if (code.includes("auth/network-request-failed")) {
    return "Network error while contacting Firebase. Check your internet connection and try again.";
  }
  if (code.includes("auth/invalid-api-key") || code.includes("auth/app-not-authorized")) {
    return "Firebase web app configuration is invalid for this domain. Verify your Firebase config values and authorized domains.";
  }

  const msg = String(error?.message || "").trim();
  return msg || fallback;
}
