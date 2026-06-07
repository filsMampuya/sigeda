"use client";

import { type FormEvent, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";

type DocumentSearchFiltersProps = {
  q?: string;
  status?: string;
};

export function DocumentSearchFilters({ q, status }: DocumentSearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(q ?? "");
  const [selectedStatus, setSelectedStatus] = useState(status ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();

    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    }

    if (selectedStatus.trim()) {
      params.set("status", selectedStatus.trim());
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.replace(nextUrl);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="grid gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_auto]">
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
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Recherche..." : "Rechercher"}
        </button>
      </Card>
    </form>
  );
}
