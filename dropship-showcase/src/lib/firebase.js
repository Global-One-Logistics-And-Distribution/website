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
  const fallback = "Firebase authentication failed. Please try again.";
  const rawMessage = String(error?.message || "");

  // Some Firebase SDK failures surface backend Identity Toolkit reasons only in message text.
  if (/operation_not_allowed/i.test(rawMessage)) {
    return "Phone sign-in is not enabled in Firebase Authentication. Enable the Phone provider in Firebase Console.";
  }
  if (/invalid_app_credential/i.test(rawMessage)) {
    return "Invalid app credential for phone auth. Check authorized domains and ensure reCAPTCHA is loading correctly.";
  }
  if (/captcha_check_failed/i.test(rawMessage)) {
    return "reCAPTCHA verification failed. Reload the page and try again.";
  }
  if (/invalid_phone_number/i.test(rawMessage)) {
    return "The phone number format is invalid. Use full format with country code (example: +919876543210).";
  }
  if (/quota_exceeded|sms_quota_exceeded/i.test(rawMessage)) {
    return "Firebase SMS quota exceeded for this project. Please try later or use test phone numbers in Firebase Auth.";
  }

  if (code.includes("auth/unauthorized-domain")) {
    return "This domain is not authorized in Firebase Auth. Add your production domain under Firebase Authentication > Settings > Authorized domains.";
  }
  if (code.includes("auth/operation-not-allowed")) {
    return "The selected Firebase sign-in method is not enabled. Enable the required provider in Firebase Authentication.";
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
  if (code.includes("auth/invalid-phone-number")) {
    return "The phone number format is invalid. Use full format with country code (example: +919876543210).";
  }
  if (code.includes("auth/missing-phone-number")) {
    return "Phone number is required.";
  }
  if (code.includes("auth/captcha-check-failed")) {
    return "reCAPTCHA verification failed. Refresh and try again.";
  }
  if (code.includes("auth/invalid-verification-code")) {
    return "The OTP you entered is incorrect.";
  }
  if (code.includes("auth/code-expired")) {
    return "OTP expired. Please request a new code.";
  }
  if (code.includes("auth/too-many-requests")) {
    return "Too many attempts. Please wait before trying again.";
  }
  if (code.includes("auth/quota-exceeded")) {
    return "Firebase SMS quota exceeded for this project. Please try later.";
  }
  if (code.includes("auth/billing-not-enabled")) {
    return "Firebase phone authentication requires billing for this project. Enable billing in Google Cloud, then retry OTP.";
  }

  const msg = String(error?.message || "").trim();
  return msg || fallback;
}
