import type {
  ArchiveFolder,
  ArchiveFolderDocumentListItem,
  ArchiveFolderListItem,
  AuthenticatedUser,
  AuditLog,
  Department,
  Departement,
  DocumentAnnotationRecord,
  DocumentAnnotationReport,
  DocumentArchiveDetails,
  DocumentArchiveListItem,
  DocumentAttachment,
  DocumentEntity,
  DocumentSigner,
  DocumentTimelineEvent,
  DocumentTransmissionRecord,
  DocumentVersionRecord,
  PaginatedResult,
  User
} from "@sigeda/shared/types";

import { getServerAuthToken } from "@/lib/auth";
import { getServerApiBaseUrl, getServerOnPremiseApiBaseUrl } from "@/lib/env";

export type DashboardStats = {
  totalDocuments: number;
  documentsByDirection: Array<{ key: string; label?: string; count: number }>;
  documentsByService: Array<{ key: string; label?: string; count: number }>;
  documentsByBureau: Array<{ key: string; label?: string; count: number }>;
  confidentialDocuments: number;
  archivedDocuments: number;
  pendingValidation: number;
  annotatedDocuments?: number;
  versionedDocuments?: number;
  topAnnotatingDirections?: Array<{ key: string; label?: string; count: number }>;
  averageVersionsBeforeValidation?: number;
  recentActivity: AuditLog[];
  digitizationRate: number;
  mostViewedDocuments: Array<{ id: string; reference: string; title: string }>;
};

const defaultBaseUrl = getServerApiBaseUrl();
const defaultOnPremiseBaseUrl = getServerOnPremiseApiBaseUrl();

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getResponseMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown; issues?: Array<{ message?: string }> };

    const issueMessage = body.issues?.find((issue) => issue.message)?.message;
    if (issueMessage) {
      return issueMessage;
    }

    if (typeof body.message === "string") {
      return body.message;
    }
  } catch {
    // The API may return an empty or non-JSON response.
  }

  return `API request failed with status ${response.status}.`;
}

async function fetchApi<T>(path: string): Promise<T | null> {
  return fetchApiFromBase<T>(defaultBaseUrl, path);
}

async function fetchOnPremiseApi<T>(path: string): Promise<T | null> {
  return fetchApiFromBase<T>(defaultOnPremiseBaseUrl, path);
}

async function fetchApiFromBase<T>(baseUrl: string, path: string): Promise<T | null> {
  try {
    const authToken = getServerAuthToken();
    const response = await fetch(`${baseUrl}${path}`, {
      headers: authToken
        ? {
            Authorization: `Bearer ${authToken}`
          }
        : undefined,
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function postApi<TInput, TOutput>(path: string, body: TInput): Promise<TOutput | null> {
  return postApiToBase<TInput, TOutput>(defaultBaseUrl, path, body);
}

async function postOnPremiseApi<TInput, TOutput>(path: string, body: TInput): Promise<TOutput | null> {
  return postApiToBase<TInput, TOutput>(defaultOnPremiseBaseUrl, path, body);
}

async function postApiToBase<TInput, TOutput>(baseUrl: string, path: string, body: TInput): Promise<TOutput | null> {
  const authToken = getServerAuthToken();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new ApiError(response.status, await getResponseMessage(response));
  }

  return (await response.json()) as TOutput;
}

export function getDashboardStats() {
  return fetchOnPremiseApi<DashboardStats>("/dashboard/stats");
}

export function getCurrentUser() {
  return fetchOnPremiseApi<{ user: AuthenticatedUser | null }>("/auth/me");
}

export function getUsers(searchParams?: URLSearchParams) {
  return getMappedUsers(searchParams);
}

export function getDocuments(searchParams?: URLSearchParams) {
  return getMappedDocuments().then((documents) => filterDocuments(documents, searchParams));
}

export function searchDocuments(searchParams?: URLSearchParams) {
  const query = searchParams?.toString();
  const path = query ? `/search/documents?${query}` : "/search/documents";
  return fetchOnPremiseApi<PaginatedResult<DocumentEntity>>(path);
}

export function getRecentDocuments(searchParams?: URLSearchParams) {
  const params = new URLSearchParams(searchParams?.toString() ?? "");
  params.set("sortBy", params.get("sortBy") ?? "updatedAt");
  params.set("sortDir", params.get("sortDir") ?? "desc");
  params.set("page", params.get("page") ?? "1");
  params.set("pageSize", params.get("pageSize") ?? "10");
  return searchDocuments(params);
}

export function getDocumentById(id: string) {
  return fetchOnPremiseApi<OnPremiseDocument>(`/documents/${id}`).then((document) => mapOnPremiseDocumentToLegacy(document));
}

export function getAuditLogs() {
  return fetchOnPremiseApi<AuditLog[]>("/audit-logs");
}

export function getDocumentArchives() {
  return fetchOnPremiseApi<PaginatedResult<DocumentArchiveListItem>>("/document-archives");
}

export function getDocumentArchivesWithFilters(searchParams?: URLSearchParams) {
  const query = searchParams?.toString();
  const path = query ? `/document-archives?${query}` : "/document-archives";
  return fetchOnPremiseApi<PaginatedResult<DocumentArchiveListItem>>(path);
}

export function getDocumentArchiveById(id: string) {
  return fetchOnPremiseApi<DocumentArchiveDetails>(`/document-archives/${id}`);
}

export function classifyDocumentArchive(id: string) {
  return postOnPremiseApi<Record<string, never>, DocumentArchiveDetails>(`/document-archives/${id}/classify`, {});
}

export function getArchiveFolders(searchParams?: URLSearchParams) {
  const query = searchParams?.toString();
  const path = query ? `/folders?${query}` : "/folders";
  return fetchOnPremiseApi<PaginatedResult<ArchiveFolderListItem>>(path);
}

export function getArchiveFolderDocuments(id: string) {
  return fetchOnPremiseApi<{
    folder: ArchiveFolderListItem;
    items: ArchiveFolderDocumentListItem[];
  }>(`/folders/${id}/documents`);
}

export function updateArchiveFolderStatus(id: string, status: "ACTIVE" | "ARCHIVED") {
  return postOnPremiseApi<{ status: "ACTIVE" | "ARCHIVED" }, ArchiveFolder>(`/folders/${id}/status`, { status });
}

export function createArchiveFolder(input: {
  year: number;
  partnerDirectionId: string;
}) {
  return postOnPremiseApi<typeof input, ArchiveFolder>("/folders", input);
}

export function getDirections() {
  return getMappedDepartments(["DIRECTION_GENERALE", "DIRECTION"]);
}

export function getServices() {
  return getMappedDepartments(["SERVICE"]);
}

export function getBureaux() {
  return getMappedDepartments(["BUREAU"]);
}

export function getDepartements() {
  return getMappedDepartments();
}

export async function createDepartement(input: {
  type: "Direction Generale" | "Direction" | "Service" | "Bureau";
  code: string;
  designation: string;
  parent?: {
    id?: string;
    code: string;
    designation: string;
  };
  direction?: {
    id?: string;
    code: string;
    designation: string;
  };
  service?: {
    id?: string;
    code: string;
    designation: string;
  };
}) {
  const departments = await fetchOnPremiseApi<Department[]>("/departments");
  const type = mapLegacyDepartmentTypeToOnPremise(input.type);
  const parent = input.parent
    ? departments?.find((department) => department.id === input.parent?.id) ??
      departments?.find((department) => department.code === input.parent?.code)
    : undefined;
  const direction = input.direction
    ? departments?.find((department) => department.id === input.direction?.id) ??
      departments?.find((department) => department.code === input.direction?.code)
    : undefined;
  const service = input.service
    ? departments?.find((department) => department.id === input.service?.id) ??
      departments?.find((department) => department.code === input.service?.code)
    : undefined;

  const created = await postOnPremiseApi<
    {
      code: string;
      designation: string;
      type: Department["type"];
      parentId?: string | null;
      directionId?: string | null;
      serviceId?: string | null;
    },
    Department
  >("/departments", {
    code: input.code,
    designation: input.designation,
    type,
    parentId: parent?.id ?? null,
    directionId: direction?.id ?? null,
    serviceId: service?.id ?? null
  });

  return created ? mapDepartmentToLegacy(created, departments ?? []) : null;
}

export function createDirection(input: {
  type: "Direction Generale" | "Direction";
  code: string;
  designation: string;
  parent?: {
    code: string;
    designation: string;
  };
}) {
  return createDepartement(input);
}

export function createService(input: {
  parent: {
    code: string;
    designation: string;
  };
  code: string;
  designation: string;
  description?: string;
}) {
  return createDepartement({
    type: "Service",
    code: input.code,
    designation: input.designation,
    parent: input.parent
  });
}

export function createBureau(input: {
  parent: {
    code: string;
    designation: string;
  };
  code: string;
  designation: string;
  description?: string;
}) {
  return createDepartement({
    type: "Bureau",
    code: input.code,
    designation: input.designation,
    parent: input.parent
  });
}

export function createDocument(input: Record<string, unknown>) {
  return postOnPremiseApi<typeof input, DocumentEntity>("/documents", input);
}

export function createDocumentAnnotation(
  documentId: string,
  input: {
    sourceDirectionId: string;
    documentVersionId?: string;
    content: string;
  }
) {
  return postOnPremiseApi<typeof input, DocumentEntity>(`/documents/${documentId}/annotations`, input);
}

export function getDocumentAnnotationReport(searchParams?: URLSearchParams) {
  const query = searchParams?.toString();
  const path = query ? `/search/documents/annotations/report?${query}` : "/search/documents/annotations/report";
  return fetchOnPremiseApi<DocumentAnnotationReport>(path);
}

export function createDocumentVersion(
  documentId: string,
  input: {
    changeSummary: string;
    title?: string;
    subject?: string;
    summary?: string;
    reference?: string;
    type?: string;
    receiverDirectionIds?: string[];
    copyDirectionIds?: string[];
    sourceAnnotationIds?: string[];
  }
) {
  return postOnPremiseApi<typeof input, DocumentEntity>(`/documents/${documentId}/versions`, input);
}

export function finalizeDocument(documentId: string) {
  return postOnPremiseApi<Record<string, never>, DocumentEntity>(`/documents/${documentId}/finalize`, {});
}

export function createUser(input: {
  personne: {
    nom: string;
    prenom: string;
  };
  profile: {
    code: string;
    designation: string;
  };
  email: string;
  matricule: string;
  bureau: {
    code: string;
    designation: string;
  };
}) {
  return postOnPremiseApi<
    {
      nom: string;
      prenom: string;
      email: string;
      matricule: string;
      roleCode: string;
      bureauCode: string;
    },
    {
      user: {
        id: string;
        email: string;
        matricule: string;
        nom: string;
        prenom: string;
        role: { code: string; name: string };
        department: Department | null;
      };
      defaultPassword: string;
      mustChangePassword: true;
    }
  >("/users", {
    nom: input.personne.nom,
    prenom: input.personne.prenom,
    email: input.email,
    matricule: input.matricule,
    roleCode: input.profile.code,
    bureauCode: input.bureau.code
  }).then(async (result) => {
    if (!result) {
      return null;
    }

    const departments = await fetchOnPremiseApi<Department[]>("/departments");

    return {
      user: mapOnPremiseUserToLegacy(result.user, departments ?? []),
      defaultPassword: result.defaultPassword,
      mustChangePassword: result.mustChangePassword
    };
  });
}

async function getMappedDepartments(types?: Department["type"][]) {
  const departments = await fetchOnPremiseApi<Department[]>("/departments");

  if (!departments) {
    return null;
  }

  return departments
    .filter((department) => !types || types.includes(department.type))
    .map((department) => mapDepartmentToLegacy(department, departments));
}

async function getMappedUsers(searchParams?: URLSearchParams) {
  const query = searchParams?.toString();
  const path = query ? `/users?${query}` : "/users";
  const [users, departments] = await Promise.all([
    fetchOnPremiseApi<
      PaginatedResult<{
        id: string;
        email: string;
        matricule: string;
        nom: string;
        prenom: string;
        isActive?: boolean;
        createdAt?: string | number;
        updatedAt?: string | number;
        role: { code: string; name: string };
        department: Department | null;
      }>
    >(path),
    fetchOnPremiseApi<Department[]>("/departments")
  ]);

  if (!users) {
    return null;
  }

  return {
    ...users,
    items: users.items.map((user) => mapOnPremiseUserToLegacy(user, departments ?? []))
  };
}

async function getMappedDocuments() {
  const documents = await fetchOnPremiseApi<OnPremiseDocument[]>("/documents");

  if (!documents) {
    return null;
  }

  return documents.map((document) => mapOnPremiseDocumentToLegacy(document)).filter((document): document is DocumentEntity => Boolean(document));
}

function mapDepartmentToLegacy(department: Department, departments: Department[]): Departement {
  const parent = department.parentId ? departments.find((candidate) => candidate.id === department.parentId) : null;
  const lineage = buildDepartmentParents(department, departments);

  return {
    id: department.id,
    type: mapOnPremiseDepartmentTypeToLegacy(department.type),
    code: department.code,
    designation: department.designation,
    directionId: department.directionId ?? undefined,
    serviceId: department.serviceId ?? undefined,
    parent: parent
      ? {
          code: parent.code,
          designation: parent.designation
        }
      : null,
    parents: lineage,
    dateCreation: normalizeDateValue(department.createdAt),
    dateDerniereModification: normalizeDateValue(department.updatedAt),
    updatedAt: normalizeDateValue(department.updatedAt)
  };
}

function buildDepartmentParents(department: Department, departments: Department[]) {
  const parents: string[] = [];
  let currentParentId = department.parentId;

  while (currentParentId) {
    const parent = departments.find((candidate) => candidate.id === currentParentId);

    if (!parent) {
      break;
    }

    parents.unshift(parent.code);
    currentParentId = parent.parentId ?? null;
  }

  return parents;
}

function mapOnPremiseDepartmentTypeToLegacy(type: Department["type"]): Departement["type"] {
  switch (type) {
    case "DIRECTION_GENERALE":
      return "Direction Generale";
    case "DIRECTION":
      return "Direction";
    case "SERVICE":
      return "Service";
    case "BUREAU":
      return "Bureau";
  }
}

function mapLegacyDepartmentTypeToOnPremise(type: Departement["type"]): Department["type"] {
  switch (type) {
    case "Direction Generale":
      return "DIRECTION_GENERALE";
    case "Direction":
      return "DIRECTION";
    case "Service":
      return "SERVICE";
    case "Bureau":
      return "BUREAU";
  }
}

function normalizeDateValue(value: string | number) {
  if (typeof value === "number") {
    return value;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Date.now() : timestamp;
}

type OnPremiseDocument = {
  id: string;
  reference: string;
  referenceNumber: number;
  year: number;
  title: string;
  subject?: string | null;
  summary?: string | null;
  type: string;
  status?: string | null;
  emitterDirectionId: string;
  emitterDirection?: {
    id: string;
    code: string;
    designation: string;
  } | null;
  author?: {
    id: string;
    nom: string;
    prenom: string;
    matricule: string;
    email: string;
  } | null;
  recipients?: Array<{
    directionId: string;
    kind: "RECEIVER" | "COPY";
    direction?: {
      id: string;
      code: string;
      designation: string;
    } | null;
  }>;
  signers?: Array<{
    userId?: string | null;
    fullName: string;
    functionTitle?: string | null;
    departmentId: string;
    departmentType: "DIRECTION_GENERALE" | "DIRECTION" | "SERVICE" | "BUREAU";
    signingOrder?: number | null;
  }>;
  attachments?: Array<{
    id: string;
    fileName: string;
    objectKey: string;
    mimeType: string;
  }>;
  archives?: Array<{
    id: string;
    bureauId: string;
    folderId: string;
    folder?: {
      ownerDirectionId?: string;
      ownerDirection?: {
        code?: string;
        designation?: string;
      };
      partnerDirectionId?: string;
    };
    movementType: "ENTREE" | "SORTIE";
    archivedAt: string;
  }>;
  canClassify?: boolean;
  currentDirectionMovement?: "ENTREE" | "SORTIE";
  currentDirectionArchivedAt?: string;
  version?: number;
  versionsHistory?: DocumentVersionRecord[];
  annotations?: DocumentAnnotationRecord[];
  transmissions?: DocumentTransmissionRecord[];
  timeline?: DocumentTimelineEvent[];
  pendingResponseDirectionIds?: string[];
  pendingResponseDirectionNames?: string[];
  respondedDirectionIds?: string[];
  respondedDirectionNames?: string[];
  createdAt: string;
  updatedAt: string;
};

function mapOnPremiseDocumentToLegacy(document: OnPremiseDocument | null): DocumentEntity | null {
  if (!document || !document.emitterDirection) {
    return null;
  }

  const recipients = document.recipients ?? [];
  const receiverDirectionIds = recipients.filter((recipient) => recipient.kind === "RECEIVER").map((recipient) => recipient.directionId);
  const copyDirectionIds = recipients.filter((recipient) => recipient.kind === "COPY").map((recipient) => recipient.directionId);
  const receiverDirectionNames = recipients
    .filter((recipient) => recipient.kind === "RECEIVER")
    .map((recipient) => recipient.direction?.designation ?? recipient.direction?.code ?? recipient.directionId);
  const copyDirectionNames = recipients
    .filter((recipient) => recipient.kind === "COPY")
    .map((recipient) => recipient.direction?.designation ?? recipient.direction?.code ?? recipient.directionId);
  const attachments: DocumentAttachment[] = (document.attachments ?? []).map((attachment) => ({
    id: attachment.id,
    name: attachment.fileName,
    fileUrl: `/api/v1/attachments/${attachment.id}/download`,
    filePath: attachment.objectKey,
    mimeType: attachment.mimeType
  }));
  const signers: DocumentSigner[] = (document.signers ?? []).map((signer) => ({
    userId: signer.userId ?? undefined,
    fullName: signer.fullName,
    functionTitle: signer.functionTitle ?? undefined,
    departmentId: signer.departmentId,
    departmentType: signer.departmentType,
    signingOrder: signer.signingOrder ?? undefined
  }));
  const primaryAttachment = attachments[0];
  const archiveFolders =
    document.archives?.map((archive) => ({
      id: archive.id,
      bureauId: archive.bureauId,
      folderId: archive.folderId,
      ownerDirectionId: archive.folder?.ownerDirectionId,
      ownerDirectionCode: archive.folder?.ownerDirection?.code,
      ownerDirectionName: archive.folder?.ownerDirection?.designation,
      partnerDirectionId: archive.folder?.partnerDirectionId,
      movementType: archive.movementType,
      archivedAt: archive.archivedAt
    })) ?? [];
  const primaryArchive = archiveFolders[0];

  return {
    id: document.id,
    numeroReference: document.reference,
    year: document.year,
    referenceNumber: document.referenceNumber,
    referenceCode: document.emitterDirection.code,
    dateCreation: document.createdAt,
    user: {
      id: document.author?.id,
      nom: document.author?.nom ?? "SYSTEM",
      prenom: document.author?.prenom ?? "",
      matricule: document.author?.matricule ?? "SYSTEM",
      email: document.author?.email
    },
    type: document.type,
    direction: {
      id: document.emitterDirection.id,
      code: document.emitterDirection.code,
      designation: document.emitterDirection.designation
    },
    dateDerniereModication: document.updatedAt,
    reference: document.reference,
    title: document.title,
    subject: document.subject ?? undefined,
    summary: document.summary ?? undefined,
    directionId: document.emitterDirection.id,
    authorId: document.author?.id,
    authorName: [document.author?.nom, document.author?.prenom].filter(Boolean).join(" ").trim() || undefined,
    signerName: signers[0]?.fullName,
    signers,
    emitterDirectionId: document.emitterDirectionId,
    receiverDirectionIds,
    copyDirectionIds,
    receiverDirectionNames,
    copyDirectionNames,
    status: (document.status as DocumentEntity["status"]) ?? "BROUILLON",
    keywords: [],
    version: document.version ?? document.versionsHistory?.[document.versionsHistory.length - 1]?.version ?? 1,
    attachments,
    archiveFolders,
    canClassify: document.canClassify,
    currentDirectionMovement: document.currentDirectionMovement,
    currentDirectionArchivedAt: document.currentDirectionArchivedAt,
    annotations: document.annotations,
    versionsHistory: document.versionsHistory,
    transmissions: document.transmissions,
    timeline: document.timeline,
    pendingResponseDirectionIds: document.pendingResponseDirectionIds,
    pendingResponseDirectionNames: document.pendingResponseDirectionNames,
    respondedDirectionIds: document.respondedDirectionIds,
    respondedDirectionNames: document.respondedDirectionNames,
    bureauId: primaryArchive?.bureauId,
    movementType: document.currentDirectionMovement ?? primaryArchive?.movementType,
    archivedAt: document.currentDirectionArchivedAt ?? primaryArchive?.archivedAt,
    fileName: primaryAttachment?.name,
    urlFileName: primaryAttachment?.fileUrl,
    fileUrl: primaryAttachment?.fileUrl,
    mimeType: primaryAttachment?.mimeType,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt
  };
}

function filterDocuments(documents: DocumentEntity[] | null, searchParams?: URLSearchParams) {
  if (!documents) {
    return null;
  }

  const q = searchParams?.get("q")?.trim().toLowerCase() ?? "";
  const status = searchParams?.get("status")?.trim() ?? "";
  const year = searchParams?.get("year")?.trim() ?? "";
  const directionId = searchParams?.get("directionId")?.trim() ?? "";
  const serviceId = searchParams?.get("serviceId")?.trim() ?? "";
  const bureauId = searchParams?.get("bureauId")?.trim() ?? "";

  return documents.filter((document) => {
    const title = document.title ?? document.fileName ?? "";
    const matchesText =
      !q ||
      document.numeroReference.toLowerCase().includes(q) ||
      title.toLowerCase().includes(q) ||
      document.keywords.some((keyword) => keyword.toLowerCase().includes(q));

    return (
      matchesText &&
      (!status || document.status === status) &&
      (!year || String(document.year) === year) &&
      (!directionId || document.directionId === directionId) &&
      (!serviceId || document.serviceId === serviceId) &&
      (!bureauId || document.bureauId === bureauId)
    );
  });
}

function paginateDocuments(documents: DocumentEntity[] | null, searchParams?: URLSearchParams): PaginatedResult<DocumentEntity> | null {
  if (!documents) {
    return null;
  }

  const page = Number.parseInt(searchParams?.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(searchParams?.get("pageSize") ?? "10", 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const safePageSize = Number.isNaN(pageSize) || pageSize < 1 ? 10 : pageSize;
  const total = documents.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const start = (safePage - 1) * safePageSize;

  return {
    items: documents.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages
  };
}

function mapOnPremiseUserToLegacy(
  user: {
    id: string;
    email: string;
    matricule: string;
    nom: string;
    prenom: string;
    isActive?: boolean;
    createdAt?: string | number;
    updatedAt?: string | number;
    role: { code: string; name: string };
    department: Department | null;
  },
  departments: Department[]
): User {
  const department = user.department;
  const departmentScope = resolveDepartmentScopeFromDepartment(department, departments);

  return {
    id: user.id,
    email: user.email,
    role: user.role.code as User["role"],
    isActive: user.isActive ?? true,
    updatedAt: normalizeDateValue(user.updatedAt ?? Date.now()),
    personne: {
      nom: user.nom,
      prenom: user.prenom
    },
    profile: {
      code: user.role.code,
      designation: user.role.name
    },
    matricule: user.matricule,
    bureau: departmentScope.bureau,
    dateCreation: normalizeDateValue(user.createdAt ?? Date.now()),
    dateDerniereModification: normalizeDateValue(user.updatedAt ?? user.createdAt ?? Date.now()),
    directionId: departmentScope.directionId,
    serviceId: departmentScope.serviceId,
    bureauId: departmentScope.bureauId,
    displayName: [user.nom, user.prenom].filter(Boolean).join(" ").trim()
  };
}

function resolveDepartmentScopeFromDepartment(department: Department | null, departments: Department[]) {
  if (!department) {
    return {
      directionId: null,
      serviceId: null,
      bureauId: null,
      bureau: null
    };
  }

  if (department.type === "BUREAU") {
    const service = department.serviceId ? departments.find((candidate) => candidate.id === department.serviceId) : null;
    const direction = department.directionId ? departments.find((candidate) => candidate.id === department.directionId) : null;

    return {
      directionId: direction?.id ?? null,
      serviceId: service?.id ?? null,
      bureauId: department.id,
      bureau: {
        code: department.code,
        designation: department.designation
      }
    };
  }

  if (department.type === "SERVICE") {
    const direction = (department.directionId ?? department.parentId)
      ? departments.find((candidate) => candidate.id === (department.directionId ?? department.parentId))
      : null;

    return {
      directionId: direction?.id ?? null,
      serviceId: department.id,
      bureauId: null,
      bureau: null
    };
  }

  return {
    directionId: department.id,
    serviceId: null,
    bureauId: null,
    bureau: null
  };
}
