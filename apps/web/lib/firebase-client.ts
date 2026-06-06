import type { FirebaseApp } from "firebase/app";
import { getApp, getApps, initializeApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";

import { getOptionalFirebaseWebConfig } from "@/lib/env";

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let persistenceConfigured = false;

export function isFirebaseClientConfigured() {
  return getOptionalFirebaseWebConfig() !== null;
}

export function getFirebaseApp() {
  if (typeof window === "undefined") {
    return null;
  }

  const config = getOptionalFirebaseWebConfig();

  if (!config) {
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApp() : initializeApp(config);
  }

  return firebaseApp;
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();

  if (!app) {
    return null;
  }

  if (!firebaseAuth) {
    firebaseAuth = getAuth(app);
  }

  if (!persistenceConfigured) {
    persistenceConfigured = true;
    void setPersistence(firebaseAuth, browserLocalPersistence);
  }

  return firebaseAuth;
}
