import type { DocumentArchiveListItem } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function DocumentArchiveTable({ rows }: { rows: DocumentArchiveListItem[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-6 py-4 font-medium">Mouvement</th>
            <th className="px-6 py-4 font-medium">Année</th>
            <th className="px-6 py-4 font-medium">Référence</th>
            <th className="px-6 py-4 font-medium">Titre</th>
            <th className="px-6 py-4 font-medium">Direction</th>
            <th className="px-6 py-4 font-medium">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                Aucune archive.
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-6 py-4 font-medium text-brand-navy">{row.movementType}</td>
              <td className="px-6 py-4">{row.year}</td>
              <td className="px-6 py-4 font-medium">{row.documentReference}</td>
              <td className="px-6 py-4">{row.documentTitle ?? "—"}</td>
              <td className="px-6 py-4 text-slate-600">
                {formatDirection(row.currentDirectionCode, row.currentDirectionName, row.directionId)}
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {row.documentStatus ?? "-"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function formatDirection(code?: string, designation?: string, fallback?: string) {
  if (code && designation) {
    return `${code} - ${designation}`;
  }

  return designation ?? code ?? fallback ?? "-";
}

function formatPartnerDirections(codes: string[], names: string[]) {
  return codes.map((code, index) => formatDirection(code, names[index])).join(", ");
}
