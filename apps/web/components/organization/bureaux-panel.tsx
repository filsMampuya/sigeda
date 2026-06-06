import type { Bureau, Direction, Service } from "@sigeda/shared/types";

import { createBureauAction } from "@/app/organization-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";

export function BureauxPanel({
  bureaux,
  directions,
  services
}: {
  bureaux: Bureau[];
  directions: Direction[];
  services: Service[];
}) {
  const directionNames = new Map(directions.map((direction) => [direction.id, direction.name]));
  const serviceNames = new Map(services.map((service) => [service.id, service.name]));

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card className="overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Code</th>
              <th className="px-6 py-4 font-medium">Bureau</th>
              <th className="px-6 py-4 font-medium">Service</th>
              <th className="px-6 py-4 font-medium">Direction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {bureaux.map((bureau) => (
              <tr key={bureau.id}>
                <td className="px-6 py-4 font-medium text-brand-navy">{bureau.code}</td>
                <td className="px-6 py-4">{bureau.name}</td>
                <td className="px-6 py-4">{serviceNames.get(bureau.serviceId) ?? bureau.serviceId}</td>
                <td className="px-6 py-4">{directionNames.get(bureau.directionId) ?? bureau.directionId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-brand-navy">Nouveau bureau</h2>
        <form action={createBureauAction} className="mt-5 space-y-4">
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
          <select
            name="serviceId"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Selectionner un service
            </option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
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
            placeholder="Nom du bureau"
            required
          />
          <textarea
            name="description"
            className="min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Description"
          />
          <SubmitButton label="Ajouter le bureau" />
        </form>
      </Card>
    </div>
  );
}
