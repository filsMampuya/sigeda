import type {
  auditActions,
  confidentialityLevels,
  departementTypes,
  digitizationStatuses,
  documentStatuses,
  documentFileKinds,
  documentTypes,
  departmentTypes,
  folderStatuses,
  movementTypes,
  onPremiseRoles,
  ocrStatuses,
  roles
} from "../constants/index.js";

export type Role = (typeof roles)[number];
export type OnPremiseRole = (typeof onPremiseRoles)[number];
export type DepartementType = (typeof departementTypes)[number];
export type DepartmentType = (typeof departmentTypes)[number];
export type DocumentType = (typeof documentTypes)[number];
export type ConfidentialityLevel = (typeof confidentialityLevels)[number];
export type DocumentStatus = (typeof documentStatuses)[number];
export type AuditAction = (typeof auditActions)[number];
export type DocumentFileKind = (typeof documentFileKinds)[number];
export type DigitizationStatus = (typeof digitizationStatuses)[number];
export type OcrStatus = (typeof ocrStatuses)[number];
export type MovementType = (typeof movementTypes)[number];
export type ArchiveFolderStatus = "ACTIVE" | "ARCHIVED";
export type FolderStatus = (typeof folderStatuses)[number];
export type AnnotationStatus = "PENDING" | "APPLIED" | "DISMISSED";

export interface Department {
  id: string;
  code: string;
  designation: string;
  type: DepartmentType;
  parentId?: string | null;
  directionId?: string | null;
  serviceId?: string | null;
  createdAt: string | number;
  updatedAt: string | number;
}

export interface Folder {
  id: string;
  year: number;
  bureauId: string;
  ownerDirectionId: string;
  partnerDirectionId: string;
  status: FolderStatus;
  createdAt: string | number;
  updatedAt: string | number;
}

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
  directionId?: string | null;
  serviceId?: string | null;
}

export interface Departement {
  id: string;
  type: DepartementType;
  code: string;
  designation: string;
  directionId?: string | null;
  serviceId?: string | null;
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
  directionDesignation?: string | null;
  serviceDesignation?: string | null;
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

export interface ArchiveAnnotationAttachment {
  name: string;
  fileUrl?: string;
  filePath?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface DocumentSigner {
  userId?: string;
  fullName: string;
  functionTitle?: string;
  departmentId: string;
  departmentType: DepartmentType;
  signingOrder?: number;
}

export interface DocumentVersionRecord {
  id: string;
  documentId: string;
  version: number;
  changeSummary?: string;
  sourceAnnotationIds: string[];
  createdById: string;
  createdByName?: string;
  createdAt: string;
}

export interface DocumentAnnotationRecord {
  id: string;
  documentId: string;
  documentVersionId: string;
  documentVersionNumber: number;
  sourceDirectionId: string;
  sourceDirectionCode?: string;
  sourceDirectionName?: string;
  recordedByDirectionId: string;
  recordedByDirectionCode?: string;
  recordedByDirectionName?: string;
  createdByUserId: string;
  createdByUserName?: string;
  status: AnnotationStatus;
  content: string;
  attachment?: ArchiveAnnotationAttachment;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentAnnotationReportMetric {
  directionId: string;
  code?: string;
  name?: string;
  count: number;
}

export interface DocumentAnnotationReport {
  totalDocuments: number;
  annotatedDocuments: number;
  unannotatedDocuments: number;
  topEmitterDirections: DocumentAnnotationReportMetric[];
  topAnnotatingDirections: DocumentAnnotationReportMetric[];
}

export interface DocumentTransmissionRecord {
  id: string;
  documentId: string;
  documentVersionId: string;
  documentVersionNumber: number;
  targetDirectionId: string;
  targetDirectionCode?: string;
  targetDirectionName?: string;
  kind: "RECEIVER" | "COPY";
  sentByUserId: string;
  sentByUserName?: string;
  sentAt: string;
  respondedAt?: string;
}

export interface DocumentTimelineEvent {
  id: string;
  type: "VERSION_CREATED" | "TRANSMISSION_SENT" | "ANNOTATION_CREATED" | "DOCUMENT_CREATED" | "DOCUMENT_VALIDATED";
  documentId: string;
  documentVersionNumber: number;
  label: string;
  description: string;
  actorName?: string;
  directionName?: string;
  createdAt: string;
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
  signers?: DocumentSigner[];
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
  signers?: DocumentSigner[];
  emitterDirectionId?: string;
  receiverDirectionIds: string[];
  copyDirectionIds: string[];
  receiverDirectionNames?: string[];
  copyDirectionNames?: string[];
  movementType?: MovementType;
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
  archiveFolders?: Array<{
    id: string;
    bureauId: string;
    folderId: string;
    ownerDirectionId?: string;
    ownerDirectionCode?: string;
    ownerDirectionName?: string;
    partnerDirectionId?: string;
    movementType: MovementType;
    archivedAt: string;
  }>;
  canClassify?: boolean;
  currentDirectionMovement?: MovementType;
  currentDirectionArchivedAt?: string;
  annotations?: DocumentAnnotationRecord[];
  versionsHistory?: DocumentVersionRecord[];
  transmissions?: DocumentTransmissionRecord[];
  timeline?: DocumentTimelineEvent[];
  pendingResponseDirectionIds?: string[];
  pendingResponseDirectionNames?: string[];
  respondedDirectionIds?: string[];
  respondedDirectionNames?: string[];
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
  updatedAt?: string;
  archivedBy: string;
  archiveFolderId?: string;
  annotationCount?: number;
}

export interface DocumentArchiveListItem extends DocumentArchive {
  documentReference: string;
  documentTitle: string;
  referenceNumber?: number;
  emitterDirectionCode?: string;
  emitterDirectionName?: string;
  currentDirectionCode?: string;
  currentDirectionName?: string;
  bureauCode?: string;
  bureauName?: string;
  folderStatus?: ArchiveFolderStatus;
  partnerDirectionIds: string[];
  partnerDirectionCodes: string[];
  partnerDirectionNames: string[];
  documentCreatedAt: string;
  documentStatus?: DocumentStatus;
  confidentialityLevel?: ConfidentialityLevel;
  hasAnnotations?: boolean;
  annotationDirectionIds?: string[];
  latestAnnotationAt?: string;
  canArchive?: boolean;
}

export interface DocumentArchiveDetails extends DocumentArchiveListItem {
  folderLabel?: string;
  bureauCode?: string;
  bureauName?: string;
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
  updatedAt: string;
  status: ArchiveFolderStatus;
}

export interface ArchiveFolderListItem extends ArchiveFolder {
  ownerDirectionCode?: string;
  ownerDirectionName?: string;
  partnerDirectionCode?: string;
  partnerDirectionName?: string;
  bureauCode?: string;
  bureauName?: string;
  accessibleBureauCodes?: string[];
  accessibleBureauNames?: string[];
  archiveCount: number;
  entryArchiveCount: number;
  outputArchiveCount: number;
  sectionsUsed: "AUCUNE" | "ENTREE" | "SORTIE" | "ENTREE_SORTIE";
  latestArchivedAt?: string;
}

export interface ArchiveFolderDocumentListItem {
  archiveId: string;
  documentId: string;
  folderId?: string;
  movementType: MovementType;
  archivedAt: string;
  reference: string;
  referenceNumber: number;
  title: string;
  subject?: string;
  createdAt: string;
  emitterDirectionId: string;
  emitterDirectionCode?: string;
  emitterDirectionName?: string;
  receiverDirectionNames: string[];
  copyDirectionNames: string[];
  signers: Array<{
    fullName: string;
    functionTitle?: string;
    signingOrder?: number;
  }>;
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
