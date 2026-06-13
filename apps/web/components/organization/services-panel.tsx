"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import type { DepartementListItem, User } from "@sigeda/shared/types";

import { createServiceAction } from "@/app/organization-actions";
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

type ServiceSortField = "code" | "designation" | "direction" | "responsable" | "createdAt";

export function ServicesPanel({
  services,
  directions,
  bureaux,
  users,
  page = 1,
  pageSize = 10
}: {
  services: DepartementListItem[];
  directions: DepartementListItem[];
  bureaux: DepartementListItem[];
  users: User[];
  page?: number;
  pageSize?: number;
}) {
  const [sortBy, setSortBy] = useState<ServiceSortField>("designation");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [state, formAction] = useFormState(createServiceAction, initialOrganizationActionState);
  const directionMap = new Map(directions.map((direction) => [direction.code, direction]));
  const parentDirections = directions.filter(
    (direction) => direction.type === "Direction" || direction.type === "Direction Generale"
  );
  const rows = useMemo(
    () =>
      services.map((service) => {
        const direction = service.parent?.code ? directionMap.get(service.parent.code) : undefined;
        const responsible = users.find((user) => user.serviceId === service.id);
        const bureauCount = bureaux.filter((bureau) => bureau.parent?.code === service.code).length;

        return {
          service,
          directionLabel: formatStructureLabel(
            direction?.code ?? service.parent?.code,
            direction?.designation ?? service.parent?.designation
          ),
          responsibleLabel: responsible
            ? `${responsible.personne.nom} ${responsible.personne.prenom}`.trim()
            : "-",
          bureauCount
        };
      }),
    [bureaux, directionMap, services, users]
  );
  const sortedRows = useMemo(
    () =>
      [...rows].sort((left, right) => {
        const direction = sortDir === "asc" ? 1 : -1;

        switch (sortBy) {
          case "code":
            return direction * left.service.code.localeCompare(right.service.code, "fr");
          case "direction":
            return direction * left.directionLabel.localeCompare(right.directionLabel, "fr");
          case "responsable":
            return direction * left.responsibleLabel.localeCompare(right.responsibleLabel, "fr");
          case "createdAt":
            return (
              direction *
              (new Date(left.service.dateCreation).getTime() - new Date(right.service.dateCreation).getTime())
            );
          case "designation":
          default:
            return direction * left.service.designation.localeCompare(right.service.designation, "fr");
        }
      }),
    [rows, sortBy, sortDir]
  );
  const total = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(
    () => sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [pageSize, safePage, sortedRows]
  );

  function updateSort(field: ServiceSortField) {
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
              <h2 className="text-sm font-semibold text-brand-navy">Services</h2>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
              {services.length} element{services.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full table-fixed divide-y divide-slate-200 text-sm">
              <thead className="bg-[var(--table-head)] text-left text-slate-700">
                <tr>
                  <th className="w-[12%] px-5 py-3">
                  <SortableColumnHeader
                    label="Code"
                    active={sortBy === "code"}
                    direction={sortDir}
                    onClick={() => updateSort("code")}
                  />
                  </th>
                  <th className="w-[22%] px-5 py-3">
                  <SortableColumnHeader
                    label="Nom"
                    active={sortBy === "designation"}
                    direction={sortDir}
                    onClick={() => updateSort("designation")}
                  />
                  </th>
                  <th className="w-[20%] px-5 py-3">
                  <SortableColumnHeader
                    label="Direction"
                    active={sortBy === "direction"}
                    direction={sortDir}
                    onClick={() => updateSort("direction")}
                  />
                  </th>
                  <th className="w-[17%] px-5 py-3">
                  <SortableColumnHeader
                    label="Responsable"
                    active={sortBy === "responsable"}
                    direction={sortDir}
                    onClick={() => updateSort("responsable")}
                  />
                  </th>
                  <th className="w-[8%] px-5 py-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Bureaux</span>
                  </th>
                  <th className="w-[11%] px-5 py-3">
                  <SortableColumnHeader
                    label="Creation"
                    active={sortBy === "createdAt"}
                    direction={sortDir}
                    onClick={() => updateSort("createdAt")}
                  />
                  </th>
                  <th className="w-[10%] px-5 py-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedRows.map(({ service, directionLabel, responsibleLabel, bureauCount }) => (
                  <tr key={service.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-medium text-brand-navy">
                      <LongText value={service.code} label="Code de service" className="text-brand-navy" />
                    </td>
                    <td className="px-5 py-3.5">
                      <LongText value={service.designation} label="Intitule de service" />
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <LongText value={directionLabel} label="Direction de rattachement" />
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <LongText value={responsibleLabel} label="Responsable du service" />
                    </td>
                    <td className="px-5 py-3.5">{bureauCount}</td>
                    <td className="px-5 py-3.5 text-slate-600">{formatShortDate(service.dateCreation)}</td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/documents?serviceId=${encodeURIComponent(service.id)}`}
                        className="inline-flex rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
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
          <h2 className="text-base font-semibold text-brand-navy">Nouveau service</h2>
          <p className="text-sm text-slate-600">Rattachement a la direction et preparation du perimetre de bureaux.</p>
        </div>
        <form action={formAction} className="space-y-4">
          <FormField label="Intitule" required>
            <input name="designation" className={inputClassName} placeholder="Ex. Service du Courrier" required />
          </FormField>
          <FormField label="Code" required>
            <input name="code" className={inputClassName} placeholder="Ex. SCR" required />
          </FormField>
          <FormField label="Direction de rattachement" required>
            <select name="parent" className={inputClassName} required defaultValue="">
              <option value="" disabled>
                Selectionner une direction
              </option>
              {parentDirections.map((direction) => (
                <option
                  key={direction.id}
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
