import Link from "next/link";
import type { DocumentEntity } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

export function DocumentTable({ rows }: { rows: DocumentEntity[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-6 py-4 font-medium">Référence</th>
            <th className="px-6 py-4 font-medium">Titre</th>
            <th className="px-6 py-4 font-medium">Statut</th>
            <th className="px-6 py-4 font-medium">Direction</th>
            <th className="px-6 py-4 font-medium">Création</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                Aucun document.
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-6 py-4 font-medium text-brand-navy">
                <Link href={`/documents/${row.id}`} className="hover:underline">
                  {row.numeroReference}
                </Link>
              </td>
              <td className="px-6 py-4">{row.title ?? row.fileName ?? "—"}</td>
              <td className="px-6 py-4">
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {row.status ?? "-"}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-600">
                {formatStructureLabel(row.direction.code, row.direction.designation, row.directionId)}
              </td>
              <td className="px-6 py-4 text-slate-600">{formatShortDate(row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
