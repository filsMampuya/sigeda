"use client";

import { type FormEvent, useState, useTransition } from "react";
import type { ArchiveFolderListItem, DepartementListItem } from "@sigeda/shared/types";
import { Plus, Search, Trash2, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatStructureLabel } from "@/lib/format";

type DocumentSearchFiltersProps = {
  q?: string;
  status?: string;
  year?: string;
  emitterDirectionId?: string;
  receiverDirectionId?: string;
  copyDirectionId?: string;
  directionScope?: "all" | "emitted" | "received";
  serviceId?: string;
  bureauId?: string;
  folderId?: string;
  reference?: string;
  referenceOperator?: CriterionOperator;
  subject?: string;
  subjectOperator?: CriterionOperator;
  type?: string;
  movementType?: string;
  signerName?: string;
  signerNameOperator?: CriterionOperator;
  confidentialityLevel?: string;
  annotationDirectionId?: string;
  annotationState?: "with" | "without";
  annotationDateFrom?: string;
  annotationDateTo?: string;
  createdDate?: string;
  dateField?: "createdAt" | "updatedAt";
  periodPreset?: "today" | "week" | "month" | "quarter" | "year" | "previousYear" | "custom";
  dateFrom?: string;
  dateTo?: string;
  directions?: DepartementListItem[];
  services?: DepartementListItem[];
  bureaux?: DepartementListItem[];
  folders?: ArchiveFolderListItem[];
  scopeItems?: Array<{
    key: string;
    label: string;
    value: string;
  }>;
};

type CriterionField =
  | "reference"
  | "subject"
  | "type"
  | "status"
  | "year"
  | "emitterDirectionId"
  | "receiverDirectionId"
  | "copyDirectionId"
  | "serviceId"
  | "bureauId"
  | "folderId"
  | "movementType"
  | "signerName"
  | "confidentialityLevel"
  | "createdDate";

type CriterionOperator = "contains" | "equals";

type Criterion = {
  id: string;
  field: CriterionField;
  operator: CriterionOperator;
  value: string;
};

const defaultCriterion: Criterion = {
  id: "criterion-1",
  field: "emitterDirectionId",
  operator: "equals",
  value: ""
};

export function DocumentSearchFilters({
  q,
  status,
  year,
  emitterDirectionId,
  receiverDirectionId,
  copyDirectionId,
  directionScope,
  serviceId,
  bureauId,
  folderId,
  reference,
  referenceOperator,
  subject,
  subjectOperator,
  type,
  movementType,
  signerName,
  signerNameOperator,
  confidentialityLevel,
  annotationDirectionId,
  annotationState,
  annotationDateFrom,
  annotationDateTo,
  createdDate,
  dateField,
  periodPreset,
  dateFrom,
  dateTo,
  directions = [],
  services = [],
  bureaux = [],
  folders = [],
  scopeItems = []
}: DocumentSearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(q ?? "");
  const [selectedDateField, setSelectedDateField] = useState(dateField ?? "updatedAt");
  const [selectedDirectionScope, setSelectedDirectionScope] = useState(directionScope ?? "all");
  const [selectedPeriodPreset, setSelectedPeriodPreset] = useState(periodPreset ?? "");
  const [selectedDateFrom, setSelectedDateFrom] = useState(dateFrom ?? "");
  const [selectedDateTo, setSelectedDateTo] = useState(dateTo ?? "");
  const [selectedAnnotationDirectionId, setSelectedAnnotationDirectionId] = useState(annotationDirectionId ?? "");
  const [selectedAnnotationState, setSelectedAnnotationState] = useState(annotationState ?? "");
  const [selectedAnnotationDateFrom, setSelectedAnnotationDateFrom] = useState(annotationDateFrom ?? "");
  const [selectedAnnotationDateTo, setSelectedAnnotationDateTo] = useState(annotationDateTo ?? "");
  const [criteria, setCriteria] = useState<Criterion[]>(() =>
    buildInitialCriteria({
      reference,
      referenceOperator,
      subject,
      subjectOperator,
      type,
      status,
      year,
      emitterDirectionId,
      receiverDirectionId,
      copyDirectionId,
      serviceId,
      bureauId,
      folderId,
      movementType,
      signerName,
      signerNameOperator,
      confidentialityLevel,
      createdDate
    })
  );
  const activeCriteria = criteria.filter((criterion) => criterion.value.trim());

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams(window.location.search);

    setOrDelete(params, "q", searchTerm);
    setOrDelete(params, "directionScope", selectedDirectionScope === "all" ? "" : selectedDirectionScope);
    setOrDelete(params, "dateField", selectedDateField);
    setOrDelete(params, "periodPreset", selectedPeriodPreset);
    setOrDelete(params, "dateFrom", selectedDateFrom);
    setOrDelete(params, "dateTo", selectedDateTo);
    setOrDelete(params, "annotationDirectionId", selectedAnnotationDirectionId);
    setOrDelete(params, "annotationState", selectedAnnotationState);
    setOrDelete(params, "annotationDateFrom", selectedAnnotationDateFrom);
    setOrDelete(params, "annotationDateTo", selectedAnnotationDateTo);
    params.delete("directionId");

    for (const key of supportedCriteriaFields) {
      params.delete(key);
      params.delete(`${key}Operator`);
    }

    for (const criterion of criteria) {
      if (!criterion.value.trim()) {
        continue;
      }

      setOrDelete(params, criterion.field, criterion.value);
      setOrDelete(
        params,
        `${criterion.field}Operator`,
        supportsAdvancedOperator(criterion.field) ? criterion.operator : ""
      );
    }

    params.set("page", "1");

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.replace(nextUrl);
    });
  }

  function reset() {
    setSearchTerm("");
    setSelectedDirectionScope("all");
    setSelectedDateField("updatedAt");
    setSelectedPeriodPreset("");
    setSelectedDateFrom("");
    setSelectedDateTo("");
    setSelectedAnnotationDirectionId("");
    setSelectedAnnotationState("");
    setSelectedAnnotationDateFrom("");
    setSelectedAnnotationDateTo("");
    setCriteria([]);
    startTransition(() => {
      router.replace(pathname);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="space-y-4 p-4">
        {scopeItems.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {scopeItems.map((item) => (
              <span
                key={item.key}
                className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {item.label}: {item.value}
              </span>
            ))}
          </div>
        ) : null}

        <div className="rounded-[20px] border border-slate-200 bg-[color:var(--panel)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Recherche</p>
              <h2 className="text-sm font-semibold text-brand-navy">Recherche documentaire</h2>
              <p className="text-sm text-slate-600">
                Recherche avancee par base de donnees. La recherche rapide locale reste disponible directement dans le tableau.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                Recherche globale: {searchTerm.trim() ? "active" : "vide"}
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                Criteres: {activeCriteria.length}
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                Periode: {selectedPeriodPreset || "aucune"}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500"
                placeholder="Recherche avancee cote base"
              />
            </div>
            <select
              value={selectedDirectionScope}
              onChange={(event) => setSelectedDirectionScope(event.target.value as "all" | "emitted" | "received")}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="all">Tous</option>
              <option value="emitted">Emis</option>
              <option value="received">Recus</option>
            </select>
            <button
              type="button"
              onClick={() =>
                setCriteria((current) => [
                  ...current,
                  {
                    ...defaultCriterion,
                    id: `criterion-${crypto.randomUUID()}`
                  }
                ])
              }
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700"
            >
              <Plus className="h-4 w-4" />
              Ajouter un critere
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700"
            >
              <X className="h-4 w-4" />
              Reinitialiser
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-10 rounded-xl bg-brand-navy px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {isPending ? "Recherche..." : "Lancer la recherche"}
            </button>
          </div>

          {activeCriteria.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeCriteria.map((criterion) => (
                <span
                  key={criterion.id}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {getCriterionLabel(criterion.field)}: {getCriterionValueSummary(criterion)}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Periode</p>
            <p className="text-sm text-slate-600">
              Interroge PostgreSQL sur les dates techniques sans surcharger la recherche locale.
            </p>
          </div>
          <div className="grid gap-3 xl:grid-cols-4">
            <select
              value={selectedDateField}
              onChange={(event) => setSelectedDateField(event.target.value as "createdAt" | "updatedAt")}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="updatedAt">Date de mise a jour</option>
              <option value="createdAt">Date de creation</option>
            </select>
            <select
              value={selectedPeriodPreset}
              onChange={(event) => setSelectedPeriodPreset(event.target.value as typeof selectedPeriodPreset)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="">Aucune periode</option>
              <option value="today">Aujourd&apos;hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette annee</option>
              <option value="previousYear">Annee precedente</option>
              <option value="custom">Periode personnalisee</option>
            </select>
            {selectedPeriodPreset === "custom" ? (
              <>
                <input
                  type="date"
                  value={selectedDateFrom}
                  onChange={(event) => setSelectedDateFrom(event.target.value)}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                />
                <input
                  type="date"
                  value={selectedDateTo}
                  onChange={(event) => setSelectedDateTo(event.target.value)}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
                />
              </>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Annotations</p>
            <p className="text-sm text-slate-600">
              Cible les documents annotes par direction et les documents attendus sans retour d&apos;annotation.
            </p>
          </div>
          <div className="grid gap-3 xl:grid-cols-4">
            <SearchableSelect
              value={selectedAnnotationDirectionId}
              onValueChange={setSelectedAnnotationDirectionId}
              placeholder="Direction annotatrice"
              options={directions.map((direction) => ({
                value: direction.id,
                label: formatStructureLabel(direction.code, direction.designation)
              }))}
            />
            <select
              value={selectedAnnotationState}
              onChange={(event) => setSelectedAnnotationState(event.target.value as "with" | "without" | "")}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
            >
              <option value="">Tous les documents</option>
              <option value="with">Avec annotation</option>
              <option value="without">Sans annotation</option>
            </select>
            <input
              type="date"
              value={selectedAnnotationDateFrom}
              onChange={(event) => setSelectedAnnotationDateFrom(event.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
            />
            <input
              type="date"
              value={selectedAnnotationDateTo}
              onChange={(event) => setSelectedAnnotationDateTo(event.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Recherche avancee
              </p>
              <p className="text-sm text-slate-600">
                Ajoutez uniquement les filtres utiles au cas de recherche en cours.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {criteria.length} critere{criteria.length > 1 ? "s" : ""}
            </span>
          </div>

          {criteria.length === 0 ? <p className="text-sm text-slate-500">Aucun critere avance actif.</p> : null}

          {criteria.map((criterion, index) => (
            <div key={criterion.id} className="rounded-2xl border border-slate-200 bg-[color:var(--panel)] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Critere {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => setCriteria((current) => current.filter((item) => item.id !== criterion.id))}
                  className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
                  aria-label={`Supprimer le critere ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                  Retirer
                </button>
              </div>
              <div className="grid gap-2.5 xl:grid-cols-[1fr_0.8fr_minmax(0,1fr)]">
              <select
                value={criterion.field}
                onChange={(event) =>
                  setCriteria((current) =>
                    current.map((item) =>
                      item.id === criterion.id
                        ? {
                            ...item,
                            field: event.target.value as CriterionField,
                            operator: getDefaultOperator(event.target.value as CriterionField),
                            value: ""
                          }
                        : item
                    )
                  )
                }
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
              >
                {criterionFieldOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={criterion.operator}
                onChange={(event) =>
                  setCriteria((current) =>
                    current.map((item) =>
                      item.id === criterion.id
                        ? { ...item, operator: event.target.value as CriterionOperator }
                        : item
                    )
                  )
                }
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
              >
                {getOperatorOptions(criterion.field).map((operator) => (
                  <option key={operator.value} value={operator.value}>
                    {operator.label}
                  </option>
                ))}
              </select>

              {renderCriterionValueInput({
                criterion,
                directions,
                services,
                bureaux,
                folders,
                onChange: (value) =>
                  setCriteria((current) =>
                    current.map((item) => (item.id === criterion.id ? { ...item, value } : item))
                  )
              })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </form>
  );
}

function renderCriterionValueInput(input: {
  criterion: Criterion;
  directions: DepartementListItem[];
  services: DepartementListItem[];
  bureaux: DepartementListItem[];
  folders: ArchiveFolderListItem[];
  onChange: (value: string) => void;
}) {
  const { criterion, directions, services, bureaux, folders, onChange } = input;

  if (
    criterion.field === "emitterDirectionId" ||
    criterion.field === "receiverDirectionId" ||
    criterion.field === "copyDirectionId"
  ) {
    return (
      <SearchableSelect
        value={criterion.value}
        onValueChange={onChange}
        placeholder="Selectionner une direction"
        options={directions.map((direction) => ({
          value: direction.id,
          label: formatStructureLabel(direction.code, direction.designation)
        }))}
      />
    );
  }

  if (criterion.field === "serviceId") {
    return (
      <SearchableSelect
        value={criterion.value}
        onValueChange={onChange}
        placeholder="Selectionner un service"
        options={services.map((service) => ({
          value: service.id,
          label: formatStructureLabel(service.code, service.designation)
        }))}
      />
    );
  }

  if (criterion.field === "bureauId") {
    return (
      <SearchableSelect
        value={criterion.value}
        onValueChange={onChange}
        placeholder="Selectionner un bureau"
        options={bureaux.map((bureau) => ({
          value: bureau.id,
          label: formatStructureLabel(bureau.code, bureau.designation)
        }))}
      />
    );
  }

  if (criterion.field === "folderId") {
    return (
      <SearchableSelect
        value={criterion.value}
        onValueChange={onChange}
        placeholder="Selectionner un classeur"
        options={folders.map((folder) => ({
          value: folder.id,
          label: `${folder.year} - ${formatStructureLabel(folder.partnerDirectionCode, folder.partnerDirectionName, folder.id)}`
        }))}
      />
    );
  }

  if (criterion.field === "status") {
    return (
      <select
        value={criterion.value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
      >
        <option value="">Selectionner un statut</option>
        <option value="BROUILLON">Brouillon</option>
        <option value="EN_VALIDATION">En validation</option>
        <option value="VALIDE">Valide</option>
        <option value="ARCHIVE">Archive</option>
        <option value="REJETE">Rejete</option>
      </select>
    );
  }

  if (criterion.field === "movementType") {
    return (
      <select
        value={criterion.value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
      >
        <option value="">Selectionner un mouvement</option>
        <option value="ENTREE">ENTREE</option>
        <option value="SORTIE">SORTIE</option>
      </select>
    );
  }

  if (criterion.field === "confidentialityLevel") {
    return (
      <select
        value={criterion.value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
      >
        <option value="">Selectionner un niveau</option>
        <option value="PUBLIC">Public</option>
        <option value="INTERNE">Interne</option>
        <option value="CONFIDENTIEL">Confidentiel</option>
        <option value="SECRET">Secret</option>
        <option value="TRES_SECRET">Tres secret</option>
      </select>
    );
  }

  if (criterion.field === "createdDate") {
    return (
      <input
        type="date"
        value={criterion.value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500"
      />
    );
  }

  return (
    <input
      value={criterion.value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500"
      inputMode={criterion.field === "year" ? "numeric" : undefined}
      placeholder={getValuePlaceholder(criterion.field)}
    />
  );
}

function buildInitialCriteria(values: Record<string, string | undefined>) {
  const criteria: Criterion[] = [];

  for (const field of supportedCriteriaFields) {
    const value = values[field];

    if (!value) {
      continue;
    }

    criteria.push({
      id: `criterion-${field}`,
      field,
      operator: normalizeCriterionOperator(values[`${field}Operator`], field),
      value
    });
  }

  return criteria;
}

function getDefaultOperator(field: CriterionField): CriterionOperator {
  if (field === "reference" || field === "subject" || field === "signerName") {
    return "contains";
  }

  return "equals";
}

function getOperatorOptions(field: CriterionField) {
  if (field === "reference" || field === "subject" || field === "signerName") {
    return [
      { value: "contains", label: "contient" },
      { value: "equals", label: "egal a" }
    ];
  }

  return [{ value: "equals", label: "egal a" }];
}

function getValuePlaceholder(field: CriterionField) {
  switch (field) {
    case "reference":
      return "Ex: DFA-2026";
    case "subject":
      return "Objet du document";
    case "year":
      return "Ex: 2026";
    case "type":
      return "Ex: COURRIER";
    case "signerName":
      return "Nom du signataire";
    default:
      return "Valeur";
  }
}

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (value.trim()) {
    params.set(key, value.trim());
  } else {
    params.delete(key);
  }
}

function getCriterionLabel(field: CriterionField) {
  return criterionFieldOptions.find((option) => option.value === field)?.label ?? field;
}

function getCriterionValueSummary(criterion: Criterion) {
  return criterion.value.trim() || "-";
}

function normalizeCriterionOperator(value: string | undefined, field: CriterionField): CriterionOperator {
  if (supportsAdvancedOperator(field) && (value === "contains" || value === "equals")) {
    return value;
  }

  return getDefaultOperator(field);
}

function supportsAdvancedOperator(field: CriterionField) {
  return field === "reference" || field === "subject" || field === "signerName";
}

const supportedCriteriaFields: CriterionField[] = [
  "reference",
  "subject",
  "type",
  "status",
  "year",
  "emitterDirectionId",
  "receiverDirectionId",
  "copyDirectionId",
  "serviceId",
  "bureauId",
  "folderId",
  "movementType",
  "signerName",
  "confidentialityLevel",
  "createdDate"
];

const criterionFieldOptions: Array<{ value: CriterionField; label: string }> = [
  { value: "reference", label: "Reference" },
  { value: "subject", label: "Objet" },
  { value: "year", label: "Annee" },
  { value: "type", label: "Type de document" },
  { value: "status", label: "Statut" },
  { value: "confidentialityLevel", label: "Confidentialite" },
  { value: "emitterDirectionId", label: "Direction emettrice" },
  { value: "receiverDirectionId", label: "Direction destinataire" },
  { value: "copyDirectionId", label: "Direction en copie" },
  { value: "movementType", label: "Mouvement" },
  { value: "serviceId", label: "Service" },
  { value: "bureauId", label: "Bureau" },
  { value: "folderId", label: "Classeur" },
  { value: "signerName", label: "Signataire" },
  { value: "createdDate", label: "Date de creation" }
];
