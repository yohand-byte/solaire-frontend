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
  authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: required("VITE_FIREBASE_PROJECT_ID"),
};

const firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

const DEBUG = import.meta.env.VITE_DEBUG_FIREBASE === "true";
if (DEBUG || import.meta.env.DEV) {
  const apiKey = firebaseConfig.apiKey ?? "";
  const prefix = apiKey.slice(0, 6);
  // eslint-disable-next-line no-console
  console.info("[firebase:init]", {
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    apiKeyPrefix: prefix,
  });
}

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
