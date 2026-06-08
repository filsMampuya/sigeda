import Link from "next/link";
import type { DocumentEntity, PaginatedResult } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
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
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-brand-navy">{title}</h3>
        <Link href={viewAllHref} className="text-xs font-medium text-brand-navy hover:underline">
          Tout voir
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {documents.length === 0 ? (
          <p className="text-xs text-slate-500">{emptyLabel}</p>
        ) : (
          documents.map((document) => (
            <Link
              key={document.id}
              href={`/documents/${document.id}`}
              className="block rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-brand-navy">{document.numeroReference}</p>
                  <p className="mt-1 truncate text-sm text-slate-900">
                    {document.title ?? document.subject ?? document.fileName ?? "—"}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
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
