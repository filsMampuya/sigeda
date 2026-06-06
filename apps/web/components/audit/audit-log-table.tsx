import type { AuditLog } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-6 py-4 font-medium">Utilisateur</th>
            <th className="px-6 py-4 font-medium">Action</th>
            <th className="px-6 py-4 font-medium">Entite</th>
            <th className="px-6 py-4 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {logs.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                Aucun log disponible.
              </td>
            </tr>
          ) : null}
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="px-6 py-4">{log.userName}</td>
              <td className="px-6 py-4">{log.action}</td>
              <td className="px-6 py-4">{log.entityType} #{log.entityId}</td>
              <td className="px-6 py-4">{new Date(log.createdAt).toLocaleDateString("fr-FR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
