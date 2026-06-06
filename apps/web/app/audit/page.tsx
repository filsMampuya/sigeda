import { AuditLogTable } from "@/components/audit/audit-log-table";
import { getAuditLogs } from "@/lib/api";

export default async function AuditPage() {
  const logs = await getAuditLogs();

  return <AuditLogTable logs={logs ?? []} />;
}
