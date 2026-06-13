import { LogoutButton } from "@/components/auth/logout-button";
import { BackButton } from "@/components/ui/back-button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser, getDepartements } from "@/lib/api";
import { formatRoleLabel, formatStructureLabel } from "@/lib/format";

export default async function AdminSettingsPage() {
  const [currentUser, departments] = await Promise.all([getCurrentUser(), getDepartements()]);
  const user = currentUser?.user ?? null;
  const direction = (departments ?? []).find((item) => item.id === user?.directionId);
  const service = (departments ?? []).find((item) => item.id === user?.serviceId);
  const bureau = (departments ?? []).find((item) => item.id === user?.bureauId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compte"
        title="Mon profil"
        actions={<BackButton fallbackHref="/documents" label="Retour aux documents" />}
      />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-[color:var(--border)] p-0">
          <div className="border-b border-[color:var(--border)] bg-[var(--header-tint)] px-6 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Identite</p>
            <h2 className="mt-1 text-lg font-semibold text-brand-navy">{user?.displayName ?? "Utilisateur non charge"}</h2>
          </div>
          <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Email</p>
              <p className="mt-2 text-sm text-slate-800">{user?.email ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Role</p>
              <p className="mt-2 text-sm text-slate-800">{formatRoleLabel(user?.role)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Direction</p>
              <p className="mt-2 text-sm text-slate-800">
                {direction ? formatStructureLabel(direction.code, direction.designation) : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Service</p>
              <p className="mt-2 text-sm text-slate-800">
                {service ? formatStructureLabel(service.code, service.designation) : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Bureau</p>
              <p className="mt-2 text-sm text-slate-800">
                {bureau ? formatStructureLabel(bureau.code, bureau.designation) : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Connexion</p>
              <p className="mt-2 text-sm text-slate-800">Keycloak</p>
            </div>
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="border-[color:var(--border)]">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Session</p>
            <h2 className="mt-3 text-lg font-semibold text-brand-navy">Acces securise</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              La session applicative est federee par Keycloak et rattachee au referentiel PostgreSQL.
            </p>
            <div className="mt-5">
              <LogoutButton />
            </div>
          </Card>
          <Card className="border-[color:var(--border)]">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Institution</p>
            <h2 className="mt-3 text-lg font-semibold text-brand-navy">Hotel des Monnaies</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              SIGEDA est exploite dans le cadre institutionnel de l'Hotel des Monnaies de la Banque Centrale du Congo.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
