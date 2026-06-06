import Link from "next/link";
import type { DocumentEntity } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";

export function DocumentTable({ rows }: { rows: DocumentEntity[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-6 py-4 font-medium">Reference</th>
            <th className="px-6 py-4 font-medium">Titre</th>
            <th className="px-6 py-4 font-medium">Fichier</th>
            <th className="px-6 py-4 font-medium">Numerisation</th>
            <th className="px-6 py-4 font-medium">Confidentialite</th>
            <th className="px-6 py-4 font-medium">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                Aucun document disponible pour les filtres selectionnes.
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-6 py-4 font-medium text-brand-navy">
                <Link href={`/documents/${row.id}`} className="hover:underline">
                  {row.reference}
                </Link>
              </td>
              <td className="px-6 py-4">{row.title}</td>
              <td className="px-6 py-4">{row.fileKind ?? "-"}</td>
              <td className="px-6 py-4">{row.digitizationStatus ?? "-"}</td>
              <td className="px-6 py-4">{row.confidentialityLevel}</td>
              <td className="px-6 py-4">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
