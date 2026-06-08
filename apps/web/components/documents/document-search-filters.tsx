"use client";

import { type FormEvent, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";

type DocumentSearchFiltersProps = {
  q?: string;
  status?: string;
  year?: string;
  scopeItems?: Array<{
    key: string;
    label: string;
    value: string;
  }>;
};

export function DocumentSearchFilters({
  q,
  status,
  year,
  scopeItems = []
}: DocumentSearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(q ?? "");
  const [selectedStatus, setSelectedStatus] = useState(status ?? "");
  const [selectedYear, setSelectedYear] = useState(year ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams(window.location.search);

    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    } else {
      params.delete("q");
    }

    if (selectedStatus.trim()) {
      params.set("status", selectedStatus.trim());
    } else {
      params.delete("status");
    }

    if (selectedYear.trim()) {
      params.set("year", selectedYear.trim());
    } else {
      params.delete("year");
    }

    params.set("page", "1");

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.replace(nextUrl);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="space-y-4">
        {scopeItems.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {scopeItems.map((item) => (
              <span
                key={item.key}
                className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {item.label}: {item.value}
              </span>
            ))}
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_0.7fr_auto]">
          <input
            name="q"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Reference, titre ou mot-cle"
          />
          <select
            name="status"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="EN_VALIDATION">En validation</option>
            <option value="VALIDE">Valide</option>
            <option value="ARCHIVE">Archive</option>
            <option value="REJETE">Rejete</option>
          </select>
          <input
            name="year"
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
            inputMode="numeric"
            placeholder="Annee"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Recherche..." : "Rechercher"}
          </button>
        </div>
      </Card>
    </form>
  );
}
