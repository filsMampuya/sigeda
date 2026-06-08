import type {
  auditActions,
  confidentialityLevels,
  departementTypes,
  digitizationStatuses,
  documentStatuses,
  documentFileKinds,
  documentTypes,
  movementTypes,
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
export type MovementType = (typeof movementTypes)[number];
export type ArchiveFolderStatus = "ACTIVE" | "ARCHIVED";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

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
  id?: string;
  type?: DepartementType;
  code: string;
  designation: string;
}

export interface Departement {
  id: string;
  type: DepartementType;
  code: string;
  designation: string;
  parent?: {
    code: string;
    designation: string;
  } | null;
  parents: string[];
  dateCreation: number;
  dateDerniereModification: number;
  description?: string;
  updatedAt?: string | number;
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

export interface UserProfile {
  code: string;
  designation: string;
}

export interface User {
  id: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
  updatedAt?: string | number;
  personne: UserPersonne;
  profile: UserProfile;
  matricule: string;
  bureau?: DepartementReference | null;
  dateCreation: number;
  dateDerniereModification: number;
  directionId?: string | null;
  serviceId?: string | null;
  bureauId?: string | null;
  displayName?: string;
}

export interface PhysicalArchive {
  id: string;
  documentArchiveId?: string;
  documentId: string;
  directionId?: string;
  partnerDirectionId?: string;
  year?: number;
  folderId?: string;
  movementType?: MovementType;
  section?: MovementType;
  site: string;
  batiment: string;
  salle: string;
  rayon: string;
  etagere: string;
  classeur: string;
  dossier: string;
  boiteArchive: string;
  classementKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhysicalArchiveListItem extends PhysicalArchive {
  documentReference: string;
  documentTitle: string;
  bureauId?: string;
  directionCode?: string;
  directionName?: string;
  bureauCode?: string;
  bureauName?: string;
  partnerDirectionCode?: string;
  partnerDirectionName?: string;
  partnerDirectionCodes: string[];
  partnerDirectionNames: string[];
  documentStatus?: DocumentStatus;
  folderStatus?: ArchiveFolderStatus;
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

export interface DocumentAttachment {
  id: string;
  name: string;
  fileUrl?: string;
  filePath?: string;
  mimeType?: string;
}

export interface AIExtractedData {
  reference?: string;
  year?: number;
  referenceNumber?: number;
  referenceCode?: string;
  subject?: string;
  documentDate?: string;
  emitterDirectionId?: string;
  receiverDirectionIds?: string[];
  copyDirectionIds?: string[];
  documentType?: DocumentType | string;
  signerName?: string;
  confidentialityLevel?: ConfidentialityLevel;
  summary?: string;
  keywords?: string[];
  dossierNumber?: string;
  classementNumber?: string;
}

export interface DocumentEntity {
  id: string;
  numeroReference: string;
  year: number;
  referenceNumber: number;
  referenceCode: string;
  dateCreation: string | number;
  user: DocumentUserReference;
  type: DocumentType | string;
  direction: DocumentDirectionReference;
  dateDerniereModication: string | number;
  reference?: string;
  fileName?: string;
  urlFileName?: string;
  title?: string;
  subject?: string;
  description?: string;
  summary?: string;
  directionId?: string;
  serviceId?: string;
  bureauId?: string;
  authorId?: string;
  authorName?: string;
  signerId?: string;
  signerName?: string;
  emitterDirectionId?: string;
  receiverDirectionIds: string[];
  copyDirectionIds: string[];
  confidentialityLevel?: ConfidentialityLevel;
  status?: DocumentStatus;
  keywords: string[];
  physicalArchiveId?: string;
  version: number;
  attachments: DocumentAttachment[];
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
  fileUrl?: string;
  filePath?: string;
  aiExtractedData?: AIExtractedData;
}

export interface DocumentArchive {
  id: string;
  year: number;
  documentId: string;
  ownerDirectionId?: string;
  directionId?: string;
  serviceId?: string;
  bureauId?: string;
  folderId?: string;
  movementType: MovementType;
  archivedAt: string;
  archivedBy: string;
  archiveFolderId?: string;
}

export interface DocumentArchiveListItem extends DocumentArchive {
  documentReference: string;
  documentTitle: string;
  referenceNumber?: number;
  emitterDirectionCode?: string;
  emitterDirectionName?: string;
  currentDirectionCode?: string;
  currentDirectionName?: string;
  folderStatus?: ArchiveFolderStatus;
  partnerDirectionIds: string[];
  partnerDirectionCodes: string[];
  partnerDirectionNames: string[];
  documentCreatedAt: string;
  documentStatus?: DocumentStatus;
  confidentialityLevel?: ConfidentialityLevel;
}

export interface ArchiveFolder {
  id: string;
  year: number;
  bureauId: string;
  accessibleBureauIds?: string[];
  ownerDirectionId: string;
  directionId?: string;
  partnerDirectionId: string;
  createdAt: string;
  status: ArchiveFolderStatus;
}

export interface ArchiveFolderListItem extends ArchiveFolder {
  section?: MovementType;
  ownerDirectionCode?: string;
  ownerDirectionName?: string;
  partnerDirectionCode?: string;
  partnerDirectionName?: string;
  bureauCode?: string;
  bureauName?: string;
  accessibleBureauCodes?: string[];
  accessibleBureauNames?: string[];
  archiveCount: number;
  latestArchivedAt?: string;
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
