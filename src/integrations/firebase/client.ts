import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const app = initializeApp(firebaseConfig);

// Defer analytics — load asynchronously when idle (non-blocking)
let analyticsInstance: unknown = null;
if (typeof window !== "undefined") {
  const initAnalytics = () => {
    import("firebase/analytics")
      .then(({ getAnalytics }) => {
        try { analyticsInstance = getAnalytics(app); } catch { /* ad blockers */ }
      })
      .catch(() => { /* optional */ });
  };
  if ("requestIdleCallback" in window) {
    (window as typeof window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback?.(initAnalytics);
  } else {
    setTimeout(initAnalytics, 3000);
  }
}
export { analyticsInstance as analytics };

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
