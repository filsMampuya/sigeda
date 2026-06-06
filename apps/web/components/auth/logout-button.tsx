"use client";

import { useTransition } from "react";
import { signOut } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase-client";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const auth = getFirebaseAuth();

          if (auth) {
            await signOut(auth);
          }

          await fetch("/api/session", { method: "DELETE" });
          window.location.href = "/login";
        })
      }
      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-60"
    >
      {isPending ? "Deconnexion..." : "Se deconnecter"}
    </button>
  );
}
