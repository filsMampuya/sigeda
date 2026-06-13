 "use client";

import { useEffect } from "react";

import { Card } from "@/components/ui/card";

type LoginFormProps = {
  autoRedirect?: boolean;
  errorCode?: string;
};

const errorMessages: Record<string, string> = {
  keycloak_state: "La session de connexion a expire. Relance l'authentification.",
  keycloak_callback: "La connexion SSO n'a pas abouti. Reessaie ou verifie le serveur Keycloak."
};

export function LoginForm({ autoRedirect = false, errorCode }: LoginFormProps) {
  const errorMessage = errorCode ? errorMessages[errorCode] ?? "La connexion n'a pas pu etre etablie." : null;

  useEffect(() => {
    if (!autoRedirect || errorMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      window.location.replace("/api/auth/login");
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [autoRedirect, errorMessage]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-3xl items-center justify-center">
      <Card className="w-full max-w-xl px-7 py-8">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">SIGEDA</p>
        <h1 className="mt-3 text-3xl font-semibold text-brand-navy">Hotel des Monnaies</h1>
        <p className="mt-2 text-sm text-slate-600">
          {errorMessage ? "Acces documentaire institutionnel" : "Redirection vers l'authentification securisee"}
        </p>
        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            {errorMessage}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Authentification</p>
            <p className="mt-2 text-sm text-slate-700">Connexion federee via Keycloak.</p>
          </div>
        )}
        <a
          href="/api/auth/login"
          className="mt-6 block rounded-xl bg-brand-navy px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-[#10263a]"
        >
          {errorMessage ? "Se connecter" : "Continuer"}
        </a>
        <p className="mt-4 text-xs text-slate-500">Banque Centrale du Congo</p>
      </Card>
    </div>
  );
}
