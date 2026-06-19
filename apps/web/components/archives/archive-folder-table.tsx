"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import type { ArchiveFolderListItem } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { ColumnVisibilityMenu } from "@/components/ui/column-visibility-menu";
import { LongText } from "@/components/ui/long-text";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { authorizedRequest } from "@/lib/client-http";
import { getPublicOnPremiseApiBaseUrl } from "@/lib/env";
import { formatShortDate } from "@/lib/format";

type FolderColumnId =
  | "year"
  | "sectionsUsed"
  | "direction"
  | "partner"
  | "bureau"
  | "access"
  | "archiveCount"
  | "entryArchiveCount"
  | "outputArchiveCount"
  | "createdAt"
  | "updatedAt"
  | "status";

const allColumns: Array<{ id: FolderColumnId; label: string }> = [
  { id: "year", label: "Annee" },
  { id: "sectionsUsed", label: "Sections utilisees" },
  { id: "direction", label: "Direction" },
  { id: "partner", label: "Direction partenaire" },
  { id: "bureau", label: "Bureau" },
  { id: "access", label: "Acces" },
  { id: "archiveCount", label: "Total documents" },
  { id: "entryArchiveCount", label: "Documents entree" },
  { id: "outputArchiveCount", label: "Documents sortie" },
  { id: "createdAt", label: "Date creation" },
  { id: "updatedAt", label: "Date modification" },
  { id: "status", label: "Statut" }
];

const defaultVisibleColumns: FolderColumnId[] = [
  "year",
  "sectionsUsed",
  "direction",
  "partner",
  "bureau",
  "archiveCount",
  "entryArchiveCount",
  "outputArchiveCount",
  "createdAt",
  "updatedAt",
  "status"
];

const storageKey = "sigeda.archive-folders.columns";

export function ArchiveFolderTable({
  rows,
  canManage,
  page,
  pageSize,
  total,
  totalPages
}: {
  rows: ArchiveFolderListItem[];
  canManage: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  const apiBaseUrl = getPublicOnPremiseApiBaseUrl();
  const [isPending, startTransition] = useTransition();
  const [quickSearch, setQuickSearch] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<FolderColumnId[]>(defaultVisibleColumns);

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
      // Ignore corrupted preferences.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const filteredRows = useMemo(() => {
    const normalized = quickSearch.trim().toLowerCase();
    if (!normalized) {
      return rows;
    }
    return rows.filter((row) =>
      [
        row.ownerDirectionName,
        row.partnerDirectionName,
        row.bureauName,
        row.accessibleBureauNames?.join(", "),
        String(row.year),
        row.status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [quickSearch, rows]);

  async function updateStatus(id: string, status: "ACTIVE" | "ARCHIVED") {
    await authorizedRequest(`${apiBaseUrl}/folders/${id}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });

    window.location.reload();
  }

  function isVisible(column: FolderColumnId) {
    return visibleSet.has(column);
  }

  return (
    <Card className="min-w-0 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-slate-200 bg-[var(--header-tint)] px-5 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Structure annuelle</p>
          <h2 className="text-sm font-semibold text-brand-navy">Classeurs disponibles</h2>
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
            onChange={(next) => setVisibleColumns(next as FolderColumnId[])}
          />
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {filteredRows.length} element{filteredRows.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-[1440px] w-full table-fixed divide-y divide-slate-200 text-sm">
          <thead className="bg-[var(--table-head)] text-left text-slate-700">
            <tr>
              {isVisible("year") ? (
                <th className="w-[7%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Annee</th>
              ) : null}
              {isVisible("sectionsUsed") ? (
                <th className="w-[11%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Sections</th>
              ) : null}
              {isVisible("direction") ? (
                <th className="w-[12%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Direction</th>
              ) : null}
              {isVisible("partner") ? (
                <th className="w-[12%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Partenaire</th>
              ) : null}
              {isVisible("bureau") ? (
                <th className="w-[11%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Bureau</th>
              ) : null}
              {isVisible("access") ? (
                <th className="w-[15%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Acces</th>
              ) : null}
              {isVisible("archiveCount") ? (
                <th className="w-[7%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Total</th>
              ) : null}
              {isVisible("entryArchiveCount") ? (
                <th className="w-[8%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Entree</th>
              ) : null}
              {isVisible("outputArchiveCount") ? (
                <th className="w-[8%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Sortie</th>
              ) : null}
              {isVisible("createdAt") ? (
                <th className="w-[10%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Date creation</th>
              ) : null}
              {isVisible("updatedAt") ? (
                <th className="w-[10%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Date modification</th>
              ) : null}
              {isVisible("status") ? (
                <th className="w-[8%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Statut</th>
              ) : null}
              <th className="w-[15%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-5 py-10 text-center text-slate-500">
                  Aucun classeur annuel disponible.
                </td>
              </tr>
            ) : null}
            {filteredRows.map((row) => (
              <tr key={row.id} className="align-top hover:bg-slate-50/80">
                {isVisible("year") ? <td className="px-5 py-3.5">{row.year}</td> : null}
                {isVisible("sectionsUsed") ? (
                  <td className="px-5 py-3.5">
                    <LongText value={formatSectionsUsed(row.sectionsUsed)} label="Sections utilisees" className="font-medium text-brand-navy" />
                  </td>
                ) : null}
                {isVisible("direction") ? (
                  <td className="px-5 py-3.5">
                    <LongText
                      value={formatDirection(row.ownerDirectionCode, row.ownerDirectionName, row.ownerDirectionId)}
                      label="Direction proprietaire"
                    />
                  </td>
                ) : null}
                {isVisible("partner") ? (
                  <td className="px-5 py-3.5">
                    <LongText
                      value={formatDirection(row.partnerDirectionCode, row.partnerDirectionName, row.partnerDirectionId)}
                      label="Direction partenaire"
                    />
                  </td>
                ) : null}
                {isVisible("bureau") ? (
                  <td className="px-5 py-3.5">
                    <LongText
                      value={formatDirection(row.bureauCode, row.bureauName, row.bureauId)}
                      label="Bureau"
                    />
                  </td>
                ) : null}
                {isVisible("access") ? (
                  <td className="px-5 py-3.5 text-slate-600">
                    <LongText
                      value={
                        row.accessibleBureauCodes?.length
                          ? row.accessibleBureauCodes
                              .map((code, index) => formatDirection(code, row.accessibleBureauNames?.[index]))
                              .join(", ")
                          : "-"
                      }
                      label="Bureaux en acces"
                      className="text-slate-600"
                    />
                  </td>
                ) : null}
                {isVisible("archiveCount") ? <td className="px-5 py-3.5">{row.archiveCount}</td> : null}
                {isVisible("entryArchiveCount") ? <td className="px-5 py-3.5">{row.entryArchiveCount}</td> : null}
                {isVisible("outputArchiveCount") ? <td className="px-5 py-3.5">{row.outputArchiveCount}</td> : null}
                {isVisible("createdAt") ? (
                  <td className="px-5 py-3.5 text-slate-600">{formatShortDate(row.createdAt)}</td>
                ) : null}
                {isVisible("updatedAt") ? (
                  <td className="px-5 py-3.5 text-slate-600">{formatShortDate(row.updatedAt)}</td>
                ) : null}
                {isVisible("status") ? (
                  <td className="px-5 py-3.5">
                    <div className="flex items-center">
                      <span
                        className={
                          row.status === "ARCHIVED"
                            ? "rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700"
                            : "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                        }
                      >
                        {row.status}
                      </span>
                    </div>
                  </td>
                ) : null}
                <td className="px-5 py-3.5">
                  <div className="flex min-w-[148px] flex-col items-stretch gap-2">
                    {canManage ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await updateStatus(row.id, row.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE");
                          })
                        }
                        className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-center text-xs font-medium text-slate-700 disabled:opacity-60"
                      >
                        {row.status === "ACTIVE" ? "Archiver" : "Reouvrir"}
                      </button>
                    ) : null}
                    <Link
                      href={`/classeurs-annuels/${row.id}`}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Voir les documents
                    </Link>
                  </div>
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

function formatDirection(code?: string, designation?: string, fallback?: string) {
  if (code && designation) {
    return `${code} - ${designation}`;
  }

  return designation ?? code ?? fallback ?? "-";
}

function formatSectionsUsed(value: ArchiveFolderListItem["sectionsUsed"]) {
  switch (value) {
    case "ENTREE":
      return "Entree uniquement";
    case "SORTIE":
      return "Sortie uniquement";
    case "ENTREE_SORTIE":
      return "Entree + Sortie";
    default:
      return "Aucune section utilisee";
  }
}
