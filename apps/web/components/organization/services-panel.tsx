import type { Direction, Service } from "@sigeda/shared/types";

import { createServiceAction } from "@/app/organization-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";

export function ServicesPanel({
  services,
  directions
}: {
  services: Service[];
  directions: Direction[];
}) {
  const directionNames = new Map(directions.map((direction) => [direction.id, direction.name]));

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card className="overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Code</th>
              <th className="px-6 py-4 font-medium">Service</th>
              <th className="px-6 py-4 font-medium">Direction</th>
              <th className="px-6 py-4 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {services.map((service) => (
              <tr key={service.id}>
                <td className="px-6 py-4 font-medium text-brand-navy">{service.code}</td>
                <td className="px-6 py-4">{service.name}</td>
                <td className="px-6 py-4">{directionNames.get(service.directionId) ?? service.directionId}</td>
                <td className="px-6 py-4 text-slate-600">{service.description ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-brand-navy">Nouveau service</h2>
        <form action={createServiceAction} className="mt-5 space-y-4">
          <select
            name="directionId"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Selectionner une direction
            </option>
            {directions.map((direction) => (
              <option key={direction.id} value={direction.id}>
                {direction.name}
              </option>
            ))}
          </select>
          <input
            name="code"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Code"
            required
          />
          <input
            name="name"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Nom du service"
            required
          />
          <textarea
            name="description"
            className="min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Description"
          />
          <SubmitButton label="Ajouter le service" />
        </form>
      </Card>
    </div>
  );
}
