import { AuditLogTable } from "@/components/audit/audit-log-table";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getAuditLogs } from "@/lib/api";

type AuditPageProps = {
  searchParams?: {
    page?: string;
    pageSize?: string;
  };
};

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const logs = await getAuditLogs();
  const page = Number(searchParams?.page ?? "1");
  const pageSize = Number(searchParams?.pageSize ?? "10");

  if (logs === null) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Controle interne"
          title="Journal d'audit"
          description="Consultation reservee aux profils habilites."
        />
        <Card className="border-[color:var(--border)]">
          <h3 className="text-lg font-semibold text-brand-navy">Acces restreint</h3>
          <p className="mt-3 text-sm text-slate-600">
            Le journal d&apos;audit est reserve aux administrateurs et aux auditeurs. Cette restriction est appliquee
            pour proteger la tracabilite institutionnelle.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Controle interne"
        title="Journal d'audit"
        description="Historique des actions tracees sur les documents, archives et operations d'administration."
      />
      <AuditLogTable logs={logs ?? []} page={Number.isFinite(page) ? page : 1} pageSize={Number.isFinite(pageSize) ? pageSize : 10} />
    </div>
  );
}
