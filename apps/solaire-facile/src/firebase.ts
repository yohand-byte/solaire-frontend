import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const required = (key: string) => {
  const value = import.meta.env?.[key];
  if (!value) {
    throw new Error(`Firebase config manquant: ${key}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: required("VITE_FIREBASE_API_KEY"),
  authDomain: "solaire-frontend.firebaseapp.com",
  projectId: required("VITE_FIREBASE_PROJECT_ID"),
  appId: required("VITE_FIREBASE_APP_ID"),
  storageBucket: required("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: required("VITE_FIREBASE_MESSAGING_SENDER_ID"),
};

export const app =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
