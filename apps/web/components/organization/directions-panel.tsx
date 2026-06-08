"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import type { Departement } from "@sigeda/shared/types";

import { createDirectionAction } from "@/app/organization-actions";
import type { OrganizationActionState } from "@/app/organization-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

const initialOrganizationActionState: OrganizationActionState = {
  message: null,
  status: "idle"
};

export function DirectionsPanel({ directions }: { directions: Departement[] }) {
  const [type, setType] = useState<"Direction Generale" | "Direction">("Direction Generale");
  const [state, formAction] = useFormState(createDirectionAction, initialOrganizationActionState);
  const directionGenerales = directions.filter((direction) => direction.type === "Direction Generale");

  return (
    <div className="grid gap-6 xl:grid-cols-[1.8fr_0.95fr]">
      <Card className="overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Code</th>
              <th className="px-6 py-4 font-medium">Direction</th>
              <th className="px-6 py-4 font-medium">DG</th>
              <th className="px-6 py-4 font-medium">Création</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {directions.map((direction) => {
              const isGeneral = direction.type === "Direction Generale";

              return (
                <tr key={direction.id}>
                  <td className="px-6 py-4 font-medium text-brand-navy">{direction.code}</td>
                  <td className="px-6 py-4">{direction.designation}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        isGeneral ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isGeneral ? "Oui" : "Non"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{formatShortDate(direction.dateCreation)}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/documents?directionId=${encodeURIComponent(direction.id)}`}
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
        <h2 className="text-lg font-semibold text-brand-navy">Nouvelle direction</h2>
        <form action={formAction} className="mt-4 space-y-4">
          <select
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as "Direction Generale" | "Direction")}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            required
          >
            <option value="Direction Generale">Direction Générale</option>
            <option value="Direction">Direction opérationnelle</option>
          </select>
          {type === "Direction" ? (
          <select
            name="parent"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Sélectionner la direction générale
            </option>
            {directionGenerales.map((direction) => (
              <option
                key={direction.code}
                value={JSON.stringify({
                  code: direction.code,
                  designation: direction.designation
                })}
              >
                {formatStructureLabel(direction.code, direction.designation)}
              </option>
            ))}
          </select>
          ) : null}
          <input
            name="designation"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Désignation"
            required
          />
          <input
            name="code"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Code"
            required
          />
          {state.message ? (
            <p className={`text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>
              {state.message}
            </p>
          ) : null}
          <SubmitButton label="Ajouter" />
        </form>
      </Card>
    </div>
  );
}
