"use client";

import { useState, useTransition } from "react";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";

import { Card } from "@/components/ui/card";
import { getFirebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase-client";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isConfigured = isFirebaseClientConfigured();

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
      <Card className="w-full">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Acces securise</p>
        <h1 className="mt-3 text-2xl font-semibold text-brand-navy">Connexion SIGEDA</h1>
        <form
          className="mt-6 space-y-4"
          action={(formData) =>
            startTransition(async () => {
              try {
                setError(null);
                const auth = getFirebaseAuth();

                if (!auth) {
                  throw new Error("Firebase Auth n'est pas configure pour cette application.");
                }

                const email = String(formData.get("email") ?? "");
                const password = String(formData.get("password") ?? "");
                const credential = await signInWithEmailAndPassword(auth, email, password);
                const idToken = await credential.user.getIdToken();

                await fetch("/api/session", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({ idToken })
                });

                window.location.href = "/dashboard";
              } catch (caughtError) {
                if (caughtError instanceof Error && caughtError.message.includes("n'est pas configure")) {
                  setError(caughtError.message);
                  return;
                }

                if (caughtError instanceof FirebaseError && caughtError.code === "auth/configuration-not-found") {
                  setError("Firebase Authentication n'est pas encore active. Activez la connexion email/mot de passe dans la console Firebase.");
                  return;
                }

                setError("Connexion impossible. Verifiez vos identifiants Firebase.");
              }
            })
          }
        >
          <input
            name="email"
            type="email"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Email"
            required
          />
          <input
            name="password"
            type="password"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Mot de passe"
            required
          />
          {!isConfigured ? (
            <p className="text-sm text-amber-700">
              La configuration Firebase web est absente dans cet environnement.
            </p>
          ) : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            disabled={isPending}
            className="w-full rounded-xl bg-brand-navy px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </Card>
    </div>
  );
}
