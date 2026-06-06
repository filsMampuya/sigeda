import { Card } from "@/components/ui/card";

export function PhysicalArchiveForm() {
  return (
    <Card className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <input className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Site" />
      <input className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Batiment" />
      <input className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Salle" />
      <input className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Rayon" />
      <input className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Etagere" />
      <input className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Classeur" />
      <input className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Dossier" />
      <input className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Boite archive" />
    </Card>
  );
}
