import type { AuditLog } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { LongText } from "@/components/ui/long-text";
import { formatShortDate } from "@/lib/format";

export function RecentActivityCard({ logs }: { logs: AuditLog[] }) {
  return (
    <Card className="border-[color:var(--border)] p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] bg-[var(--header-tint)] px-5 py-3">
        <h3 className="text-sm font-semibold text-brand-navy">Activite recente</h3>
        <span className="rounded-full bg-[color:var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-brand-navy">
          {logs.length}
        </span>
      </div>
      <div className="space-y-2.5 px-4 py-4">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune activite recente disponible.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="rounded-md border border-[color:var(--border)] bg-[color:var(--panel)] px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <LongText value={log.action} label="Action" className="text-sm font-medium text-slate-900" />
                <span className="text-xs text-slate-400">{formatShortDate(log.createdAt)}</span>
              </div>
              <LongText value={log.description} label="Description de l'activite" className="mt-1 text-sm text-slate-600" />
              <LongText
                value={log.userName}
                label="Utilisateur"
                className="mt-2 text-xs uppercase tracking-[0.15em] text-slate-400"
              />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
