import type { AuditLog } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";

export function RecentActivityCard({ logs }: { logs: AuditLog[] }) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-brand-navy">Activite recente</h3>
      <div className="mt-4 space-y-4">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune activite recente disponible.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
              <p className="text-sm font-medium text-slate-900">{log.action}</p>
              <p className="mt-1 text-sm text-slate-600">{log.description}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.15em] text-slate-400">{log.userName}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
