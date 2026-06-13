import { AuditLogTable } from "@/components/audit/audit-log-table";
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
