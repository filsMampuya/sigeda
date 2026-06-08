"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import type { Departement, User } from "@sigeda/shared/types";
import { roles } from "@sigeda/shared/constants";

import { createUserAction } from "@/app/admin/users/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { formatRoleLabel, formatStructureLabel } from "@/lib/format";

const initialCreateUserActionState = {
  status: "idle",
  message: null,
  defaultPassword: null
} as Awaited<ReturnType<typeof createUserAction>>;

export function UsersPanel({ users, bureaux }: { users: User[]; bureaux: Departement[] }) {
  const [state, formAction] = useFormState(createUserAction, initialCreateUserActionState);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const availableBureaux = useMemo(() => {
    if (selectedRole !== "DIRECTION_GENERALE") {
      return bureaux;
    }

    return bureaux.filter((bureau) => bureau.parents[0] === "DG" && bureau.parents.length <= 2);
  }, [bureaux, selectedRole]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
      <Card className="overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Utilisateur</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Matricule</th>
              <th className="px-6 py-4 font-medium">Profil</th>
              <th className="px-6 py-4 font-medium">Bureau</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4">
                  {user.personne.nom} {user.personne.prenom}
                </td>
                <td className="px-6 py-4">{user.email ?? "-"}</td>
                <td className="px-6 py-4 font-medium text-brand-navy">{user.matricule}</td>
                <td className="px-6 py-4">{user.profile.designation}</td>
                <td className="px-6 py-4 text-slate-600">
                  {formatStructureLabel(user.bureau?.code, user.bureau?.designation)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-brand-navy">Nouvel utilisateur</h2>
        <p className="mt-1 text-sm text-slate-500">Creation avec controle du rattachement organisationnel.</p>
        <form action={formAction} className="mt-5 space-y-4">
          <input
            name="nom"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Nom"
            required
          />
          <input
            name="postnom"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Postnom"
            required
          />
          <input
            name="email"
            type="email"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Adresse email"
            required
          />
          <input
            name="matricule"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Matricule"
            required
          />
          <select
            name="profile"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            required
            defaultValue=""
            onChange={(event) => setSelectedRole(event.target.value ? JSON.parse(event.target.value).code : "")}
          >
            <option value="" disabled>
              Selectionner un profil
            </option>
            {roles.map((role) => (
              <option
                key={role}
                value={JSON.stringify({
                  code: role,
                  designation: formatRoleLabel(role)
                })}
              >
                {formatRoleLabel(role)}
              </option>
            ))}
          </select>
          <select
            name="bureau"
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            required
            defaultValue=""
          >
            <option value="" disabled>
              {selectedRole === "DIRECTION_GENERALE"
                ? "Selectionner un bureau relevant de la Direction generale"
                : "Selectionner un bureau"}
            </option>
            {availableBureaux.map((bureau) => (
              <option
                key={bureau.id}
                value={JSON.stringify({
                  code: bureau.code,
                  designation: bureau.designation
                })}
              >
                {formatStructureLabel(bureau.code, bureau.designation)}
              </option>
            ))}
          </select>
          {selectedRole === "DIRECTION_GENERALE" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Le profil Direction generale ne peut etre rattache qu&apos;a une structure relevant de la Direction generale.
            </div>
          ) : null}
          {state.status === "success" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <p>{state.message}</p>
              {state.defaultPassword ? (
                <p className="mt-1 font-medium">Mot de passe par defaut: {state.defaultPassword}</p>
              ) : null}
            </div>
          ) : null}
          {state.status === "error" ? <p className="text-sm text-red-700">{state.message}</p> : null}
          <SubmitButton label="Ajouter l'utilisateur" />
        </form>
      </Card>
    </div>
  );
}
