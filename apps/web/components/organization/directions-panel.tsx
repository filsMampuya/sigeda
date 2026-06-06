"use client";

import { useState } from "react";
import type { DepartementListItem } from "@sigeda/shared/types";

import { createDirectionAction } from "@/app/organization-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";

export function DirectionsPanel({ directions }: { directions: DepartementListItem[] }) {
  const [type, setType] = useState<"DirectionGenerale" | "Direction">("DirectionGenerale");
  const directionGenerales = directions.filter((direction) => direction.type === "DirectionGenerale");

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
            {directions.map((direction) => (
              <tr key={direction.id}>
                <td className="px-6 py-4">{direction.designation}</td>
                <td className="px-6 py-4 font-medium text-brand-navy">{direction.code}</td>
                <td className="px-6 py-4">{direction.type}</td>
                <td className="px-6 py-4 text-slate-600">{direction.parentDesignation ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-brand-navy">Nouvelle direction</h2>
        <form action={createDirectionAction} className="mt-5 space-y-4">
          <select
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as "DirectionGenerale" | "Direction")}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            required
          >
            <option value="DirectionGenerale">Direction Generale</option>
            <option value="Direction">Direction</option>
          </select>
          {type === "Direction" ? (
            <select
              name="parentId"
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Selectionner une direction generale
              </option>
              {directionGenerales.map((direction) => (
                <option key={direction.id} value={direction.id}>
                  {direction.designation}
                </option>
              ))}
            </select>
          ) : null}
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
          <SubmitButton label="Ajouter la direction" />
        </form>
      </Card>
    </div>
  );
}
