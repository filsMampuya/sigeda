"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import type { Departement } from "@sigeda/shared/types";

import { createDirectionAction } from "@/app/organization-actions";
import type { OrganizationActionState } from "@/app/organization-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { LongText } from "@/components/ui/long-text";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SortableColumnHeader, type SortDirection } from "@/components/ui/sortable-column-header";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

const initialOrganizationActionState: OrganizationActionState = {
  message: null,
  status: "idle"
};

const inputClassName =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500";

type DirectionSortField = "code" | "designation" | "type" | "createdAt";

export function DirectionsPanel({
  directions,
  page = 1,
  pageSize = 10
}: {
  directions: Departement[];
  page?: number;
  pageSize?: number;
}) {
  const [type, setType] = useState<"Direction Generale" | "Direction">("Direction Generale");
  const [sortBy, setSortBy] = useState<DirectionSortField>("designation");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [state, formAction] = useFormState(createDirectionAction, initialOrganizationActionState);
  const directionGenerales = directions.filter((direction) => direction.type === "Direction Generale");
  const sortedDirections = useMemo(
    () =>
      [...directions].sort((left, right) => {
        const direction = sortDir === "asc" ? 1 : -1;

        switch (sortBy) {
          case "code":
            return direction * left.code.localeCompare(right.code, "fr");
          case "type":
            return direction * left.type.localeCompare(right.type, "fr");
          case "createdAt":
            return direction * (new Date(left.dateCreation).getTime() - new Date(right.dateCreation).getTime());
          case "designation":
          default:
            return direction * left.designation.localeCompare(right.designation, "fr");
        }
      }),
    [directions, sortBy, sortDir]
  );
  const total = sortedDirections.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedDirections = useMemo(
    () => sortedDirections.slice((safePage - 1) * pageSize, safePage * pageSize),
    [pageSize, safePage, sortedDirections]
  );

  function updateSort(field: DirectionSortField) {
    if (sortBy === field) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(field);
    setSortDir(field === "createdAt" ? "desc" : "asc");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(440px,1fr)]">
      <div className="space-y-3">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-200 bg-[var(--header-tint)] px-5 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Organisation</p>
              <h2 className="text-sm font-semibold text-brand-navy">Directions</h2>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
              {directions.length} element{directions.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full table-fixed divide-y divide-slate-200 text-sm">
              <thead className="bg-[var(--table-head)] text-left text-slate-700">
                <tr>
                <th className="w-[18%] px-5 py-3">
                  <SortableColumnHeader
                    label="Code"
                    active={sortBy === "code"}
                    direction={sortDir}
                    onClick={() => updateSort("code")}
                  />
                </th>
                <th className="w-[38%] px-5 py-3">
                  <SortableColumnHeader
                    label="Direction"
                    active={sortBy === "designation"}
                    direction={sortDir}
                    onClick={() => updateSort("designation")}
                  />
                </th>
                <th className="w-[18%] px-5 py-3">
                  <SortableColumnHeader
                    label="Type"
                    active={sortBy === "type"}
                    direction={sortDir}
                    onClick={() => updateSort("type")}
                  />
                </th>
                <th className="w-[16%] px-5 py-3">
                  <SortableColumnHeader
                    label="Creation"
                    active={sortBy === "createdAt"}
                    direction={sortDir}
                    onClick={() => updateSort("createdAt")}
                  />
                </th>
                <th className="w-[12%] px-5 py-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Actions</span>
                </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedDirections.map((direction) => {
                  const isGeneral = direction.type === "Direction Generale";

                  return (
                    <tr key={direction.id} className="align-top hover:bg-slate-50/80">
                      <td className="px-5 py-3.5 font-medium text-brand-navy">
                        <LongText value={direction.code} label="Code de direction" className="text-brand-navy" />
                      </td>
                      <td className="px-5 py-3.5">
                        <LongText value={direction.designation} label="Intitule de direction" />
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            isGeneral ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isGeneral ? "Direction generale" : "Direction"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{formatShortDate(direction.dateCreation)}</td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/documents?directionId=${encodeURIComponent(direction.id)}`}
                          className="inline-flex min-w-[96px] items-center justify-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-4 py-3">
            <PaginationControls page={safePage} pageSize={pageSize} total={total} totalPages={totalPages} />
          </div>
        </Card>
      </div>
      <Card className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-brand-navy">Nouvelle direction</h2>
          <p className="text-sm text-slate-600">Type, code et intitule de la structure.</p>
        </div>
        <form action={formAction} className="space-y-4">
          <FormField label="Type" required>
            <select
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as "Direction Generale" | "Direction")}
              className={inputClassName}
              required
            >
              <option value="Direction Generale">Direction Generale</option>
              <option value="Direction">Direction operationnelle</option>
            </select>
          </FormField>
          {type === "Direction" ? (
            <FormField label="Direction generale de rattachement" required>
              <select name="parent" className={inputClassName} required defaultValue="">
                <option value="" disabled>
                  Selectionner la direction generale
                </option>
                {directionGenerales.map((direction) => (
                  <option
                    key={direction.code}
                    value={JSON.stringify({
                      id: direction.id,
                      code: direction.code,
                      designation: direction.designation
                    })}
                  >
                    {formatStructureLabel(direction.code, direction.designation)}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}
          <FormField label="Intitule" required>
            <input name="designation" className={inputClassName} placeholder="Ex. Direction Financiere" required />
          </FormField>
          <FormField label="Code" required description="Code court utilise dans le classement et la recherche.">
            <input name="code" className={inputClassName} placeholder="Ex. DFIN" required />
          </FormField>
          {state.message ? (
            <p className={`text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>
              {state.message}
            </p>
          ) : null}
          <SubmitButton label="Ajouter" />
        </form>
      </Card>
    </div>
  );
}
