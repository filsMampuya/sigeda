import { Card } from "@/components/ui/card";

export function LoginForm() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
      <Card className="w-full">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Acces securise</p>
        <h1 className="mt-3 text-2xl font-semibold text-brand-navy">Connexion SIGEDA</h1>
        <div className="mt-6 space-y-4">
          <p className="text-sm text-slate-600">
            L'authentification est geree par Keycloak. Vous serez redirige vers le portail SSO SIGEDA.
          </p>
          <a
            href="/api/auth/login"
            className="block w-full rounded-xl bg-brand-navy px-5 py-3 text-center text-sm font-medium text-white"
          >
            Se connecter avec Keycloak
          </a>
        </div>
      </Card>
    </div>
  );
}
