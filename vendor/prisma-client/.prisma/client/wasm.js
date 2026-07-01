
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('@prisma/client/runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  code: 'code',
  designation: 'designation',
  type: 'type',
  parentId: 'parentId',
  directionId: 'directionId',
  serviceId: 'serviceId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  roleId: 'roleId',
  permissionId: 'permissionId'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  keycloakId: 'keycloakId',
  matricule: 'matricule',
  email: 'email',
  nom: 'nom',
  prenom: 'prenom',
  roleId: 'roleId',
  departmentId: 'departmentId',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DocumentScalarFieldEnum = {
  id: 'id',
  reference: 'reference',
  referenceNumber: 'referenceNumber',
  year: 'year',
  title: 'title',
  subject: 'subject',
  summary: 'summary',
  type: 'type',
  status: 'status',
  confidentiality: 'confidentiality',
  emitterDirectionId: 'emitterDirectionId',
  authorId: 'authorId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DocumentSignerScalarFieldEnum = {
  id: 'id',
  documentId: 'documentId',
  userId: 'userId',
  fullName: 'fullName',
  functionTitle: 'functionTitle',
  departmentId: 'departmentId',
  departmentType: 'departmentType',
  signingOrder: 'signingOrder',
  createdAt: 'createdAt'
};

exports.Prisma.DocumentRecipientScalarFieldEnum = {
  id: 'id',
  documentId: 'documentId',
  directionId: 'directionId',
  kind: 'kind',
  createdAt: 'createdAt'
};

exports.Prisma.FolderScalarFieldEnum = {
  id: 'id',
  year: 'year',
  bureauId: 'bureauId',
  accessibleBureauIds: 'accessibleBureauIds',
  ownerDirectionId: 'ownerDirectionId',
  partnerDirectionId: 'partnerDirectionId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DocumentArchiveScalarFieldEnum = {
  id: 'id',
  documentId: 'documentId',
  bureauId: 'bureauId',
  folderId: 'folderId',
  movementType: 'movementType',
  archivedAt: 'archivedAt',
  archivedById: 'archivedById'
};

exports.Prisma.PhysicalArchiveScalarFieldEnum = {
  id: 'id',
  documentArchiveId: 'documentArchiveId',
  documentId: 'documentId',
  directionId: 'directionId',
  partnerDirectionId: 'partnerDirectionId',
  year: 'year',
  folderId: 'folderId',
  movementType: 'movementType',
  site: 'site',
  batiment: 'batiment',
  salle: 'salle',
  rayon: 'rayon',
  etagere: 'etagere',
  classeur: 'classeur',
  dossier: 'dossier',
  boiteArchive: 'boiteArchive',
  classementKey: 'classementKey',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AttachmentScalarFieldEnum = {
  id: 'id',
  documentId: 'documentId',
  bucket: 'bucket',
  objectKey: 'objectKey',
  fileName: 'fileName',
  mimeType: 'mimeType',
  sizeBytes: 'sizeBytes',
  checksumSha256: 'checksumSha256',
  version: 'version',
  storageProvider: 'storageProvider',
  createdAt: 'createdAt'
};

exports.Prisma.DocumentVersionScalarFieldEnum = {
  id: 'id',
  documentId: 'documentId',
  version: 'version',
  snapshot: 'snapshot',
  changeSummary: 'changeSummary',
  sourceAnnotationIds: 'sourceAnnotationIds',
  createdById: 'createdById',
  createdAt: 'createdAt'
};

exports.Prisma.DocumentAnnotationScalarFieldEnum = {
  id: 'id',
  documentId: 'documentId',
  documentVersionId: 'documentVersionId',
  sourceDirectionId: 'sourceDirectionId',
  recordedByDirectionId: 'recordedByDirectionId',
  createdByUserId: 'createdByUserId',
  status: 'status',
  content: 'content',
  objectKey: 'objectKey',
  bucket: 'bucket',
  fileName: 'fileName',
  mimeType: 'mimeType',
  sizeBytes: 'sizeBytes',
  checksumSha256: 'checksumSha256',
  storageProvider: 'storageProvider',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DocumentTransmissionScalarFieldEnum = {
  id: 'id',
  documentId: 'documentId',
  documentVersionId: 'documentVersionId',
  targetDirectionId: 'targetDirectionId',
  kind: 'kind',
  sentByUserId: 'sentByUserId',
  sentAt: 'sentAt',
  respondedAt: 'respondedAt'
};

exports.Prisma.DocumentIntelligenceJobScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  originalFileName: 'originalFileName',
  bucket: 'bucket',
  objectKey: 'objectKey',
  mimeType: 'mimeType',
  sizeBytes: 'sizeBytes',
  requestedMode: 'requestedMode',
  effectiveMode: 'effectiveMode',
  status: 'status',
  ocrProvider: 'ocrProvider',
  llmProvider: 'llmProvider',
  modelName: 'modelName',
  extractedJson: 'extractedJson',
  rawExtractedText: 'rawExtractedText',
  confidenceScore: 'confidenceScore',
  errorCode: 'errorCode',
  errorMessage: 'errorMessage',
  startedAt: 'startedAt',
  finishedAt: 'finishedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.DepartmentType = exports.$Enums.DepartmentType = {
  DIRECTION_GENERALE: 'DIRECTION_GENERALE',
  DIRECTION: 'DIRECTION',
  SERVICE: 'SERVICE',
  BUREAU: 'BUREAU'
};

exports.DocumentStatus = exports.$Enums.DocumentStatus = {
  BROUILLON: 'BROUILLON',
  EN_VALIDATION: 'EN_VALIDATION',
  VALIDE: 'VALIDE',
  ARCHIVE: 'ARCHIVE',
  REJETE: 'REJETE'
};

exports.RecipientKind = exports.$Enums.RecipientKind = {
  RECEIVER: 'RECEIVER',
  COPY: 'COPY'
};

exports.FolderStatus = exports.$Enums.FolderStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED'
};

exports.MovementType = exports.$Enums.MovementType = {
  ENTREE: 'ENTREE',
  SORTIE: 'SORTIE'
};

exports.AttachmentStorageProvider = exports.$Enums.AttachmentStorageProvider = {
  MINIO: 'MINIO'
};

exports.AnnotationStatus = exports.$Enums.AnnotationStatus = {
  PENDING: 'PENDING',
  APPLIED: 'APPLIED',
  DISMISSED: 'DISMISSED'
};

exports.DocumentIntelligenceJobStatus = exports.$Enums.DocumentIntelligenceJobStatus = {
  PENDING: 'PENDING',
  UPLOADED: 'UPLOADED',
  VISION_RUNNING: 'VISION_RUNNING',
  OCR_RUNNING: 'OCR_RUNNING',
  LLM_RUNNING: 'LLM_RUNNING',
  COMPLETED: 'COMPLETED',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  FAILED: 'FAILED'
};

exports.Prisma.ModelName = {
  Department: 'Department',
  Role: 'Role',
  Permission: 'Permission',
  RolePermission: 'RolePermission',
  User: 'User',
  Document: 'Document',
  DocumentSigner: 'DocumentSigner',
  DocumentRecipient: 'DocumentRecipient',
  Folder: 'Folder',
  DocumentArchive: 'DocumentArchive',
  PhysicalArchive: 'PhysicalArchive',
  Attachment: 'Attachment',
  DocumentVersion: 'DocumentVersion',
  DocumentAnnotation: 'DocumentAnnotation',
  DocumentTransmission: 'DocumentTransmission',
  DocumentIntelligenceJob: 'DocumentIntelligenceJob',
  AuditLog: 'AuditLog'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
