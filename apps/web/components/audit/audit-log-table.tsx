import type { AuditLog } from "@sigeda/shared/types";
import { useMemo } from "react";

import { Card } from "@/components/ui/card";
import { LongText } from "@/components/ui/long-text";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { formatShortDate } from "@/lib/format";

export function AuditLogTable({
  logs,
  page = 1,
  pageSize = 10
}: {
  logs: AuditLog[];
  page?: number;
  pageSize?: number;
}) {
  const total = logs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedLogs = useMemo(
    () => logs.slice((safePage - 1) * pageSize, safePage * pageSize),
    [logs, pageSize, safePage]
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-[color:var(--border)] bg-[var(--header-tint)] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-brand-navy">Evenements traces</h2>
          <p className="mt-1 text-xs text-slate-500">{logs.length} enregistrement(s)</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full table-fixed divide-y divide-slate-200 text-sm">
          <thead className="bg-[var(--table-head)] text-left text-slate-700">
            <tr>
              <th className="w-[24%] px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em]">Utilisateur</th>
              <th className="w-[20%] px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em]">Action</th>
              <th className="w-[36%] px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em]">Entite</th>
              <th className="w-[20%] px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em]">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                  Aucun log disponible.
                </td>
              </tr>
            ) : null}
            {paginatedLogs.map((log) => (
              <tr key={log.id} className="align-top">
                <td className="px-5 py-4 text-slate-800">
                  <LongText value={log.userName} label="Utilisateur" />
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-[color:var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-brand-navy">
                    {log.action}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  <LongText value={log.entityType} label="Type d'entite" className="font-medium text-slate-800" />
                  <LongText value={log.entityId} label="Identifiant d'entite" className="mt-1 text-xs text-slate-500" />
                </td>
                <td className="px-5 py-4 text-slate-600">{formatShortDate(log.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 px-4 py-3">
        <PaginationControls page={safePage} pageSize={pageSize} total={total} totalPages={totalPages} />
      </div>
    </Card>
  );
}
