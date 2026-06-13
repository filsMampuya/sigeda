import Link from "next/link";
import type { ArchiveFolderDocumentListItem } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { LongText } from "@/components/ui/long-text";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

export function ArchiveFolderDocumentsTable({ rows }: { rows: ArchiveFolderDocumentListItem[] }) {
  return (
    <Card className="min-w-0 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-slate-200 bg-[var(--header-tint)] px-5 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Inventaire</p>
          <h2 className="text-sm font-semibold text-brand-navy">Documents classes</h2>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
          {rows.length} element{rows.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-[1120px] w-full table-fixed divide-y divide-slate-200 text-sm">
          <thead className="bg-[var(--table-head)] text-left text-slate-700">
            <tr>
              <th className="w-[9%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Mouvement</th>
              <th className="w-[14%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Reference</th>
              <th className="w-[21%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Objet</th>
              <th className="w-[13%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Direction emettrice</th>
              <th className="w-[11%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Destinataires</th>
              <th className="w-[9%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Copies</th>
              <th className="w-[10%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Signataires</th>
              <th className="w-[9%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Date</th>
              <th className="w-[13%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-slate-500">
                  Aucun document archive dans ce classeur.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.archiveId} className="align-top hover:bg-slate-50/80">
                <td className="px-5 py-3.5">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {row.movementType}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <LongText value={row.reference} label="Reference du document" className="font-medium text-brand-navy" />
                </td>
                <td className="px-5 py-3.5">
                  <LongText value={row.subject || row.title} label="Objet du document" />
                </td>
                <td className="px-5 py-3.5">
                  <LongText
                    value={formatStructureLabel(row.emitterDirectionCode, row.emitterDirectionName, row.emitterDirectionId)}
                    label="Direction emettrice"
                  />
                </td>
                <td className="px-5 py-3.5">
                  <LongText value={row.receiverDirectionNames.join(", ") || "-"} label="Directions destinataires" />
                </td>
                <td className="px-5 py-3.5">
                  <LongText value={row.copyDirectionNames.join(", ") || "-"} label="Directions en copie" />
                </td>
                <td className="px-5 py-3.5">
                  <LongText
                    value={row.signers.length ? row.signers.map((signer) => signer.fullName).join(", ") : "-"}
                    label="Signataires"
                  />
                </td>
                <td className="px-5 py-3.5 text-slate-600">
                  {formatShortDate(row.movementType === "SORTIE" ? row.archivedAt : row.createdAt)}
                </td>
                <td className="px-5 py-3.5">
                  <Link
                    href={`/documents/${row.documentId}`}
                    className="inline-flex min-w-[140px] items-center justify-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Consulter
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
