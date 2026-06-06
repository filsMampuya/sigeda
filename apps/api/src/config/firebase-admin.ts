import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { Storage } from "firebase-admin/storage";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { env } from "./env";

const inferredProjectId = env.FIREBASE_PROJECT_ID ?? env.GCLOUD_PROJECT ?? env.GOOGLE_CLOUD_PROJECT ?? env.PROJECT_ID;
const inferredStorageBucket = env.FIREBASE_STORAGE_BUCKET ?? (inferredProjectId ? `${inferredProjectId}.firebasestorage.app` : undefined);

const hasExplicitCredentials =
  Boolean(env.FIREBASE_PROJECT_ID) &&
  Boolean(env.FIREBASE_CLIENT_EMAIL) &&
  Boolean(env.FIREBASE_PRIVATE_KEY);

const runsInGoogleManagedRuntime = Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET || inferredProjectId);

const firebaseApp: App | null = hasExplicitCredentials
  ? getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID!,
        clientEmail: env.FIREBASE_CLIENT_EMAIL!,
        privateKey: env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n")
      }),
      storageBucket: inferredStorageBucket
    })
  : runsInGoogleManagedRuntime
    ? getApps()[0] ??
      initializeApp({
        projectId: inferredProjectId,
        storageBucket: inferredStorageBucket
      })
    : null;

export const firebaseAuth = (firebaseApp ? getAuth(firebaseApp) : null) as Auth | null;
export const firestore = (firebaseApp ? getFirestore(firebaseApp) : null) as Firestore | null;
export const storage = (firebaseApp ? getStorage(firebaseApp) : null) as Storage | null;
