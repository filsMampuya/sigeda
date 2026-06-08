import type { AuditLog } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { formatShortDate } from "@/lib/format";

export function RecentActivityCard({ logs }: { logs: AuditLog[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-brand-navy">Activite recente</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {logs.length}
        </span>
      </div>
      <div className="mt-4 space-y-4">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune activite recente disponible.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-900">{log.action}</p>
                <span className="text-xs text-slate-400">{formatShortDate(log.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{log.description}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.15em] text-slate-400">{log.userName}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
