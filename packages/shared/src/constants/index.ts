export const roles = [
  "ADMIN",
  "DIRECTION_GENERALE",
  "DIRECTEUR",
  "CHEF_SERVICE",
  "CHEF_BUREAU",
  "AGENT",
  "ARCHIVISTE",
  "AUDITEUR"
] as const;

export const departementTypes = ["DirectionGenerale", "Direction", "Service", "Bureau"] as const;

export type Role = (typeof roles)[number];
export function isRole(value: string): value is Role {
  return (roles as readonly string[]).includes(value);
}

export const documentTypes = [
  "COURRIER",
  "NOTE",
  "RAPPORT",
  "PV_REUNION",
  "DECISION",
  "CONTRAT",
  "DOSSIER_TECHNIQUE",
  "DOCUMENT_ADMINISTRATIF",
  "DOCUMENT_FINANCIER",
  "DOCUMENT_PRODUCTION",
  "DOCUMENT_SECURITE",
  "AUTRE"
] as const;

export const confidentialityLevels = [
  "PUBLIC",
  "INTERNE",
  "CONFIDENTIEL",
  "SECRET",
  "TRES_SECRET"
] as const;

export const documentStatuses = [
  "BROUILLON",
  "EN_VALIDATION",
  "VALIDE",
  "ARCHIVE",
  "REJETE"
] as const;

export const auditActions = [
  "CREATE_DOCUMENT",
  "UPDATE_DOCUMENT",
  "DELETE_DOCUMENT",
  "VIEW_DOCUMENT",
  "DOWNLOAD_DOCUMENT",
  "ARCHIVE_DOCUMENT",
  "VALIDATE_DOCUMENT",
  "REJECT_DOCUMENT",
  "LOGIN",
  "LOGOUT"
] as const;

export const documentFileKinds = ["PDF", "IMAGE", "OTHER"] as const;

export const digitizationStatuses = [
  "NOT_STARTED",
  "UPLOADED",
  "PROCESSING_OCR",
  "DIGITIZED",
  "FAILED"
] as const;

export const ocrStatuses = ["NOT_APPLICABLE", "PENDING", "COMPLETED", "FAILED"] as const;
