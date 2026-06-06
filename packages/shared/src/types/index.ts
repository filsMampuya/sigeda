import type {
  auditActions,
  confidentialityLevels,
  departementTypes,
  digitizationStatuses,
  documentStatuses,
  documentFileKinds,
  documentTypes,
  ocrStatuses,
  roles
} from "../constants";

export type Role = (typeof roles)[number];
export type DepartementType = (typeof departementTypes)[number];
export type DocumentType = (typeof documentTypes)[number];
export type ConfidentialityLevel = (typeof confidentialityLevels)[number];
export type DocumentStatus = (typeof documentStatuses)[number];
export type AuditAction = (typeof auditActions)[number];
export type DocumentFileKind = (typeof documentFileKinds)[number];
export type DigitizationStatus = (typeof digitizationStatuses)[number];
export type OcrStatus = (typeof ocrStatuses)[number];

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  directionId: string | null;
  serviceId: string | null;
  bureauId: string | null;
}

export interface DepartementReference {
  id: string;
  type: DepartementType;
  code: string;
  designation: string;
}

export interface Departement {
  id: string;
  type: DepartementType;
  code: string;
  designation: string;
  parents: string[];
  dateCreation: string;
  description?: string;
  updatedAt?: string;
}

export interface DepartementListItem extends Departement {
  parentId?: string | null;
  parentDesignation?: string | null;
}

export type Direction = Departement;
export type Service = Departement;
export type Bureau = Departement;

export interface UserPersonne {
  nom: string;
  prenom: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  updatedAt: string;
  personne: UserPersonne;
  matricule: string;
  bureau?: DepartementReference | null;
  dateCreation: string;
  directionId?: string | null;
  serviceId?: string | null;
  bureauId?: string | null;
  displayName?: string;
}

export interface PhysicalArchive {
  id: string;
  documentId: string;
  site: string;
  batiment: string;
  salle: string;
  rayon: string;
  etagere: string;
  classeur: string;
  dossier: string;
  boiteArchive: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentUserReference {
  id?: string;
  nom: string;
  prenom: string;
  matricule: string;
  email?: string;
}

export interface DocumentDirectionReference {
  id?: string;
  code: string;
  designation: string;
}

export interface DocumentEntity {
  id: string;
  numeroReference: string;
  dateCreation: string;
  user: DocumentUserReference;
  type: DocumentType | string;
  direction: DocumentDirectionReference;
  dateDerniereModication: string;
  fileName?: string;
  urlFileName?: string;
  title?: string;
  description?: string;
  directionId?: string;
  serviceId?: string;
  bureauId?: string;
  authorId?: string;
  confidentialityLevel?: ConfidentialityLevel;
  status?: DocumentStatus;
  keywords: string[];
  physicalArchiveId?: string;
  version: number;
  originalFileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  storageProvider?: "LOCAL" | "FIREBASE_STORAGE";
  fileKind?: DocumentFileKind;
  digitizationStatus?: DigitizationStatus;
  ocrStatus?: OcrStatus;
  ocrText?: string;
  ocrExtractedAt?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  ipAddress?: string;
  createdAt: string;
}
