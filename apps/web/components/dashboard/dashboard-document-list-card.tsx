import Link from "next/link";
import type { DocumentEntity, PaginatedResult } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { LongText } from "@/components/ui/long-text";
import { formatShortDate } from "@/lib/format";

type DashboardDocumentListCardProps = {
  data: PaginatedResult<DocumentEntity> | null;
  title: string;
  emptyLabel: string;
  viewAllHref?: string;
};

export function DashboardDocumentListCard({
  data,
  title,
  emptyLabel,
  viewAllHref = "/documents"
}: DashboardDocumentListCardProps) {
  const documents = data?.items ?? [];

  return (
    <Card className="border-[color:var(--border)] p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] bg-[var(--header-tint)] px-5 py-3">
        <h3 className="text-sm font-semibold text-brand-navy">{title}</h3>
        <Link
          href={viewAllHref}
          className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Tout voir
        </Link>
      </div>
      <div className="space-y-2.5 px-4 py-4">
        {documents.length === 0 ? (
          <p className="text-xs text-slate-500">{emptyLabel}</p>
        ) : (
          documents.map((document) => (
            <Link
              key={document.id}
              href={`/documents/${document.id}`}
              className="block rounded-md border border-[color:var(--border)] px-3.5 py-3 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <LongText value={document.numeroReference} label="Reference du document" className="text-xs font-medium text-brand-navy" />
                  <LongText
                    value={document.title ?? document.subject ?? document.fileName ?? "-"}
                    label="Titre du document"
                    className="mt-1 text-sm text-slate-900"
                  />
                </div>
                <span className="rounded-full bg-[color:var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-brand-navy">
                  {document.status ?? "-"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>{document.year}</span>
                <span>{formatShortDate(document.createdAt)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}
