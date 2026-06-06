import type { Direction } from "@sigeda/shared/types";

import { createDirectionAction } from "@/app/organization-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";

export function DirectionsPanel({ directions }: { directions: Direction[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card className="overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Code</th>
              <th className="px-6 py-4 font-medium">Direction</th>
              <th className="px-6 py-4 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {directions.map((direction) => (
              <tr key={direction.id}>
                <td className="px-6 py-4 font-medium text-brand-navy">{direction.code}</td>
                <td className="px-6 py-4">{direction.name}</td>
                <td className="px-6 py-4 text-slate-600">{direction.description ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-brand-navy">Nouvelle direction</h2>
        <form action={createDirectionAction} className="mt-5 space-y-4">
          <input
            name="code"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Code"
            required
          />
          <input
            name="name"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Nom de la direction"
            required
          />
          <textarea
            name="description"
            className="min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Description"
          />
          <SubmitButton label="Ajouter la direction" />
        </form>
      </Card>
    </div>
  );
}
