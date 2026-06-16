"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DocumentArchiveListItem } from "@sigeda/shared/types";

import { ColumnVisibilityMenu } from "@/components/ui/column-visibility-menu";
import { Card } from "@/components/ui/card";
import { LongText } from "@/components/ui/long-text";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SortableColumnHeader, type SortDirection } from "@/components/ui/sortable-column-header";
import { formatShortDate } from "@/lib/format";

type ArchiveSortField =
  | "reference"
  | "title"
  | "movementType"
  | "direction"
  | "year"
  | "archivedAt"
  | "updatedAt";

type ArchiveColumnId =
  | "movementType"
  | "year"
  | "reference"
  | "title"
  | "direction"
  | "bureau"
  | "annotated"
  | "createdAt"
  | "updatedAt"
  | "archivedAt";

const allColumns: Array<{ id: ArchiveColumnId; label: string }> = [
  { id: "movementType", label: "Mouvement" },
  { id: "year", label: "Annee" },
  { id: "reference", label: "Reference" },
  { id: "title", label: "Objet" },
  { id: "direction", label: "Direction" },
  { id: "bureau", label: "Bureau" },
  { id: "annotated", label: "Annote" },
  { id: "createdAt", label: "Date creation" },
  { id: "updatedAt", label: "Date modification" },
  { id: "archivedAt", label: "Date classement" }
];

const defaultVisibleColumns: ArchiveColumnId[] = [
  "movementType",
  "year",
  "reference",
  "title",
  "direction",
  "bureau",
  "annotated",
  "createdAt",
  "updatedAt",
  "archivedAt"
];

const storageKey = "sigeda.document-archives.columns";

export function DocumentArchiveTable({
  rows,
  sortBy,
  sortDir,
  page,
  pageSize,
  total,
  totalPages
}: {
  rows: DocumentArchiveListItem[];
  sortBy?: ArchiveSortField;
  sortDir?: SortDirection;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visibleColumns, setVisibleColumns] = useState<ArchiveColumnId[]>(defaultVisibleColumns);
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

  const activeSortBy = sortBy;
  const activeSortDir = sortDir ?? "desc";
  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const filteredRows = useMemo(() => {
    const normalized = quickSearch.trim().toLowerCase();
    if (!normalized) {
      return rows;
    }
    return rows.filter((row) =>
      [
        row.documentReference,
        row.documentTitle,
        row.currentDirectionName,
        row.bureauName,
        row.partnerDirectionNames.join(", "),
        row.hasAnnotations ? "annote" : "non annote"
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [quickSearch, rows]);

  function updateSort(field: ArchiveSortField) {
    const params = new URLSearchParams(searchParams.toString());
    const nextDirection: SortDirection =
      activeSortBy === field ? (activeSortDir === "asc" ? "desc" : "asc") : field === "archivedAt" ? "desc" : "asc";

    params.set("sortBy", field);
    params.set("sortDir", nextDirection);
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function isVisible(column: ArchiveColumnId) {
    return visibleSet.has(column);
  }

  return (
    <Card className="min-w-0 overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[var(--header-tint)] px-5 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Classement</p>
          <h2 className="text-sm font-semibold text-brand-navy">Documents classes</h2>
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
            onChange={(next) => setVisibleColumns(next as ArchiveColumnId[])}
          />
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {filteredRows.length} element{filteredRows.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[1540px] table-fixed divide-y divide-slate-200 text-sm">
          <thead className="bg-[var(--table-head)] text-left text-slate-700">
            <tr>
              {isVisible("movementType") ? (
                <th className="w-[8%] px-5 py-3">
                  <SortableColumnHeader
                    label="Mouvement"
                    active={activeSortBy === "movementType"}
                    direction={activeSortDir}
                    onClick={() => updateSort("movementType")}
                  />
                </th>
              ) : null}
              {isVisible("year") ? (
                <th className="w-[7%] px-5 py-3">
                  <SortableColumnHeader
                    label="Annee"
                    active={activeSortBy === "year"}
                    direction={activeSortDir}
                    onClick={() => updateSort("year")}
                  />
                </th>
              ) : null}
              {isVisible("reference") ? (
                <th className="w-[14%] px-5 py-3">
                  <SortableColumnHeader
                    label="Reference"
                    active={activeSortBy === "reference"}
                    direction={activeSortDir}
                    onClick={() => updateSort("reference")}
                  />
                </th>
              ) : null}
              {isVisible("title") ? (
                <th className="w-[18%] px-5 py-3">
                  <SortableColumnHeader
                    label="Objet"
                    active={activeSortBy === "title"}
                    direction={activeSortDir}
                    onClick={() => updateSort("title")}
                  />
                </th>
              ) : null}
              {isVisible("direction") ? (
                <th className="w-[14%] px-5 py-3">
                  <SortableColumnHeader
                    label="Direction"
                    active={activeSortBy === "direction"}
                    direction={activeSortDir}
                    onClick={() => updateSort("direction")}
                  />
                </th>
              ) : null}
              {isVisible("bureau") ? (
                <th className="w-[12%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Bureau</th>
              ) : null}
              {isVisible("annotated") ? (
                <th className="w-[8%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Annote</th>
              ) : null}
              {isVisible("createdAt") ? (
                <th className="w-[10%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Date creation</th>
              ) : null}
              {isVisible("updatedAt") ? (
                <th className="w-[10%] px-5 py-3">
                  <SortableColumnHeader
                    label="Date modification"
                    active={activeSortBy === "updatedAt"}
                    direction={activeSortDir}
                    onClick={() => updateSort("updatedAt")}
                  />
                </th>
              ) : null}
              {isVisible("archivedAt") ? (
                <th className="w-[10%] px-5 py-3">
                  <SortableColumnHeader
                    label="Date classement"
                    active={activeSortBy === "archivedAt"}
                    direction={activeSortDir}
                    onClick={() => updateSort("archivedAt")}
                  />
                </th>
              ) : null}
              <th className="w-[17%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-5 py-10 text-center text-slate-500">
                  Aucune archive.
                </td>
              </tr>
            ) : null}
            {filteredRows.map((row) => {
              return (
                <tr key={row.id} className="align-top hover:bg-slate-50/80">
                  {isVisible("movementType") ? (
                    <td className="px-5 py-3.5 font-medium text-brand-navy">{row.movementType}</td>
                  ) : null}
                  {isVisible("year") ? <td className="px-5 py-3.5">{row.year}</td> : null}
                  {isVisible("reference") ? (
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <LongText value={row.documentReference} label="Reference du document classe" />
                    </td>
                  ) : null}
                  {isVisible("title") ? (
                    <td className="px-5 py-3.5">
                      <LongText value={row.documentTitle ?? "-"} label="Objet du document classe" />
                    </td>
                  ) : null}
                  {isVisible("direction") ? (
                    <td className="px-5 py-3.5 text-slate-600">
                      <LongText
                        value={formatStructure(row.currentDirectionCode, row.currentDirectionName, row.directionId)}
                        label="Direction courante"
                        className="text-slate-600"
                      />
                    </td>
                  ) : null}
                  {isVisible("bureau") ? (
                    <td className="px-5 py-3.5 text-slate-600">
                      <LongText
                        value={formatStructure(row.bureauCode, row.bureauName, row.bureauId)}
                        label="Bureau de classement"
                        className="text-slate-600"
                      />
                    </td>
                  ) : null}
                  {isVisible("annotated") ? (
                    <td className="px-5 py-3.5">
                      <span
                        className={
                          row.hasAnnotations
                            ? "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
                            : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                        }
                      >
                        {row.hasAnnotations ? "Oui" : "Non"}
                      </span>
                    </td>
                  ) : null}
                  {isVisible("createdAt") ? (
                    <td className="px-5 py-3.5 text-slate-600">{formatShortDate(row.documentCreatedAt)}</td>
                  ) : null}
                  {isVisible("updatedAt") ? (
                    <td className="px-5 py-3.5 text-slate-600">{formatShortDate(row.updatedAt ?? row.archivedAt)}</td>
                  ) : null}
                  {isVisible("archivedAt") ? (
                    <td className="px-5 py-3.5 text-slate-600">{formatShortDate(row.archivedAt)}</td>
                  ) : null}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/documents/${row.documentId}#annotations`}
                        className="inline-flex min-w-[92px] items-center justify-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Voir annotations
                      </Link>
                      <Link
                        href={`/archives-documentaires/${row.id}`}
                        className="inline-flex min-w-[110px] items-center justify-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Consulter
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 px-4 py-3">
        <PaginationControls page={page} pageSize={pageSize} total={total} totalPages={totalPages} />
      </div>
    </Card>
  );
}

function formatStructure(code?: string, designation?: string, fallback?: string) {
  if (code && designation) {
    return `${code} - ${designation}`;
  }

  return designation ?? code ?? fallback ?? "-";
}
