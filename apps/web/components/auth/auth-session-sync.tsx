"use client";

import { useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase-client";

export function AuthSessionSync() {
  useEffect(() => {
    const auth = getFirebaseAuth();

    if (!auth) {
      return;
    }

    return onIdTokenChanged(auth, async (user) => {
      if (!user) {
        await fetch("/api/session", {
          method: "DELETE"
        });
        return;
      }

      const idToken = await user.getIdToken();

      await fetch("/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ idToken })
      });
    });
  }, []);

  return null;
}
