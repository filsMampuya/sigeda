import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
      <Card className="w-full">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Acces securise</p>
        <h1 className="mt-3 text-2xl font-semibold text-brand-navy">Connexion SIGEDA</h1>
        <div className="mt-6 space-y-4">
          <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Email" />
          <input
            type="password"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Mot de passe"
          />
          <button className="w-full rounded-xl bg-brand-navy px-5 py-3 text-sm font-medium text-white">
            Se connecter
          </button>
        </div>
      </Card>
    </div>
  );
}
