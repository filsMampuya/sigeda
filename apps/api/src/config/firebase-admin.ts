import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { Storage } from "firebase-admin/storage";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { env } from "./env";

const hasExplicitCredentials =
  Boolean(env.FIREBASE_PROJECT_ID) &&
  Boolean(env.FIREBASE_CLIENT_EMAIL) &&
  Boolean(env.FIREBASE_PRIVATE_KEY);

const firebaseApp: App | null = hasExplicitCredentials
  ? getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID!,
        clientEmail: env.FIREBASE_CLIENT_EMAIL!,
        privateKey: env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n")
      }),
      storageBucket: env.FIREBASE_STORAGE_BUCKET
    })
  : null;

export const firebaseAuth = (firebaseApp ? getAuth(firebaseApp) : null) as Auth | null;
export const firestore = (firebaseApp ? getFirestore(firebaseApp) : null) as Firestore | null;
export const storage = (firebaseApp ? getStorage(firebaseApp) : null) as Storage | null;
