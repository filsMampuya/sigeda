import Link from "next/link";
import type { DepartementListItem, User } from "@sigeda/shared/types";

import { createServiceAction } from "@/app/organization-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { formatRoleLabel, formatShortDate, formatStructureLabel } from "@/lib/format";

export function ServicesPanel({
  services,
  directions,
  bureaux,
  users
}: {
  services: DepartementListItem[];
  directions: DepartementListItem[];
  bureaux: DepartementListItem[];
  users: User[];
}) {
  const directionMap = new Map(directions.map((direction) => [direction.code, direction]));

  return (
    <div className="grid gap-6 xl:grid-cols-[1.8fr_0.95fr]">
      <Card className="overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Code</th>
              <th className="px-6 py-4 font-medium">Nom</th>
              <th className="px-6 py-4 font-medium">Direction</th>
              <th className="px-6 py-4 font-medium">Responsable</th>
              <th className="px-6 py-4 font-medium">Bureaux</th>
              <th className="px-6 py-4 font-medium">Création</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {services.map((service) => {
              const direction = service.parent?.code ? directionMap.get(service.parent.code) : undefined;
              const responsible = users.find((user) => user.role === "CHEF_SERVICE" && user.serviceId === service.id);
              const bureauCount = bureaux.filter((bureau) => bureau.parent?.code === service.code).length;

              return (
                <tr key={service.id}>
                  <td className="px-6 py-4 font-medium text-brand-navy">{service.code}</td>
                  <td className="px-6 py-4">{service.designation}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatStructureLabel(direction?.code ?? service.parent?.code, direction?.designation ?? service.parent?.designation)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {responsible ? `${responsible.personne.nom} ${responsible.personne.prenom}`.trim() : "-"}
                  </td>
                  <td className="px-6 py-4">{bureauCount}</td>
                  <td className="px-6 py-4 text-slate-600">{formatShortDate(service.dateCreation)}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/documents?serviceId=${encodeURIComponent(service.id)}`}
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
        <h2 className="text-lg font-semibold text-brand-navy">Nouveau service</h2>
        <form action={createServiceAction} className="mt-4 space-y-4">
          <input
            name="designation"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Nom du service"
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
              Sélectionner une direction
            </option>
            {directions.map((direction) => (
              <option
                key={direction.id}
                value={JSON.stringify({
                  code: direction.code,
                  designation: direction.designation
                })}
              >
                {formatStructureLabel(direction.code, direction.designation)}
              </option>
            ))}
          </select>
          <SubmitButton label="Ajouter" />
        </form>
      </Card>
    </div>
  );
}
