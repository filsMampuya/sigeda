import Link from "next/link";
import type { DepartementListItem, User } from "@sigeda/shared/types";

import { createBureauAction } from "@/app/organization-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

export function BureauxPanel({
  bureaux,
  services,
  directions,
  users
}: {
  bureaux: DepartementListItem[];
  services: DepartementListItem[];
  directions: DepartementListItem[];
  users: User[];
}) {
  const serviceMap = new Map(services.map((service) => [service.code, service]));
  const directionMap = new Map(directions.map((direction) => [direction.code, direction]));

  return (
    <div className="grid gap-6 xl:grid-cols-[1.8fr_0.95fr]">
      <Card className="overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Nom</th>
              <th className="px-6 py-4 font-medium">Service</th>
              <th className="px-6 py-4 font-medium">Direction</th>
              <th className="px-6 py-4 font-medium">Agents</th>
              <th className="px-6 py-4 font-medium">Responsable</th>
              <th className="px-6 py-4 font-medium">Création</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {bureaux.map((bureau) => {
              const service = bureau.parent?.code ? serviceMap.get(bureau.parent.code) : undefined;
              const direction = service?.parent?.code ? directionMap.get(service.parent.code) : undefined;
              const agentCount = users.filter((user) => user.bureauId === bureau.id).length;
              const responsible = users.find((user) => user.role === "CHEF_BUREAU" && user.bureauId === bureau.id);

              return (
                <tr key={bureau.id}>
                  <td className="px-6 py-4 font-medium text-brand-navy">{bureau.designation}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatStructureLabel(service?.code ?? bureau.parent?.code, service?.designation ?? bureau.parent?.designation)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatStructureLabel(direction?.code, direction?.designation)}
                  </td>
                  <td className="px-6 py-4">{agentCount}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {responsible ? `${responsible.personne.nom} ${responsible.personne.prenom}`.trim() : "-"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{formatShortDate(bureau.dateCreation)}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/documents?bureauId=${encodeURIComponent(bureau.id)}`}
                      className="text-xs font-medium text-brand-navy hover:underline"
                    >
                      Voir
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-brand-navy">Nouveau bureau</h2>
        <form action={createBureauAction} className="mt-4 space-y-4">
          <input
            name="designation"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Nom du bureau"
            required
          />
          <input
            name="code"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Code"
            required
          />
          <select
            name="parent"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Sélectionner un service
            </option>
            {services.map((service) => (
              <option
                key={service.id}
                value={JSON.stringify({
                  code: service.code,
                  designation: service.designation
                })}
              >
                {formatStructureLabel(service.code, service.designation)}
              </option>
            ))}
          </select>
          <SubmitButton label="Ajouter" />
        </form>
      </Card>
    </div>
  );
}
