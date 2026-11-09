import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const env = (typeof import.meta !== "undefined" && import.meta.env) || (typeof process !== "undefined" && process.env) || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: env.VITE_FIREBASE_APP_ID || "",
};

/**
 * Kiểm tra xem Firebase đã được điền đủ thông tin cấu hình hợp lệ chưa.
 */
export const isFirebaseConfigured = () => {
  const { apiKey, projectId } = firebaseConfig;
  return Boolean(
    apiKey &&
      apiKey.trim() !== "" &&
      apiKey !== "YOUR_FIREBASE_API_KEY" &&
      projectId &&
      projectId.trim() !== "" &&
      projectId !== "your-project-id"
  );
};

// Khởi tạo app an toàn
let appInstance = null;
let authInstance = null;

try {
  if (getApps().length > 0) {
    appInstance = getApp();
  } else if (isFirebaseConfigured()) {
    appInstance = initializeApp(firebaseConfig);
  } else {
    // Khởi tạo với config tối thiểu để không gây crash app khi chưa điền env
    appInstance = initializeApp({
      apiKey: "AIzaSyDummyKeyForDevelopment1234567890",
      projectId: "smart-parking-dev",
      appId: "1:1234567890:web:dummy",
    });
  }
  authInstance = getAuth(appInstance);
} catch (error) {
  console.warn("[Firebase Init Warning] Không thể khởi tạo Firebase:", error);
}

export const auth = authInstance;
export default appInstance;
