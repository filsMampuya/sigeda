"use client";

import { type FormEvent, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Departement } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";

type ArchiveFiltersProps = {
  q?: string;
  year?: string;
  section?: string;
  partnerDirectionId?: string;
  status?: string;
  partnerDirections?: Departement[];
  showStatusFilter?: boolean;
};

export function ArchiveFilters({
  q,
  year,
  section,
  partnerDirectionId,
  status,
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

    params.set("page", "1");

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.replace(nextUrl);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card
        className={
          showStatusFilter
            ? "grid gap-4 md:grid-cols-3 xl:grid-cols-[1.4fr_0.8fr_0.9fr_1.2fr_1fr_auto]"
            : "grid gap-4 md:grid-cols-3 xl:grid-cols-[1.5fr_0.8fr_0.9fr_1.3fr_auto]"
        }
      >
        <input
          name="q"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3"
          placeholder="Reference, document ou classeur"
        />
        <input
          name="year"
          type="number"
          min={2000}
          max={3000}
          value={selectedYear}
          onChange={(event) => setSelectedYear(event.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3"
          placeholder="Annee"
        />
        <select
          name="section"
          value={selectedSection}
          onChange={(event) => setSelectedSection(event.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3"
        >
          <option value="">Toutes les sections</option>
          <option value="ENTREE">ENTREE</option>
          <option value="SORTIE">SORTIE</option>
        </select>
        <select
          name="partnerDirectionId"
          value={selectedPartnerDirectionId}
          onChange={(event) => setSelectedPartnerDirectionId(event.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3"
        >
          <option value="">Toutes les directions partenaires</option>
          {partnerDirections.map((direction) => (
            <option key={direction.id} value={direction.id}>
              {formatDirection(direction.code, direction.designation)}
            </option>
          ))}
        </select>
        {showStatusFilter ? (
          <select
            name="status"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <option value="">Tous les statuts</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Filtrage..." : "Filtrer"}
        </button>
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
