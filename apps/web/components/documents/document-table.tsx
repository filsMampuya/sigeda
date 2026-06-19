"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DocumentEntity } from "@sigeda/shared/types";

import { ColumnVisibilityMenu } from "@/components/ui/column-visibility-menu";
import { Card } from "@/components/ui/card";
import { LongText } from "@/components/ui/long-text";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SortableColumnHeader, type SortDirection } from "@/components/ui/sortable-column-header";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

type DocumentSortField =
  | "reference"
  | "title"
  | "type"
  | "direction"
  | "movementType"
  | "status"
  | "confidentiality"
  | "createdAt"
  | "updatedAt";

type ColumnId =
  | "reference"
  | "title"
  | "type"
  | "direction"
  | "receivers"
  | "movementType"
  | "status"
  | "confidentiality"
  | "createdAt";

const allColumns: Array<{ id: ColumnId; label: string }> = [
  { id: "reference", label: "Reference" },
  { id: "title", label: "Objet / Titre" },
  { id: "type", label: "Type" },
  { id: "direction", label: "Direction emettrice" },
  { id: "receivers", label: "Directions destinataires" },
  { id: "movementType", label: "Mouvement" },
  { id: "status", label: "Statut" },
  { id: "confidentiality", label: "Confidentialite" },
  { id: "createdAt", label: "Date" }
];

const defaultVisibleColumns: ColumnId[] = [
  "reference",
  "title",
  "type",
  "direction",
  "receivers",
  "movementType",
  "status",
  "createdAt"
];

const storageKey = "sigeda.documents.columns";

export function DocumentTable({
  rows,
  sortBy,
  sortDir,
  page,
  pageSize,
  total,
  totalPages
}: {
  rows: DocumentEntity[];
  sortBy?: DocumentSortField;
  sortDir?: SortDirection;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(defaultVisibleColumns);
  const [quickSearch, setQuickSearch] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as string[];
      const safe = allColumns.map((column) => column.id).filter((id) => parsed.includes(id));
      if (safe.length) {
        setVisibleColumns(safe);
      }
    } catch {
      // Ignore corrupted local preferences.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const activeSortBy = sortBy ?? "updatedAt";
  const activeSortDir = sortDir ?? "desc";
  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const filteredRows = useMemo(() => {
    const normalized = quickSearch.trim().toLowerCase();

    if (!normalized) {
      return rows;
    }

    return rows.filter((row) =>
      [
        row.numeroReference,
        row.title,
        row.subject,
        row.direction.code,
        row.direction.designation,
        ...(row.receiverDirectionNames ?? []),
        String(row.type),
        String(row.status),
        String(row.confidentialityLevel),
        row.authorName
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [quickSearch, rows]);

  function updateSort(field: DocumentSortField) {
    const params = new URLSearchParams(searchParams.toString());
    const nextDirection: SortDirection =
      activeSortBy === field ? (activeSortDir === "asc" ? "desc" : "asc") : field === "createdAt" || field === "updatedAt" ? "desc" : "asc";

    params.set("sortBy", field);
    params.set("sortDir", nextDirection);
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function isVisible(column: ColumnId) {
    return visibleSet.has(column);
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-slate-200 bg-[var(--header-tint)] px-5 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Registre</p>
          <h2 className="text-sm font-semibold text-brand-navy">Documents suivis</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden min-w-[260px] xl:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={quickSearch}
              onChange={(event) => setQuickSearch(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500"
              placeholder="Recherche rapide sur la page"
            />
          </div>
          <ColumnVisibilityMenu
            columns={allColumns}
            value={visibleColumns}
            onChange={(next) => setVisibleColumns(next as ColumnId[])}
          />
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {filteredRows.length} element{filteredRows.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1420px] w-full table-fixed divide-y divide-slate-200 text-sm">
          <thead className="bg-[var(--table-head)] text-left text-slate-700">
            <tr>
            {isVisible("reference") ? (
              <th className="w-[14%] px-4 py-3">
                <SortableColumnHeader
                  label="Reference"
                  active={activeSortBy === "reference"}
                  direction={activeSortDir}
                  onClick={() => updateSort("reference")}
                />
              </th>
            ) : null}
            {isVisible("title") ? (
              <th className="w-[26%] px-4 py-3">
                <SortableColumnHeader
                  label="Objet"
                  active={activeSortBy === "title"}
                  direction={activeSortDir}
                  onClick={() => updateSort("title")}
                />
              </th>
            ) : null}
            {isVisible("type") ? (
              <th className="hidden w-[9%] px-4 py-3 lg:table-cell">
                <SortableColumnHeader
                  label="Type"
                  active={activeSortBy === "type"}
                  direction={activeSortDir}
                  onClick={() => updateSort("type")}
                />
              </th>
            ) : null}
            {isVisible("direction") ? (
              <th className="hidden w-[14%] px-4 py-3 xl:table-cell">
                <SortableColumnHeader
                  label="Direction emettrice"
                  active={activeSortBy === "direction"}
                  direction={activeSortDir}
                  onClick={() => updateSort("direction")}
                />
              </th>
            ) : null}
            {isVisible("receivers") ? (
              <th className="hidden w-[16%] px-4 py-3 2xl:table-cell">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Directions destinataires
                </span>
              </th>
            ) : null}
            {isVisible("movementType") ? (
              <th className="w-[9%] px-4 py-3">
                <SortableColumnHeader
                  label="Mouvement"
                  active={activeSortBy === "movementType"}
                  direction={activeSortDir}
                  onClick={() => updateSort("movementType")}
                />
              </th>
            ) : null}
            {isVisible("status") ? (
              <th className="w-[10%] px-4 py-3">
                <SortableColumnHeader
                  label="Statut"
                  active={activeSortBy === "status"}
                  direction={activeSortDir}
                  onClick={() => updateSort("status")}
                />
              </th>
            ) : null}
            {isVisible("confidentiality") ? (
              <th className="hidden w-[10%] px-4 py-3 xl:table-cell">
                <SortableColumnHeader
                  label="Confidentialite"
                  active={activeSortBy === "confidentiality"}
                  direction={activeSortDir}
                  onClick={() => updateSort("confidentiality")}
                />
              </th>
            ) : null}
            {isVisible("createdAt") ? (
              <th className="w-[11%] px-4 py-3">
                <SortableColumnHeader
                  label="Derniere activite"
                  active={activeSortBy === "createdAt" || activeSortBy === "updatedAt"}
                  direction={activeSortDir}
                  onClick={() => updateSort("updatedAt")}
                />
              </th>
            ) : null}
            <th className="w-[12%] px-4 py-3 text-right">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Actions</span>
            </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-5 py-10 text-center text-slate-500">
                  Aucun document.
                </td>
              </tr>
            ) : null}
            {filteredRows.map((row) => (
              <tr key={row.id} className="align-top hover:bg-slate-50/80">
              {isVisible("reference") ? (
                <td className="px-4 py-3.5 font-medium text-brand-navy">
                  <Link href={`/documents/${row.id}`} className="block hover:underline">
                    <LongText value={row.numeroReference} label="Reference du document" className="text-brand-navy" />
                  </Link>
                </td>
              ) : null}
              {isVisible("title") ? (
                <td className="px-4 py-3.5">
                  <div className="min-w-0">
                    <LongText value={row.title ?? row.fileName ?? "-"} label="Titre du document" className="font-medium" />
                    {row.subject ? (
                      <LongText value={row.subject} label="Objet du document" className="text-xs text-slate-500" />
                    ) : null}
                  </div>
                </td>
              ) : null}
              {isVisible("type") ? (
                <td className="hidden px-4 py-3.5 text-slate-600 lg:table-cell">
                  <LongText value={String(row.type)} label="Type de document" className="text-slate-600" />
                </td>
              ) : null}
              {isVisible("direction") ? (
                <td className="hidden px-4 py-3.5 text-slate-600 xl:table-cell">
                  <LongText
                    value={formatStructureLabel(row.direction.code, row.direction.designation, row.directionId)}
                    label="Direction emettrice"
                    className="text-slate-600"
                  />
                </td>
              ) : null}
              {isVisible("receivers") ? (
                <td className="hidden px-4 py-3.5 text-slate-600 2xl:table-cell">
                  <LongText
                    value={row.receiverDirectionNames?.join(", ") || row.receiverDirectionIds.join(", ") || "-"}
                    label="Directions destinataires"
                    className="text-slate-600"
                  />
                </td>
              ) : null}
              {isVisible("movementType") ? (
                <td className="px-4 py-3.5 text-slate-600">{row.movementType ?? "-"}</td>
              ) : null}
              {isVisible("status") ? (
                <td className="px-4 py-3.5">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {row.status ?? "-"}
                  </span>
                </td>
              ) : null}
              {isVisible("confidentiality") ? (
                <td className="hidden px-4 py-3.5 text-slate-600 xl:table-cell">
                  {row.confidentialityLevel ?? "-"}
                </td>
              ) : null}
              {isVisible("createdAt") ? (
                <td className="px-4 py-3.5 text-slate-600">{formatShortDate(row.updatedAt)}</td>
              ) : null}
              <td className="px-4 py-3.5 text-right">
                <Link
                  href={`/documents/${row.id}`}
                  className="inline-flex min-w-[124px] items-center justify-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Consulter
                </Link>
              </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 px-4 py-3">
        <PaginationControls page={page} pageSize={pageSize} total={total} totalPages={totalPages} />
      </div>
    </Card>
  );
}
