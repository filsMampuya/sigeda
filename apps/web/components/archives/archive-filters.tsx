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
  section?: string;
  partnerDirectionId?: string;
  status?: string;
  dateField?: string;
  periodPreset?: string;
  dateFrom?: string;
  dateTo?: string;
  partnerDirections?: Departement[];
  showStatusFilter?: boolean;
};

export function ArchiveFilters({
  q,
  year,
  section,
  partnerDirectionId,
  status,
  dateField,
  periodPreset,
  dateFrom,
  dateTo,
  partnerDirections = [],
  showStatusFilter = false
}: ArchiveFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(q ?? "");
  const [selectedYear, setSelectedYear] = useState(year ?? "");
  const [selectedSection, setSelectedSection] = useState(section ?? "");
  const [selectedPartnerDirectionId, setSelectedPartnerDirectionId] = useState(partnerDirectionId ?? "");
  const [selectedStatus, setSelectedStatus] = useState(status ?? "");
  const [selectedDateField, setSelectedDateField] = useState(dateField ?? "updatedAt");
  const [selectedPeriodPreset, setSelectedPeriodPreset] = useState(periodPreset ?? "");
  const [selectedDateFrom, setSelectedDateFrom] = useState(dateFrom ?? "");
  const [selectedDateTo, setSelectedDateTo] = useState(dateTo ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams(window.location.search);

    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    } else {
      params.delete("q");
    }

    if (selectedYear.trim()) {
      params.set("year", selectedYear.trim());
    } else {
      params.delete("year");
    }

    if (selectedSection.trim()) {
      params.set("section", selectedSection.trim());
    } else {
      params.delete("section");
    }

    if (selectedPartnerDirectionId.trim()) {
      params.set("partnerDirectionId", selectedPartnerDirectionId.trim());
    } else {
      params.delete("partnerDirectionId");
    }

    if (selectedStatus.trim()) {
      params.set("status", selectedStatus.trim());
    } else {
      params.delete("status");
    }

    if (selectedDateField.trim()) {
      params.set("dateField", selectedDateField.trim());
    } else {
      params.delete("dateField");
    }

    if (selectedPeriodPreset.trim()) {
      params.set("periodPreset", selectedPeriodPreset.trim());
    } else {
      params.delete("periodPreset");
    }

    if (selectedDateFrom.trim()) {
      params.set("dateFrom", selectedDateFrom.trim());
    } else {
      params.delete("dateFrom");
    }

    if (selectedDateTo.trim()) {
      params.set("dateTo", selectedDateTo.trim());
    } else {
      params.delete("dateTo");
    }

    params.set("page", "1");

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.replace(nextUrl);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0">
      <Card className="min-w-0 space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Filtres</p>
            <h2 className="text-sm font-semibold text-brand-navy">Recherche dans les archives</h2>
            <p className="text-sm text-slate-600">Filtrez par reference, annee, section, direction partenaire et statut.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Annee: {selectedYear || "toutes"}
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Section: {selectedSection || "toutes"}
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Periode: {selectedPeriodPreset || "aucune"}
            </span>
          </div>
        </div>

        <div className={showStatusFilter ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500"
              placeholder="Reference, document ou classeur"
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
            <option value="createdAt">Date de creation</option>
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
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedYear("");
              setSelectedSection("");
              setSelectedPartnerDirectionId("");
              setSelectedStatus("");
              setSelectedDateField("updatedAt");
              setSelectedPeriodPreset("");
              setSelectedDateFrom("");
              setSelectedDateTo("");
              startTransition(() => {
                router.replace(pathname);
              });
            }}
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

function formatDirection(code?: string, designation?: string) {
  if (code && designation) {
    return `${code} - ${designation}`;
  }

  return designation ?? code ?? "-";
}
