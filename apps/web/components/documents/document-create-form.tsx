"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  FileText,
  Paperclip,
  Search,
  Shield,
  UserSquare2,
  Users,
  X
} from "lucide-react";
import type { AuthenticatedUser, DepartementListItem, User } from "@sigeda/shared/types";
import { confidentialityLevels, documentTypes } from "@sigeda/shared/constants";

import { DocumentUploadStatus } from "@/components/documents/document-upload-status";
import { Card } from "@/components/ui/card";
import { getClientAuthToken } from "@/lib/client-auth-token";
import { getPublicOnPremiseApiBaseUrl } from "@/lib/env";
import { formatShortDate, formatStructureLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

type DocumentCreateFormProps = {
  directions: DepartementListItem[];
  services: DepartementListItem[];
  bureaux: DepartementListItem[];
  users: User[];
  currentUser: AuthenticatedUser | null;
};

type EmitterScope = {
  type: "Direction" | "Service" | "Bureau";
  id: string;
  label: string;
};

type CreatedDocumentSummary = {
  createdAt?: string;
  id: string;
  reference: string;
  title: string;
};

type DirectionSelectionFieldProps = {
  directionLookup: Map<string, DepartementListItem>;
  emptyState: string;
  label: string;
  onRemove: (id: string) => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  options: DepartementListItem[];
  searchValue: string;
  selectedIds: string[];
};

type SignerSelectionFieldProps = {
  emptyState: string;
  onMove: (id: string, direction: "up" | "down") => void;
  onRemove: (id: string) => void;
  onSearchChange: (value: string) => void;
  onToggle: (id: string) => void;
  searchValue: string;
  selectedIds: string[];
  userLookup: Map<string, User>;
  users: User[];
};

const confidentialityToneMap: Record<(typeof confidentialityLevels)[number], string> = {
  PUBLIC: "border-emerald-200 bg-emerald-50 text-emerald-800",
  INTERNE: "border-slate-200 bg-slate-100 text-slate-800",
  CONFIDENTIEL: "border-amber-200 bg-amber-50 text-amber-900",
  SECRET: "border-rose-200 bg-rose-50 text-rose-900",
  TRES_SECRET: "border-red-200 bg-red-50 text-red-900"
};

export function DocumentCreateForm({
  directions,
  services,
  bureaux,
  users,
  currentUser
}: DocumentCreateFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const apiBaseUrl = getPublicOnPremiseApiBaseUrl();
  const currentYear = new Date().getFullYear();
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedSignerIds, setSelectedSignerIds] = useState<string[]>([]);
  const [selectedReceiverIds, setSelectedReceiverIds] = useState<string[]>([]);
  const [selectedCopyIds, setSelectedCopyIds] = useState<string[]>([]);
  const [receiverSearch, setReceiverSearch] = useState("");
  const [copySearch, setCopySearch] = useState("");
  const [signerSearch, setSignerSearch] = useState("");
  const [selectedConfidentialityLevel, setSelectedConfidentialityLevel] =
    useState<(typeof confidentialityLevels)[number]>("INTERNE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdDocument, setCreatedDocument] = useState<CreatedDocumentSummary | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedEmitterDirectionId, setSelectedEmitterDirectionId] = useState(currentUser?.directionId ?? "");

  const selectableDirections = useMemo(
    () => directions.filter((direction) => direction.type === "Direction" || direction.type === "Direction Generale"),
    [directions]
  );
  const currentDirection = selectableDirections.find((direction) => direction.id === currentUser?.directionId) ?? null;
  const selectedEmitterDirection =
    selectableDirections.find((direction) => direction.id === selectedEmitterDirectionId) ?? currentDirection ?? null;
  const currentService = services.find((service) => service.id === currentUser?.serviceId) ?? null;
  const currentBureau = bureaux.find((bureau) => bureau.id === currentUser?.bureauId) ?? null;
  const emitterScope = useMemo<EmitterScope | null>(() => {
    if (!selectedEmitterDirectionId || selectedEmitterDirectionId === currentUser?.directionId) {
      if (currentBureau) {
        return {
          type: "Bureau",
          id: currentBureau.id,
          label: formatStructureLabel(currentBureau.code, currentBureau.designation)
        };
      }

      if (currentService) {
        return {
          type: "Service",
          id: currentService.id,
          label: formatStructureLabel(currentService.code, currentService.designation)
        };
      }
    }

    if (selectedEmitterDirection) {
      return {
        type: "Direction",
        id: selectedEmitterDirection.id,
        label: formatStructureLabel(selectedEmitterDirection.code, selectedEmitterDirection.designation)
      };
    }

    return null;
  }, [currentBureau, currentService, currentUser?.directionId, selectedEmitterDirection, selectedEmitterDirectionId]);
  const selectableSigners = useMemo(() => {
    return users.filter((user) => {
      if (user.isActive === false) {
        return false;
      }

      if (!emitterScope) {
        return true;
      }

      if (emitterScope.type === "Bureau") {
        return user.bureauId === emitterScope.id;
      }

      if (emitterScope.type === "Service") {
        return user.serviceId === emitterScope.id;
      }

      return user.directionId === emitterScope.id;
    });
  }, [emitterScope, users]);
  const selectedSigners = useMemo(
    () => selectedSignerIds.map((userId) => selectableSigners.find((user) => user.id === userId)).filter(Boolean),
    [selectableSigners, selectedSignerIds]
  );
  const emitterDirectionId = selectedEmitterDirectionId || currentUser?.directionId || "";
  const directionCandidates = useMemo(
    () => selectableDirections.filter((direction) => direction.id !== emitterDirectionId),
    [emitterDirectionId, selectableDirections]
  );
  const directionLookup = useMemo(
    () => new Map(directionCandidates.map((direction) => [direction.id, direction])),
    [directionCandidates]
  );
  const signerLookup = useMemo(
    () => new Map(selectableSigners.map((user) => [user.id, user])),
    [selectableSigners]
  );
  const filteredReceiverOptions = useMemo(
    () =>
      directionCandidates.filter(
        (direction) =>
          !selectedCopyIds.includes(direction.id) &&
          matchesDirectionSearch(direction, receiverSearch)
      ),
    [directionCandidates, receiverSearch, selectedCopyIds]
  );
  const filteredCopyOptions = useMemo(
    () =>
      directionCandidates.filter(
        (direction) =>
          !selectedReceiverIds.includes(direction.id) &&
          matchesDirectionSearch(direction, copySearch)
      ),
    [copySearch, directionCandidates, selectedReceiverIds]
  );
  const filteredSignerOptions = useMemo(
    () => selectableSigners.filter((user) => matchesSignerSearch(user, signerSearch)),
    [selectableSigners, signerSearch]
  );

  useEffect(() => {
    if (!selectedEmitterDirectionId && currentUser?.directionId) {
      setSelectedEmitterDirectionId(currentUser.directionId);
    }
  }, [currentUser?.directionId, selectedEmitterDirectionId]);

  useEffect(() => {
    const allowedIds = new Set(selectableSigners.map((user) => user.id));
    setSelectedSignerIds((current) => current.filter((userId) => allowedIds.has(userId)));
  }, [selectableSigners]);

  useEffect(() => {
    const allowedDirectionIds = new Set(directionCandidates.map((direction) => direction.id));

    setSelectedReceiverIds((current) => {
      const sanitized = current.filter((directionId) => allowedDirectionIds.has(directionId));
      return sanitized.length === current.length ? current : sanitized;
    });

    setSelectedCopyIds((current) => {
      const sanitized = current.filter((directionId) => allowedDirectionIds.has(directionId));
      return sanitized.length === current.length ? current : sanitized;
    });
  }, [directionCandidates]);

  useEffect(() => {
    setSelectedReceiverIds((current) => current.filter((directionId) => !selectedCopyIds.includes(directionId)));
  }, [selectedCopyIds]);

  useEffect(() => {
    setSelectedCopyIds((current) => current.filter((directionId) => !selectedReceiverIds.includes(directionId)));
  }, [selectedReceiverIds]);

  function moveSigner(userId: string, direction: "up" | "down") {
    setSelectedSignerIds((current) => {
      const index = current.indexOf(userId);

      if (index === -1) {
        return current;
      }

      const nextIndex = direction === "up" ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const reordered = [...current];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, moved);
      return reordered;
    });
  }

  function toggleSelection(stateSetter: Dispatch<SetStateAction<string[]>>, id: string) {
    stateSetter((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  function resetDocumentForm() {
    formRef.current?.reset();
    setSelectedFileName("");
    setSelectedSignerIds([]);
    setSelectedReceiverIds([]);
    setSelectedCopyIds([]);
    setReceiverSearch("");
    setCopySearch("");
    setSignerSearch("");
    setSelectedConfidentialityLevel("INTERNE");
    setErrorMessage(null);
    setCreatedDocument(null);
    setSelectedEmitterDirectionId(currentUser?.directionId ?? "");
  }

  async function handleSubmit(formData: FormData) {
    const accessToken = await getClientAuthToken();
    const normalizedReceivers = uniqueIds(selectedReceiverIds).filter((directionId) => directionId !== emitterDirectionId);
    const normalizedCopies = uniqueIds(selectedCopyIds).filter(
      (directionId) => directionId !== emitterDirectionId && !normalizedReceivers.includes(directionId)
    );

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Le fichier est obligatoire.");
    }

    if (!normalizedReceivers.length) {
      throw new Error("Selectionnez au moins une direction destinataire differente de la direction emettrice.");
    }

    const payload = new FormData();
    payload.append("file", file);
    payload.append("numeroReference", String(formData.get("numeroReference") ?? ""));
    payload.append("year", String(formData.get("year") ?? currentYear));
    payload.append("title", String(formData.get("title") ?? ""));
    payload.append("subject", String(formData.get("subject") ?? ""));
    payload.append("description", String(formData.get("description") ?? ""));
    payload.append("summary", String(formData.get("summary") ?? ""));
    payload.append("type", String(formData.get("type") ?? ""));
    payload.append("confidentialityLevel", String(formData.get("confidentialityLevel") ?? "INTERNE"));
    payload.append(
      "signers",
      JSON.stringify(
        selectedSignerIds
          .map((userId, index) => {
            const signer = selectableSigners.find((user) => user.id === userId);

            if (!signer) {
              return null;
            }

            return {
              userId: signer.id,
              fullName: signer.displayName || `${signer.personne.nom} ${signer.personne.prenom}`.trim(),
              functionTitle: signer.profile.designation,
              departmentId: emitterScope?.id,
              departmentType:
                emitterScope?.type === "Bureau"
                  ? "BUREAU"
                  : emitterScope?.type === "Service"
                    ? "SERVICE"
                    : "DIRECTION",
              signingOrder: index + 1
            };
          })
          .filter(Boolean)
      )
    );

    if (emitterDirectionId) {
      payload.append("emitterDirectionId", emitterDirectionId);
    }

    payload.append("receiverDirectionIds", JSON.stringify(normalizedReceivers));
    payload.append("copyDirectionIds", JSON.stringify(normalizedCopies));
    payload.append(
      "keywords",
      JSON.stringify(
        String(formData.get("keywords") ?? "")
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      )
    );

    const createResponse = await fetch(`${apiBaseUrl}/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: payload
    });

    if (!createResponse.ok) {
      let message = "La creation du document a echoue.";

      try {
        const errorBody = await createResponse.json();
        if (typeof errorBody.message === "string") {
          message = errorBody.message;
        }
      } catch {
        // noop
      }

      throw new Error(message);
    }

    const document = (await createResponse.json()) as {
      createdAt?: string;
      id: string;
      reference?: string;
      numeroReference?: string;
      subject?: string;
      title?: string;
    };
    setErrorMessage(null);
    setCreatedDocument({
      id: document.id,
      reference: document.reference ?? document.numeroReference ?? String(formData.get("numeroReference") ?? ""),
      title: document.title ?? document.subject ?? String(formData.get("subject") ?? "Document"),
      createdAt: document.createdAt
    });
  }

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          try {
            await handleSubmit(formData);
          } catch (error) {
            setCreatedDocument(null);
            setErrorMessage(error instanceof Error ? error.message : "Operation echouee.");
          }
        })
      }
      className="space-y-4"
    >
      <Card className="space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Saisie documentaire
              </span>
              <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                Annee {currentYear}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-brand-navy">Saisie documentaire</h2>
              <p className="text-sm text-slate-600">Metadonnees, signataires et fichier source dans un seul parcours.</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[480px]">
            <SummaryTile
              label="Emetteur"
              value={selectedEmitterDirection ? selectedEmitterDirection.designation : "A definir"}
              icon={Building2}
            />
            <SummaryTile label="Destinataires" value={String(selectedReceiverIds.length)} icon={Users} />
            <SummaryTile label="Signataires" value={String(selectedSignerIds.length)} icon={UserSquare2} />
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900">
            {errorMessage}
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(420px,0.95fr)]">
        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <SectionHeader icon={FileText} title="Informations generales" />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FieldShell label="Reference" required className="xl:col-span-2">
                <input name="numeroReference" className={inputClassName} placeholder="Ex. DF/2026/0142" required />
              </FieldShell>
              <FieldShell label="Type" required>
                <select name="type" className={inputClassName} required defaultValue="">
                  <option value="" disabled>
                    Selectionner
                  </option>
                  {documentTypes.map((documentType) => (
                    <option key={documentType} value={documentType}>
                      {documentType}
                    </option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell label="Annee" required>
                <input
                  name="year"
                  type="number"
                  defaultValue={currentYear}
                  min={2000}
                  max={3000}
                  className={inputClassName}
                  required
                />
              </FieldShell>
              <FieldShell label="Objet" className="md:col-span-2 xl:col-span-4">
                <input name="subject" className={inputClassName} placeholder="Objet du document" />
              </FieldShell>
              <FieldShell label="Titre" className="md:col-span-2 xl:col-span-4">
                <input name="title" className={inputClassName} placeholder="Intitule court" />
              </FieldShell>
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <SectionHeader icon={Shield} title="Sensibilite" />
            <input type="hidden" name="confidentialityLevel" value={selectedConfidentialityLevel} />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {confidentialityLevels.map((level) => {
                const active = selectedConfidentialityLevel === level;

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedConfidentialityLevel(level)}
                    className={cn(
                      "rounded-md border px-3 py-2.5 text-left transition",
                      active
                        ? `${confidentialityToneMap[level]} shadow-sm`
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em]">Niveau</span>
                    <span className="mt-1 block text-sm font-semibold">{formatConfidentiality(level)}</span>
                  </button>
                );
              })}
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              La confidentialite alimente le circuit documentaire et le classement.
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <SectionHeader icon={Building2} title="Directions concernees" />
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_1.1fr]">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Emetteur</p>
                <select
                  name="emitterDirectionId"
                  value={selectedEmitterDirectionId}
                  onChange={(event) => setSelectedEmitterDirectionId(event.target.value)}
                  className={cn(inputClassName, "mt-2")}
                  required
                >
                  <option value="" disabled>
                    Selectionner
                  </option>
                  {selectableDirections.map((direction) => (
                    <option key={direction.id} value={direction.id}>
                      {formatStructureLabel(direction.code, direction.designation)}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Pre-remplie selon votre compte et modifiable directement dans le formulaire.
                </p>
                {emitterScope ? (
                  <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-900">Perimetre signataires:</span> {emitterScope.type} {emitterScope.label}
                  </div>
                ) : null}
              </div>

              <DirectionSelectionField
                label="Destinataires"
                searchValue={receiverSearch}
                onSearchChange={setReceiverSearch}
                selectedIds={selectedReceiverIds}
                onSelect={(id) => toggleSelection(setSelectedReceiverIds, id)}
                onRemove={(id) => setSelectedReceiverIds((current) => current.filter((value) => value !== id))}
                options={filteredReceiverOptions}
                directionLookup={directionLookup}
                emptyState="Aucune direction disponible."
              />

              <DirectionSelectionField
                label="Copies"
                searchValue={copySearch}
                onSearchChange={setCopySearch}
                selectedIds={selectedCopyIds}
                onSelect={(id) => toggleSelection(setSelectedCopyIds, id)}
                onRemove={(id) => setSelectedCopyIds((current) => current.filter((value) => value !== id))}
                options={filteredCopyOptions}
                directionLookup={directionLookup}
                emptyState="Aucune direction disponible."
              />
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <SectionHeader icon={UserSquare2} title="Signataires" />
            <SignerSelectionField
              users={filteredSignerOptions}
              selectedIds={selectedSignerIds}
              onToggle={(id) => toggleSelection(setSelectedSignerIds, id)}
              onRemove={(id) => setSelectedSignerIds((current) => current.filter((value) => value !== id))}
              onMove={moveSigner}
              searchValue={signerSearch}
              onSearchChange={setSignerSearch}
              userLookup={signerLookup}
              emptyState="Aucun signataire disponible dans le perimetre emetteur."
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <SectionHeader icon={FileText} title="Contenu" />
            <div className="space-y-3">
              <FieldShell label="Resume">
                <textarea name="summary" className={textareaClassName} placeholder="Synthese pour l'enregistrement rapide" />
              </FieldShell>
              <FieldShell label="Description">
                <textarea name="description" className={textareaClassName} placeholder="Contexte ou commentaire de traitement" />
              </FieldShell>
              <FieldShell label="Mots-cles">
                <input name="keywords" className={inputClassName} placeholder="Finances, dossier, reunion" />
              </FieldShell>
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <SectionHeader icon={Paperclip} title="Numerisation" />
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Fichier source</p>
                  <p className="text-xs text-slate-500">PDF et images.</p>
                </div>
                {selectedFileName ? (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
                    Pret
                  </span>
                ) : null}
              </div>
              <input
                name="file"
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg,image/webp,image/tiff"
                onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? "")}
                className="mt-3 block w-full rounded-md border border-slate-300 bg-white p-3 text-sm"
              />
              {selectedFileName ? <p className="mt-2 text-xs text-slate-700">{selectedFileName}</p> : null}
            </div>
            <DocumentUploadStatus hasFile={Boolean(selectedFileName)} uploadMessage="OCR et metadonnees extraites automatiquement" />
          </Card>

          <Card className="space-y-4 p-4">
            <SectionHeader icon={Shield} title="Controle avant validation" />
            <div className="space-y-2 text-sm text-slate-600">
              <ChecklistItem complete={Boolean(emitterDirectionId)}>Direction emettrice resolue</ChecklistItem>
              <ChecklistItem complete={selectedReceiverIds.length > 0}>Au moins un destinataire selectionne</ChecklistItem>
              <ChecklistItem complete={selectedSignerIds.length > 0}>Au moins un signataire selectionne</ChecklistItem>
              <ChecklistItem complete={Boolean(selectedFileName)}>Fichier joint</ChecklistItem>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="h-9 w-full rounded-md bg-brand-navy px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Traitement..." : "Creer le document"}
            </button>
          </Card>
        </div>
      </div>

      {createdDocument ? (
        <SuccessDialog
          createdDocument={createdDocument}
          onClose={() => setCreatedDocument(null)}
          onCreateAnother={resetDocumentForm}
        />
      ) : null}
    </form>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title
}: {
  icon: typeof FileText;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-base font-semibold text-brand-navy">{title}</h2>
    </div>
  );
}

function FieldShell({
  children,
  className,
  label,
  required
}: {
  children: ReactNode;
  className?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className={cn("space-y-1.5 text-sm text-slate-700", className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function DirectionSelectionField({
  directionLookup,
  emptyState,
  label,
  onRemove,
  onSearchChange,
  onSelect,
  options,
  searchValue,
  selectedIds
}: DirectionSelectionFieldProps) {
  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          {selectedIds.length}
        </span>
      </div>

      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={label === "Destinataires" ? "receiverDirectionIds" : "copyDirectionIds"} value={id} />
      ))}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className={cn(inputClassName, "pl-9")}
          placeholder={`Rechercher une direction`}
        />
      </div>

      <div className="flex min-h-11 flex-wrap gap-2">
        {selectedIds.length ? (
          selectedIds.map((id) => {
            const direction = directionLookup.get(id);

            if (!direction) {
              return null;
            }

            return (
              <button
                key={id}
                type="button"
                onClick={() => onRemove(id)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <span>{formatStructureLabel(direction.code, direction.designation)}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            );
          })
        ) : (
          <p className="text-xs text-slate-500">Aucune direction selectionnee.</p>
        )}
      </div>

      <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
        {options.length ? (
          options.map((direction) => {
            const selected = selectedIds.includes(direction.id);

            return (
              <button
                key={direction.id}
                type="button"
                onClick={() => onSelect(direction.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                  selected ? "bg-brand-navy text-white" : "bg-white text-slate-700 hover:bg-slate-100"
                )}
              >
                <span>{formatStructureLabel(direction.code, direction.designation)}</span>
                {selected ? <span className="text-xs font-medium">Ajoutee</span> : null}
              </button>
            );
          })
        ) : (
          <p className="px-2 py-3 text-xs text-slate-500">{emptyState}</p>
        )}
      </div>
    </div>
  );
}

function SignerSelectionField({
  emptyState,
  onMove,
  onRemove,
  onSearchChange,
  onToggle,
  searchValue,
  selectedIds,
  userLookup,
  users
}: SignerSelectionFieldProps) {
  const selectedSigners = selectedIds.map((id) => userLookup.get(id)).filter(Boolean);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            className={cn(inputClassName, "pl-9")}
            placeholder="Rechercher un signataire"
          />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
          {users.length ? (
            users.map((user) => {
              const checked = selectedIds.includes(user.id);
              const label = user.displayName || `${user.personne.nom} ${user.personne.prenom}`.trim();

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onToggle(user.id)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition",
                    checked ? "bg-brand-navy text-white" : "bg-white text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className={cn("block text-xs", checked ? "text-slate-200" : "text-slate-500")}>
                      {user.profile.designation}
                    </span>
                  </span>
                  <span className="rounded-full border border-current px-2 py-0.5 text-[11px] font-medium">
                    {checked ? "Selectionne" : "Ajouter"}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-2 py-3 text-xs text-slate-500">{emptyState}</p>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-900">Ordre de signature</p>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
            {selectedIds.length}
          </span>
        </div>

        {selectedSigners.length ? (
          <div className="space-y-2">
            {selectedSigners.map((user, index) => {
              if (!user) {
                return null;
              }

              const label = user.displayName || `${user.personne.nom} ${user.personne.prenom}`.trim();

              return (
                <div key={user.id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {index + 1}. {label}
                      </p>
                      <p className="text-xs text-slate-500">{user.profile.designation}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(user.id)}
                      className="rounded-full border border-rose-200 p-1 text-rose-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onMove(user.id, "up")}
                      disabled={index === 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      Monter
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(user.id, "down")}
                      disabled={index === selectedSigners.length - 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                      Descendre
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Selectionnez un ou plusieurs signataires pour definir leur ordre de visa.</p>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({
  children,
  complete
}: {
  children: ReactNode;
  complete: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
          complete ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
        )}
      >
        {complete ? "OK" : "?"}
      </span>
      <span>{children}</span>
    </div>
  );
}

function matchesDirectionSearch(direction: DepartementListItem, search: string) {
  const normalized = search.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return (
    direction.code.toLowerCase().includes(normalized) ||
    direction.designation.toLowerCase().includes(normalized)
  );
}

function matchesSignerSearch(user: User, search: string) {
  const normalized = search.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  const fullName = user.displayName || `${user.personne.nom} ${user.personne.prenom}`.trim();

  return (
    fullName.toLowerCase().includes(normalized) ||
    user.profile.designation.toLowerCase().includes(normalized) ||
    (user.email ?? "").toLowerCase().includes(normalized)
  );
}

function formatConfidentiality(level: (typeof confidentialityLevels)[number]) {
  return level.replace(/_/g, " ");
}

function SuccessDialog({
  createdDocument,
  onClose,
  onCreateAnother
}: {
  createdDocument: CreatedDocumentSummary;
  onClose: () => void;
  onCreateAnother: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <div className="w-full max-w-xl rounded-[28px] border border-[color:var(--border)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">Operation confirmee</p>
            <h2 className="mt-2 text-2xl font-semibold text-brand-navy">Document enregistre avec succes</h2>
            <p className="mt-2 text-sm text-slate-600">Le document et son classement initial ont ete confirmes.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 rounded-md border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reference</dt>
              <dd className="mt-1 text-sm font-semibold text-brand-navy">{createdDocument.reference}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Date de creation</dt>
              <dd className="mt-1 text-sm text-slate-700">{formatShortDate(createdDocument.createdAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Titre / objet</dt>
              <dd className="mt-1 text-sm text-slate-700">{createdDocument.title}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`/documents/${createdDocument.id}`}
            className="inline-flex h-9 items-center rounded-md bg-brand-navy px-4 text-sm font-medium text-white"
          >
            Consulter le document
          </a>
          <button
            type="button"
            onClick={onCreateAnother}
            className="inline-flex h-9 items-center rounded-md border border-[color:var(--border)] px-4 text-sm font-medium text-slate-700"
          >
            Creer un nouveau document
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border border-[color:var(--border)] px-4 text-sm font-medium text-slate-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function uniqueIds(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

const inputClassName =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500";

const textareaClassName =
  "min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500";
