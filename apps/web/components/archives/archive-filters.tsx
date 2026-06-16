"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { Departement } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";

type ArchiveFiltersProps = {
  q?: string;
  year?: string;
  directionId?: string;
  serviceId?: string;
  bureauId?: string;
  section?: string;
  partnerDirectionId?: string;
  annotationDirectionId?: string;
  annotationState?: string;
  status?: string;
  dateField?: string;
  periodPreset?: string;
  dateFrom?: string;
  dateTo?: string;
  annotationDateFrom?: string;
  annotationDateTo?: string;
  partnerDirections?: Departement[];
  directions?: Departement[];
  services?: Departement[];
  bureaux?: Departement[];
  currentRole?: string;
  showStatusFilter?: boolean;
};

export function ArchiveFilters({
  q,
  year,
  directionId,
  serviceId,
  bureauId,
  section,
  partnerDirectionId,
  annotationDirectionId,
  annotationState,
  status,
  dateField,
  periodPreset,
  dateFrom,
  dateTo,
  annotationDateFrom,
  annotationDateTo,
  partnerDirections = [],
  directions = [],
  services = [],
  bureaux = [],
  currentRole = "",
  showStatusFilter = false
}: ArchiveFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(q ?? "");
  const [selectedYear, setSelectedYear] = useState(year ?? "");
  const [selectedDirectionId, setSelectedDirectionId] = useState(directionId ?? "");
  const [selectedServiceId, setSelectedServiceId] = useState(serviceId ?? "");
  const [selectedBureauId, setSelectedBureauId] = useState(bureauId ?? "");
  const [selectedSection, setSelectedSection] = useState(section ?? "");
  const [selectedPartnerDirectionId, setSelectedPartnerDirectionId] = useState(partnerDirectionId ?? "");
  const [selectedAnnotationDirectionId, setSelectedAnnotationDirectionId] = useState(annotationDirectionId ?? "");
  const [selectedAnnotationState, setSelectedAnnotationState] = useState(annotationState ?? "");
  const [selectedStatus, setSelectedStatus] = useState(status ?? "");
  const [selectedDateField, setSelectedDateField] = useState(dateField ?? "updatedAt");
  const [selectedPeriodPreset, setSelectedPeriodPreset] = useState(periodPreset ?? "");
  const [selectedDateFrom, setSelectedDateFrom] = useState(dateFrom ?? "");
  const [selectedDateTo, setSelectedDateTo] = useState(dateTo ?? "");
  const [selectedAnnotationDateFrom, setSelectedAnnotationDateFrom] = useState(annotationDateFrom ?? "");
  const [selectedAnnotationDateTo, setSelectedAnnotationDateTo] = useState(annotationDateTo ?? "");

  const canFilterDirection = ["DIRECTEUR_GENERAL", "DIRECTION_GENERALE", "ADMIN", "AUDITEUR"].includes(currentRole);
  const canFilterService = canFilterDirection || currentRole === "DIRECTEUR";
  const canFilterBureau = !["AGENT", "ARCHIVISTE"].includes(currentRole);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams(window.location.search);

    setOrDelete(params, "q", searchTerm);
    setOrDelete(params, "year", selectedYear);
    setOrDelete(params, "directionId", selectedDirectionId);
    setOrDelete(params, "serviceId", selectedServiceId);
    setOrDelete(params, "bureauId", selectedBureauId);
    setOrDelete(params, "section", selectedSection);
    setOrDelete(params, "partnerDirectionId", selectedPartnerDirectionId);
    setOrDelete(params, "annotationDirectionId", selectedAnnotationDirectionId);
    setOrDelete(params, "annotationState", selectedAnnotationState);
    setOrDelete(params, "status", selectedStatus);
    setOrDelete(params, "dateField", selectedDateField);
    setOrDelete(params, "periodPreset", selectedPeriodPreset);
    setOrDelete(params, "dateFrom", selectedDateFrom);
    setOrDelete(params, "dateTo", selectedDateTo);
    setOrDelete(params, "annotationDateFrom", selectedAnnotationDateFrom);
    setOrDelete(params, "annotationDateTo", selectedAnnotationDateTo);

    params.set("page", "1");

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.replace(nextUrl);
    });
  }

  function resetFilters() {
    setSearchTerm("");
    setSelectedYear("");
    setSelectedDirectionId("");
    setSelectedServiceId("");
    setSelectedBureauId("");
    setSelectedSection("");
    setSelectedPartnerDirectionId("");
    setSelectedAnnotationDirectionId("");
    setSelectedAnnotationState("");
    setSelectedStatus("");
    setSelectedDateField("updatedAt");
    setSelectedPeriodPreset("");
    setSelectedDateFrom("");
    setSelectedDateTo("");
    setSelectedAnnotationDateFrom("");
    setSelectedAnnotationDateTo("");
    startTransition(() => {
      router.replace(pathname);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0">
      <Card className="min-w-0 space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Filtres</p>
            <h2 className="text-sm font-semibold text-brand-navy">Recherche dans les archives</h2>
            <p className="text-sm text-slate-600">
              Filtrez par bureau, structure, direction partenaire, annotations et periode.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Annee: {selectedYear || "toutes"}
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Bureau: {selectedBureauId ? "filtre actif" : "tous"}
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Annotations: {selectedAnnotationState || "toutes"}
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Periode: {selectedPeriodPreset || "aucune"}
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500"
              placeholder="Reference, objet, bureau"
            />
          </div>
          <input
            name="year"
            type="number"
            min={2000}
            max={3000}
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500"
            placeholder="Annee"
          />
          {canFilterDirection ? (
            <SearchableSelect
              value={selectedDirectionId}
              onValueChange={(value) => {
                setSelectedDirectionId(value);
                setSelectedServiceId("");
                setSelectedBureauId("");
              }}
              placeholder="Direction"
              options={directions.map((direction) => ({
                value: direction.id,
                label: formatDirection(direction.code, direction.designation)
              }))}
            />
          ) : null}
          {canFilterService ? (
            <SearchableSelect
              value={selectedServiceId}
              onValueChange={(value) => {
                setSelectedServiceId(value);
                setSelectedBureauId("");
              }}
              placeholder="Service"
              options={services
                .filter((service) => !selectedDirectionId || service.directionId === selectedDirectionId)
                .map((service) => ({
                  value: service.id,
                  label: formatDirection(service.code, service.designation)
                }))}
            />
          ) : null}
          {canFilterBureau ? (
            <SearchableSelect
              value={selectedBureauId}
              onValueChange={setSelectedBureauId}
              placeholder="Bureau"
              options={bureaux
                .filter((bureau) => !selectedDirectionId || bureau.directionId === selectedDirectionId)
                .filter((bureau) => !selectedServiceId || bureau.serviceId === selectedServiceId)
                .map((bureau) => ({
                  value: bureau.id,
                  label: formatDirection(bureau.code, bureau.designation)
                }))}
            />
          ) : null}
          <select
            name="section"
            value={selectedSection}
            onChange={(event) => setSelectedSection(event.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="">Toutes les sections</option>
            <option value="ENTREE">ENTREE</option>
            <option value="SORTIE">SORTIE</option>
          </select>
          <SearchableSelect
            value={selectedPartnerDirectionId}
            onValueChange={setSelectedPartnerDirectionId}
            placeholder="Direction partenaire"
            options={partnerDirections.map((direction) => ({
              value: direction.id,
              label: formatDirection(direction.code, direction.designation)
            }))}
          />
          <SearchableSelect
            value={selectedAnnotationDirectionId}
            onValueChange={setSelectedAnnotationDirectionId}
            placeholder="Direction ayant annote"
            options={partnerDirections.map((direction) => ({
              value: direction.id,
              label: formatDirection(direction.code, direction.designation)
            }))}
          />
          <select
            value={selectedAnnotationState}
            onChange={(event) => setSelectedAnnotationState(event.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="">Toutes les annotations</option>
            <option value="with">Avec annotation</option>
            <option value="without">Sans annotation</option>
          </select>
          {showStatusFilter ? (
            <select
              name="status"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          ) : null}
          <select
            value={selectedDateField}
            onChange={(event) => setSelectedDateField(event.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="updatedAt">Date de mise a jour</option>
            <option value="archivedAt">Date de classement</option>
          </select>
          <select
            value={selectedPeriodPreset}
            onChange={(event) => setSelectedPeriodPreset(event.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
          >
            <option value="">Aucune periode</option>
            <option value="today">Aujourd&apos;hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette annee</option>
            <option value="previousYear">Annee precedente</option>
            <option value="custom">Periode personnalisee</option>
          </select>
          {selectedPeriodPreset === "custom" ? (
            <>
              <input
                type="date"
                value={selectedDateFrom}
                onChange={(event) => setSelectedDateFrom(event.target.value)}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
              />
              <input
                type="date"
                value={selectedDateTo}
                onChange={(event) => setSelectedDateTo(event.target.value)}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
              />
            </>
          ) : null}
          <input
            type="date"
            value={selectedAnnotationDateFrom}
            onChange={(event) => setSelectedAnnotationDateFrom(event.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
          />
          <input
            type="date"
            value={selectedAnnotationDateTo}
            onChange={(event) => setSelectedAnnotationDateTo(event.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
          />
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700"
          >
            <X className="h-4 w-4" />
            Reinitialiser
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 rounded-xl bg-brand-navy px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Filtrage..." : "Appliquer"}
          </button>
        </div>
      </Card>
    </form>
  );
}

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (value.trim()) {
    params.set(key, value.trim());
    return;
  }

  params.delete(key);
}

function formatDirection(code?: string, designation?: string) {
  if (code && designation) {
    return `${code} - ${designation}`;
  }

  return designation ?? code ?? "-";
}
