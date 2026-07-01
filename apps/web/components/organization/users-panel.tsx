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
  pendingUsers,
  bureaux,
  page = 1,
  pageSize = 10,
  total = 0,
  totalPages = 1,
  canCreate = false
}: {
  users: User[];
  pendingUsers: User[];
  bureaux: Departement[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  canCreate?: boolean;
}) {
  const [state, formAction] = useFormState(createUserAction, initialCreateUserActionState);
  const [creationMode, setCreationMode] = useState<"CREATE" | "COMPLETE">("CREATE");
  const [selectedPendingUserId, setSelectedPendingUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const selectedPendingUser = useMemo(
    () => pendingUsers.find((user) => user.id === selectedPendingUserId) ?? null,
    [pendingUsers, selectedPendingUserId]
  );
  const effectiveRole = selectedRole || selectedPendingUser?.profile.code || "";
  const availableBureaux = useMemo(() => {
    if (effectiveRole !== "DIRECTEUR_GENERAL") {
      return bureaux;
    }

    return bureaux.filter((bureau) => bureau.parents[0] === "DG" && bureau.parents.length <= 2);
  }, [bureaux, effectiveRole]);
  const formSeedKey = `${creationMode}:${selectedPendingUserId || "new"}`;
  const pendingBureauValue = selectedPendingUser?.bureau
    ? JSON.stringify({
        code: selectedPendingUser.bureau.code,
        designation: selectedPendingUser.bureau.designation
      })
    : "";
  const safePage = Math.min(page, totalPages);
  const activeUsers = users.filter((user) => user.directoryStatus !== "PENDING_COMPLETION");

  function formatDirectoryStatus(status?: User["directoryStatus"]) {
    if (status === "PENDING_COMPLETION") {
      return "A completer";
    }

    if (status === "INACTIVE") {
      return "Inactif";
    }

    return "Actif";
  }

  function formatDirectorySource(source?: User["directorySource"]) {
    if (source === "DOCUMENT_INTELLIGENCE") {
      return "IA documentaire";
    }

    if (source === "KEYCLOAK_PROVISIONED") {
      return "Keycloak";
    }

    return "Manuel";
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.48fr)_minmax(460px,1fr)]">
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 bg-[var(--header-tint)] px-5 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Administration</p>
            <h2 className="text-sm font-semibold text-brand-navy">Utilisateurs</h2>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {activeUsers.length} element{activeUsers.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-[1240px] w-full table-fixed divide-y divide-slate-200 text-sm">
            <thead className="bg-[var(--table-head)] text-left text-slate-700">
              <tr>
                <th className="w-[18%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Utilisateur</th>
                <th className="w-[20%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Email</th>
                <th className="w-[12%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Matricule</th>
                <th className="w-[14%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Profil</th>
                <th className="w-[18%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Bureau</th>
                <th className="w-[9%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Etat</th>
                <th className="w-[9%] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((user) => (
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
                    <LongText value={user.matricule ?? "-"} label="Matricule" className="text-brand-navy" />
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
                  <td className="px-5 py-3.5">
                    <span
                      className={
                        user.directoryStatus === "PENDING_COMPLETION"
                          ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
                          : user.directoryStatus === "INACTIVE"
                            ? "rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                            : "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
                      }
                    >
                      {formatDirectoryStatus(user.directoryStatus)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    <LongText value={formatDirectorySource(user.directorySource)} label="Source de repertoire" />
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Agents detectes</p>
              <h3 className="mt-1 text-sm font-semibold text-brand-navy">Referentiel a completer</h3>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
              {pendingUsers.length} en attente
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {pendingUsers.length === 0 ? (
              <p className="text-sm text-slate-600">Aucun agent provisoire en attente de completion.</p>
            ) : (
              pendingUsers.slice(0, 6).map((user) => (
                <div key={user.id} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <p className="text-sm font-medium text-slate-900">
                    {[user.personne.nom, user.personne.prenom].filter(Boolean).join(" ").trim() || "Agent provisoire"}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {[user.functionTitle, formatStructureLabel(user.bureau?.code, user.bureau?.designation)]
                      .filter(Boolean)
                      .join(" | ")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {user.email ?? "Email a completer"} · {user.matricule ?? "Matricule a completer"}
                  </p>
                </div>
              ))
            )}
            {pendingUsers.length > 6 ? (
              <p className="text-xs text-slate-500">
                {pendingUsers.length - 6} autre{pendingUsers.length - 6 > 1 ? "s" : ""} agent
                {pendingUsers.length - 6 > 1 ? "s restent" : " reste"} a completer.
              </p>
            ) : null}
          </div>
        </div>
        {canCreate ? (
          <>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-brand-navy">Nouvel utilisateur</h2>
              <p className="text-sm text-slate-600">Creation directe ou completion d&apos;un agent detecte puis enrichi.</p>
            </div>
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="mode" value={creationMode} />
              <input type="hidden" name="pendingUserId" value={selectedPendingUserId} />

              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Mode">
                  <select
                    className={inputClassName}
                    value={creationMode}
                    onChange={(event) => {
                      const nextMode = event.target.value === "COMPLETE" ? "COMPLETE" : "CREATE";
                      setCreationMode(nextMode);
                      setSelectedPendingUserId("");
                      setSelectedRole("");
                    }}
                  >
                    <option value="CREATE">Creation directe</option>
                    <option value="COMPLETE">Completer un agent</option>
                  </select>
                </FormField>
                <FormField label="Agent a completer">
                  <select
                    className={inputClassName}
                    value={selectedPendingUserId}
                    disabled={creationMode !== "COMPLETE" || pendingUsers.length === 0}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      setSelectedPendingUserId(nextId);
                      const nextUser = pendingUsers.find((user) => user.id === nextId);
                      setSelectedRole(nextUser?.profile.code ?? "");
                    }}
                  >
                    <option value="">
                      {pendingUsers.length === 0
                        ? "Aucun agent en attente"
                        : creationMode === "COMPLETE"
                          ? "Selectionner un agent"
                          : "Activer le mode completion"}
                    </option>
                    {pendingUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {[`${user.personne.nom} ${user.personne.prenom}`.trim(), user.bureau?.designation, user.functionTitle]
                          .filter(Boolean)
                          .join(" - ")}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              {creationMode === "COMPLETE" && selectedPendingUser ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-medium text-brand-navy">Agent selectionne</p>
                  <p className="mt-1">
                    {[`${selectedPendingUser.personne.nom} ${selectedPendingUser.personne.prenom}`.trim(), selectedPendingUser.functionTitle]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {formatStructureLabel(selectedPendingUser.bureau?.code, selectedPendingUser.bureau?.designation)}
                  </p>
                </div>
              ) : null}

              <div key={formSeedKey} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField label="Nom" required>
                    <input
                      name="nom"
                      className={inputClassName}
                      placeholder="Nom"
                      required
                      defaultValue={selectedPendingUser?.personne.nom ?? ""}
                    />
                  </FormField>
                  <FormField label="Postnom" required>
                    <input
                      name="postnom"
                      className={inputClassName}
                      placeholder="Postnom"
                      required
                      defaultValue={selectedPendingUser?.personne.prenom ?? ""}
                    />
                  </FormField>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField label="Adresse email" required>
                    <input
                      name="email"
                      type="email"
                      className={inputClassName}
                      placeholder="prenom.nom@bcc.cd"
                      required
                      defaultValue={selectedPendingUser?.email ?? ""}
                    />
                  </FormField>
                  <FormField label="Matricule" required>
                    <input
                      name="matricule"
                      className={inputClassName}
                      placeholder="Ex. BCC-002541"
                      required
                      defaultValue={selectedPendingUser?.matricule ?? ""}
                    />
                  </FormField>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField label="Fonction / titre">
                    <input
                      name="functionTitle"
                      className={inputClassName}
                      placeholder="Ex. Chef de bureau"
                      defaultValue={selectedPendingUser?.functionTitle ?? ""}
                    />
                  </FormField>
                  <FormField label="Profil" required>
                    <select
                      name="profile"
                      className={inputClassName}
                      required
                      defaultValue={
                        effectiveRole
                          ? JSON.stringify({
                              code: effectiveRole,
                              designation: formatRoleLabel(effectiveRole as (typeof onPremiseRoles)[number])
                            })
                          : ""
                      }
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
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField label="Bureau de rattachement" required>
                    <select name="bureau" className={inputClassName} required defaultValue={pendingBureauValue}>
                      <option value="" disabled>
                        {effectiveRole === "DIRECTEUR_GENERAL"
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
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    {creationMode === "COMPLETE"
                      ? "La validation completera l'agent provisoire selectionne et le retirera de la liste des agents a completer."
                      : "Si un agent provisoire correspond deja aux informations saisies, il sera complete au lieu de creer un doublon."}
                  </div>
                </div>
              </div>

              {effectiveRole === "DIRECTEUR_GENERAL" ? (
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
              <SubmitButton label={creationMode === "COMPLETE" ? "Completer l'agent" : "Ajouter l'utilisateur"} />
            </form>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-brand-navy">Administration protegee</h2>
              <p className="text-sm text-slate-600">La creation de comptes utilisateurs est reservee aux administrateurs.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Vous pouvez consulter uniquement les utilisateurs relevant de votre perimetre autorise.
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
