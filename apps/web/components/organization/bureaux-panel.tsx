"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import type { DepartementListItem, User } from "@sigeda/shared/types";

import { createBureauAction } from "@/app/organization-actions";
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

type BureauSortField = "designation" | "service" | "direction" | "responsable" | "createdAt";

export function BureauxPanel({
  bureaux,
  services,
  directions,
  users,
  page = 1,
  pageSize = 10
}: {
  bureaux: DepartementListItem[];
  services: DepartementListItem[];
  directions: DepartementListItem[];
  users: User[];
  page?: number;
  pageSize?: number;
}) {
  const [sortBy, setSortBy] = useState<BureauSortField>("designation");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [attachmentMode, setAttachmentMode] = useState<"service" | "direction">("service");
  const [selectedDirectionId, setSelectedDirectionId] = useState<string>("");
  const [state, formAction] = useFormState(createBureauAction, initialOrganizationActionState);
  const serviceMap = new Map(services.map((service) => [service.code, service]));
  const directionMap = new Map(directions.map((direction) => [direction.code, direction]));
  const directionById = new Map(directions.map((direction) => [direction.id, direction]));
  const servicesByDirection = services.filter((service) => {
    const parentCode = service.parent?.code;
    const parentDirection = parentCode ? directionMap.get(parentCode) : undefined;
    return !selectedDirectionId || parentDirection?.id === selectedDirectionId;
  });
  const rows = useMemo(
    () =>
      bureaux.map((bureau) => {
        const service = bureau.serviceId
          ? services.find((candidate) => candidate.id === bureau.serviceId)
          : bureau.parent?.code
            ? serviceMap.get(bureau.parent.code)
            : undefined;
        const direction = bureau.directionId
          ? directions.find((candidate) => candidate.id === bureau.directionId)
          : service?.parent?.code
            ? directionMap.get(service.parent.code)
            : undefined;
        const agentCount = users.filter((user) => user.bureauId === bureau.id).length;
        const responsible = users.find((user) => user.bureauId === bureau.id);

        return {
          bureau,
          serviceLabel: formatStructureLabel(
            service?.code,
            service?.designation
          ),
          directionLabel: formatStructureLabel(direction?.code, direction?.designation),
          responsibleLabel: responsible
            ? `${responsible.personne.nom} ${responsible.personne.prenom}`.trim()
            : "-",
          agentCount,
          isDirect: !service
        };
      }),
    [bureaux, directionMap, directions, serviceMap, services, users]
  );
  const sortedRows = useMemo(
    () =>
      [...rows].sort((left, right) => {
        const direction = sortDir === "asc" ? 1 : -1;

        switch (sortBy) {
          case "service":
            return direction * left.serviceLabel.localeCompare(right.serviceLabel, "fr");
          case "direction":
            return direction * left.directionLabel.localeCompare(right.directionLabel, "fr");
          case "responsable":
            return direction * left.responsibleLabel.localeCompare(right.responsibleLabel, "fr");
          case "createdAt":
            return (
              direction *
              (new Date(left.bureau.dateCreation).getTime() - new Date(right.bureau.dateCreation).getTime())
            );
          case "designation":
          default:
            return direction * left.bureau.designation.localeCompare(right.bureau.designation, "fr");
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

  function updateSort(field: BureauSortField) {
    if (sortBy === field) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(field);
    setSortDir(field === "createdAt" ? "desc" : "asc");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(460px,1.05fr)]">
      <div className="space-y-3">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-200 bg-[var(--header-tint)] px-5 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Organisation</p>
              <h2 className="text-sm font-semibold text-brand-navy">Bureaux</h2>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
              {bureaux.length} element{bureaux.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full table-fixed divide-y divide-slate-200 text-sm">
              <thead className="bg-[var(--table-head)] text-left text-slate-700">
                <tr>
                  <th className="w-[20%] px-5 py-3">
                  <SortableColumnHeader
                    label="Nom"
                    active={sortBy === "designation"}
                    direction={sortDir}
                    onClick={() => updateSort("designation")}
                  />
                  </th>
                  <th className="w-[18%] px-5 py-3">
                  <SortableColumnHeader
                    label="Service"
                    active={sortBy === "service"}
                    direction={sortDir}
                    onClick={() => updateSort("service")}
                  />
                  </th>
                  <th className="w-[17%] px-5 py-3">
                  <SortableColumnHeader
                    label="Direction"
                    active={sortBy === "direction"}
                    direction={sortDir}
                    onClick={() => updateSort("direction")}
                  />
                  </th>
                  <th className="w-[8%] px-5 py-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Agents</span>
                  </th>
                  <th className="w-[17%] px-5 py-3">
                  <SortableColumnHeader
                    label="Responsable"
                    active={sortBy === "responsable"}
                    direction={sortDir}
                    onClick={() => updateSort("responsable")}
                  />
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
                {paginatedRows.map(({ bureau, serviceLabel, directionLabel, responsibleLabel, agentCount, isDirect }) => (
                  <tr key={bureau.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-medium text-brand-navy">
                      <LongText value={bureau.designation} label="Intitule de bureau" className="text-brand-navy" />
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <LongText
                        value={isDirect ? "Rattache directement a la direction" : serviceLabel}
                        label="Service de rattachement"
                      />
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <LongText value={directionLabel} label="Direction de rattachement" />
                    </td>
                    <td className="px-5 py-3.5">{agentCount}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <LongText value={responsibleLabel} label="Responsable du bureau" />
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{formatShortDate(bureau.dateCreation)}</td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/documents?bureauId=${encodeURIComponent(bureau.id)}`}
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
          <h2 className="text-base font-semibold text-brand-navy">Nouveau bureau</h2>
          <p className="text-sm text-slate-600">Rattachement a un service ou directement a une direction.</p>
        </div>
        <form action={formAction} className="space-y-4">
          <FormField label="Mode de rattachement" required>
            <select
              name="attachmentMode"
              className={inputClassName}
              value={attachmentMode}
              onChange={(event) => {
                const nextMode = event.target.value as "service" | "direction";
                setAttachmentMode(nextMode);
                if (nextMode === "direction") {
                  setSelectedDirectionId("");
                }
              }}
            >
              <option value="service">Rattache a un service</option>
              <option value="direction">Rattache directement a une direction</option>
            </select>
          </FormField>
          <FormField label="Intitule" required>
            <input name="designation" className={inputClassName} placeholder="Ex. Bureau Courrier" required />
          </FormField>
          <FormField label="Code" required>
            <input name="code" className={inputClassName} placeholder="Ex. BCR" required />
          </FormField>
          <FormField label="Direction de rattachement" required>
            <select
              name="direction"
              className={inputClassName}
              required
              defaultValue=""
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  setSelectedDirectionId("");
                  return;
                }
                try {
                  const parsed = JSON.parse(value) as { id?: string };
                  setSelectedDirectionId(parsed.id ?? "");
                } catch {
                  setSelectedDirectionId("");
                }
              }}
            >
              <option value="" disabled>
                Selectionner une direction
              </option>
              {directions.map((direction) => (
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
          {attachmentMode === "service" ? (
            <FormField label="Service de rattachement" required>
              <select name="parent" className={inputClassName} required defaultValue="">
                <option value="" disabled>
                  Selectionner un service
                </option>
                {servicesByDirection.map((service) => (
                  <option
                    key={service.id}
                    value={JSON.stringify({
                      id: service.id,
                      code: service.code,
                      designation: service.designation
                    })}
                  >
                    {formatStructureLabel(service.code, service.designation)}
                  </option>
                ))}
              </select>
            </FormField>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Aucun service selectionne : le bureau sera rattache directement a la direction.
            </div>
          )}
          <select name="service" className="hidden" defaultValue="">
            <option value="">
              Non applicable
            </option>
            {servicesByDirection.map((service) => (
              <option
                key={service.id}
                value={JSON.stringify({
                  id: service.id,
                  code: service.code,
                  designation: service.designation
                })}
              >
                {formatStructureLabel(service.code, service.designation)}
              </option>
            ))}
          </select>
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
