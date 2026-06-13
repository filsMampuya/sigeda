"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import type { Departement, User } from "@sigeda/shared/types";
import { onPremiseRoles } from "@sigeda/shared/constants";

import { createUserAction } from "@/app/admin/users/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { LongText } from "@/components/ui/long-text";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { formatRoleLabel, formatStructureLabel } from "@/lib/format";

const initialCreateUserActionState = {
  status: "idle",
  message: null,
  defaultPassword: null
} as Awaited<ReturnType<typeof createUserAction>>;

const inputClassName =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500";

export function UsersPanel({
  users,
  bureaux,
  page = 1,
  pageSize = 10
}: {
  users: User[];
  bureaux: Departement[];
  page?: number;
  pageSize?: number;
}) {
  const [state, formAction] = useFormState(createUserAction, initialCreateUserActionState);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const availableBureaux = useMemo(() => {
    if (selectedRole !== "DIRECTEUR_GENERAL") {
      return bureaux;
    }

    return bureaux.filter((bureau) => bureau.parents[0] === "DG" && bureau.parents.length <= 2);
  }, [bureaux, selectedRole]);
  const total = users.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(
    () => users.slice((safePage - 1) * pageSize, safePage * pageSize),
    [pageSize, safePage, users]
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.48fr)_minmax(460px,1fr)]">
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 bg-[var(--header-tint)] px-5 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Administration</p>
            <h2 className="text-sm font-semibold text-brand-navy">Utilisateurs</h2>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {users.length} element{users.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full table-fixed divide-y divide-slate-200 text-sm">
            <thead className="bg-[var(--table-head)] text-left text-slate-700">
              <tr>
                <th className="w-[21%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Utilisateur</th>
                <th className="w-[23%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Email</th>
                <th className="w-[14%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Matricule</th>
                <th className="w-[18%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Profil</th>
                <th className="w-[24%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Bureau</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3.5">
                    <LongText
                      value={`${user.personne.nom} ${user.personne.prenom}`}
                      label="Nom complet"
                      className="font-medium"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <LongText value={user.email ?? "-"} label="Adresse email" className="text-slate-600" />
                  </td>
                  <td className="px-5 py-3.5 font-medium text-brand-navy">
                    <LongText value={user.matricule} label="Matricule" className="text-brand-navy" />
                  </td>
                  <td className="px-5 py-3.5">
                    <LongText value={user.profile.designation} label="Profil utilisateur" />
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    <LongText
                      value={formatStructureLabel(user.bureau?.code, user.bureau?.designation)}
                      label="Bureau de rattachement"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3">
          <PaginationControls page={safePage} pageSize={pageSize} total={total} totalPages={totalPages} />
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-brand-navy">Nouvel utilisateur</h2>
          <p className="text-sm text-slate-600">Compte, profil et bureau de rattachement.</p>
        </div>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Nom" required>
              <input name="nom" className={inputClassName} placeholder="Nom" required />
            </FormField>
            <FormField label="Postnom" required>
              <input name="postnom" className={inputClassName} placeholder="Postnom" required />
            </FormField>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Adresse email" required>
              <input name="email" type="email" className={inputClassName} placeholder="prenom.nom@bcc.cd" required />
            </FormField>
            <FormField label="Matricule" required>
              <input name="matricule" className={inputClassName} placeholder="Ex. BCC-002541" required />
            </FormField>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Profil" required>
              <select
                name="profile"
                className={inputClassName}
                required
                defaultValue=""
                onChange={(event) => setSelectedRole(event.target.value ? JSON.parse(event.target.value).code : "")}
              >
                <option value="" disabled>
                  Selectionner un profil
                </option>
                {onPremiseRoles.map((role) => (
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
            </FormField>
            <FormField label="Bureau de rattachement" required>
              <select
                name="bureau"
                className={inputClassName}
                required
                defaultValue=""
              >
                <option value="" disabled>
                  {selectedRole === "DIRECTEUR_GENERAL"
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
            </FormField>
          </div>
          {selectedRole === "DIRECTEUR_GENERAL" ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Le profil Direction generale ne peut etre rattache qu&apos;a une structure relevant de la Direction generale.
            </div>
          ) : null}
          {state.status === "success" ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <p>{state.message}</p>
              {state.defaultPassword ? (
                <p className="mt-1 font-medium">Mot de passe initial: {state.defaultPassword}</p>
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
