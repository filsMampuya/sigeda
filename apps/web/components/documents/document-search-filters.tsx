import { Card } from "@/components/ui/card";

type DocumentSearchFiltersProps = {
  q?: string;
  status?: string;
};

export function DocumentSearchFilters({ q, status }: DocumentSearchFiltersProps) {
  return (
    <form>
      <Card className="grid gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_auto]">
        <input
          name="q"
          defaultValue={q}
          className="rounded-xl border border-slate-200 px-4 py-3"
          placeholder="Reference, titre ou mot-cle"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-xl border border-slate-200 px-4 py-3"
        >
          <option value="">Tous les statuts</option>
          <option value="BROUILLON">Brouillon</option>
          <option value="EN_VALIDATION">En validation</option>
          <option value="VALIDE">Valide</option>
          <option value="ARCHIVE">Archive</option>
          <option value="REJETE">Rejete</option>
        </select>
        <button className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-medium text-white">
          Rechercher
        </button>
      </Card>
    </form>
  );
}
