import type { DepartementListItem } from "@sigeda/shared/types";

import { createBureauAction } from "@/app/organization-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";

export function BureauxPanel({
  bureaux,
  services
}: {
  bureaux: DepartementListItem[];
  services: DepartementListItem[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card className="overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Designation</th>
              <th className="px-6 py-4 font-medium">Code</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Parent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {bureaux.map((bureau) => (
              <tr key={bureau.id}>
                <td className="px-6 py-4">{bureau.designation}</td>
                <td className="px-6 py-4 font-medium text-brand-navy">{bureau.code}</td>
                <td className="px-6 py-4">{bureau.type}</td>
                <td className="px-6 py-4 text-slate-600">{bureau.parentDesignation ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-brand-navy">Nouveau bureau</h2>
        <form action={createBureauAction} className="mt-5 space-y-4">
          <input
            name="designation"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Designation"
            required
          />
          <input
            name="code"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Code"
            required
          />
          <select
            name="parent"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Selectionner un service
            </option>
            {services.map((service) => (
              <option
                key={service.id}
                value={JSON.stringify({
                  code: service.code,
                  designation: service.designation
                })}
              >
                {service.designation}
              </option>
            ))}
          </select>
          <SubmitButton label="Ajouter le bureau" />
        </form>
      </Card>
    </div>
  );
}
