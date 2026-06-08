import type { ArchiveFolderStatus, Departement, DocumentEntity, MovementType } from "@sigeda/shared/types";

export function buildFolderId(params: {
  year: number;
  bureauId: string;
  ownerDirectionId: string;
  partnerDirectionId: string;
}) {
  return `${params.year}__${params.bureauId}__${params.ownerDirectionId}__${params.partnerDirectionId}`;
}

export function parseFolderId(folderId: string) {
  const parts = folderId.split("__");

  if (parts.length >= 5) {
    return {
      year: Number.parseInt(parts[0] ?? "", 10),
      bureauId: parts[1] ?? "NO_BUREAU",
      ownerDirectionId: parts[2] ?? "UNKNOWN_OWNER",
      partnerDirectionId: parts[3] ?? "UNKNOWN_PARTNER",
      legacySection: isMovementType(parts[4]) ? parts[4] : undefined
    };
  }

  return {
    year: Number.parseInt(parts[0] ?? "", 10),
    bureauId: parts[1] ?? "NO_BUREAU",
    ownerDirectionId: parts[2] ?? "UNKNOWN_OWNER",
    partnerDirectionId: parts[3] ?? "UNKNOWN_PARTNER",
    legacySection: undefined
  };
}

export function normalizeFolderStatus(status?: string | null): ArchiveFolderStatus {
  return status === "CLOSED" || status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
}

export function resolveOwnerDirectionFromBureau(
  bureauId: string | undefined,
  departements: Departement[]
) {
  if (!bureauId) {
    return null;
  }

  const bureau = departements.find((departement) => departement.id === bureauId);

  if (!bureau) {
    return null;
  }

  const serviceCode = bureau.parent?.code;
  const service = departements.find((departement) => departement.code === serviceCode);
  const directionCode = service?.parent?.code;
  return departements.find((departement) => departement.code === directionCode) ?? null;
}

export function resolveArchivePlan(document: DocumentEntity, departements: Departement[]) {
  const ownerDirection = resolveOwnerDirectionFromBureau(document.bureauId, departements);
  const ownerDirectionId = ownerDirection?.id ?? document.directionId ?? document.emitterDirectionId ?? null;

  if (!ownerDirectionId || !document.bureauId) {
    return null;
  }

  const receiverPartners = uniqueStrings([...document.receiverDirectionIds, ...document.copyDirectionIds]);

  if (ownerDirectionId === document.emitterDirectionId) {
    return {
      ownerDirectionId,
      bureauId: document.bureauId,
      movementType: "SORTIE" as const,
      partnerDirectionIds: receiverPartners
    };
  }

  if (receiverPartners.includes(ownerDirectionId) && document.emitterDirectionId) {
    return {
      ownerDirectionId,
      bureauId: document.bureauId,
      movementType: "ENTREE" as const,
      partnerDirectionIds: [document.emitterDirectionId]
    };
  }

  return null;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isMovementType(value?: string): value is MovementType {
  return value === "ENTREE" || value === "SORTIE";
}
