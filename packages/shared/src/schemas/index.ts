import { z } from "zod";

import {
  auditActions,
  confidentialityLevels,
  departementTypes,
  departmentTypes,
  digitizationStatuses,
  documentStatuses,
  documentFileKinds,
  documentTypes,
  folderTypes,
  movementTypes,
  ocrStatuses,
  roles
} from "../constants/index.js";

export const userPersonneSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1)
});

export const departementReferenceSchema = z.object({
  id: z.string().optional(),
  type: z.enum(departementTypes).optional(),
  code: z.string().min(1),
  designation: z.string().min(1),
  directionId: z.string().nullable().optional(),
  serviceId: z.string().nullable().optional()
});

export const createUserSchema = z.object({
  mode: z.enum(["CREATE", "COMPLETE"]).default("CREATE"),
  pendingUserId: z.string().trim().min(1).optional(),
  personne: z.object({
    nom: z.string().trim().min(1),
    prenom: z.string().trim().min(1)
  }),
  profile: z.object({
    code: z.string().trim().min(1),
    designation: z.string().trim().min(1)
  }),
  email: z.string().trim().email(),
  matricule: z.string().trim().min(1),
  functionTitle: z.string().trim().min(1).optional(),
  bureau: z.object({
    code: z.string().trim().min(1),
    designation: z.string().trim().min(1)
  })
}).strict();

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  functionTitle: z.string().optional(),
  role: z.enum(roles).optional(),
  isActive: z.boolean().optional(),
  directoryStatus: z.enum(["ACTIVE", "PENDING_COMPLETION", "INACTIVE"]).optional(),
  directorySource: z.enum(["MANUAL", "DOCUMENT_INTELLIGENCE", "KEYCLOAK_PROVISIONED"]).optional(),
  updatedAt: z.union([z.string(), z.number()]).optional(),
  personne: userPersonneSchema,
  profile: z.object({
    code: z.string().min(1),
    designation: z.string().min(1)
  }),
  matricule: z.string().min(1).optional(),
  bureau: departementReferenceSchema.nullable().optional(),
  dateCreation: z.number(),
  dateDerniereModification: z.number(),
  directionId: z.string().nullable().optional(),
  serviceId: z.string().nullable().optional(),
  bureauId: z.string().nullable().optional(),
  displayName: z.string().optional()
});

export const createUserResultSchema = z.object({
  user: userSchema,
  defaultPassword: z.string().min(8),
  mustChangePassword: z.literal(true),
  operation: z.enum(["CREATED", "COMPLETED_PENDING"])
});

export const parentDepartementSchema = z.object({
  id: z.string().trim().min(1).optional(),
  code: z.string().trim().min(1),
  designation: z.string().trim().min(1)
});

export const departementSchema = z.object({
  id: z.string(),
  type: z.enum(departementTypes),
  code: z.string().min(1),
  designation: z.string().min(1),
  directionId: z.string().nullable().optional(),
  serviceId: z.string().nullable().optional(),
  parent: parentDepartementSchema.nullable().optional(),
  parents: z.array(z.string()),
  dateCreation: z.number(),
  dateDerniereModification: z.number(),
  description: z.string().optional(),
  updatedAt: z.union([z.string(), z.number()]).optional()
});

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional()
);

export const createDepartementSchema = z.object({
  type: z.enum(departementTypes),
  code: z.string().trim().min(1),
  designation: z.string().trim().min(1),
  parent: parentDepartementSchema.optional(),
  direction: parentDepartementSchema.optional(),
  service: parentDepartementSchema.optional()
}).strict().superRefine((value, context) => {
  if (value.type === "Direction Generale" && value.parent) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["parent"],
      message: "parent must be omitted for Direction Generale."
    });
  }

  if (value.type === "Direction" && !value.parent) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["parent"],
      message: "parent is required for Direction."
    });
  }

  if (value.type === "Service" && !value.parent) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["parent"],
      message: "parent is required for Service."
    });
  }

  if (value.type === "Bureau" && !value.direction) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["direction"],
      message: "direction is required for Bureau."
    });
  }

  if (value.type !== "Bureau" && (value.direction || value.service)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["direction"],
      message: "direction/service can only be provided for Bureau."
    });
  }
});

export const createDirectionSchema = z.object({
  type: z.enum(["Direction Generale", "Direction", "DirectionGenerale"]),
  code: z.string().trim().min(1),
  designation: optionalNonEmptyString,
  name: optionalNonEmptyString,
  parentId: optionalNonEmptyString,
  description: optionalNonEmptyString
})
  .superRefine((value, context) => {
    if (!value.designation && !value.name) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["designation"],
        message: "designation is required."
      });
    }

    if (value.type === "Direction" && !value.parentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentId"],
        message: "parentId is required for Direction."
      });
    }
  })
  .transform(({ name, ...value }) => ({
    ...value,
    type: value.type === "DirectionGenerale" ? "Direction Generale" : value.type,
    designation: value.designation ?? name!
  }));

export const createServiceSchema = z.object({
  parentId: z.string().min(1),
  code: z.string().min(1),
  designation: z.string().min(1),
  description: z.string().optional()
});

export const createBureauSchema = z.object({
  directionId: z.string().min(1),
  serviceId: z.string().optional(),
  code: z.string().min(1),
  designation: z.string().min(1),
  description: z.string().optional()
});

export const physicalArchiveSchema = z.object({
  id: z.string(),
  documentArchiveId: z.string().optional(),
  documentId: z.string(),
  directionId: z.string().optional(),
  partnerDirectionId: z.string().optional(),
  year: z.number().int().min(2000).max(3000).optional(),
  folderId: z.string().optional(),
  movementType: z.enum(movementTypes).optional(),
  section: z.enum(movementTypes).optional(),
  site: z.string().min(1),
  batiment: z.string().min(1),
  salle: z.string().min(1),
  rayon: z.string().min(1),
  etagere: z.string().min(1),
  classeur: z.string().min(1),
  dossier: z.string().min(1),
  boiteArchive: z.string().min(1),
  classementKey: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export const createPhysicalArchiveSchema = physicalArchiveSchema.omit({
  id: true,
  directionId: true,
  year: true,
  folderId: true,
  movementType: true,
  section: true,
  classementKey: true,
  createdAt: true,
  updatedAt: true
});

export const documentUserReferenceSchema = z.object({
  id: z.string().optional(),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  matricule: z.string().min(1),
  email: z.string().email().optional()
});

export const documentDirectionReferenceSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1),
  designation: z.string().min(1)
});

export const documentTypeOptionSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  label: z.string().min(1),
  description: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.union([z.string(), z.number()]),
  updatedAt: z.union([z.string(), z.number()])
});

export const documentAttachmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  fileUrl: z.string().optional(),
  filePath: z.string().optional(),
  mimeType: z.string().optional()
});

export const documentSignerSchema = z.object({
  userId: z.string().optional(),
  fullName: z.string().min(1),
  functionTitle: z.string().optional(),
  departmentId: z.string().min(1),
  departmentType: z.enum(departmentTypes),
  signingOrder: z.number().int().positive().optional()
});

export const documentRecipientTargetSchema = z.object({
  kind: z.enum(["DIRECTION_GENERALE", "DIRECTION", "SERVICE", "BUREAU", "USER"]),
  directionId: z.string().min(1),
  directionCode: z.string().optional(),
  directionName: z.string().optional(),
  departmentId: z.string().optional(),
  departmentCode: z.string().optional(),
  departmentName: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  label: z.string().min(1)
});

export const aiExtractedDataSchema = z.object({
  reference: z.string().optional(),
  year: z.number().int().min(2000).max(3000).optional(),
  referenceNumber: z.number().int().nonnegative().optional(),
  referenceCode: z.string().optional(),
  subject: z.string().optional(),
  documentDate: z.string().optional(),
  emitterDirectionId: z.string().optional(),
  receiverDirectionIds: z.array(z.string()).optional(),
  copyDirectionIds: z.array(z.string()).optional(),
  copyTargets: z.array(documentRecipientTargetSchema).optional(),
  documentType: z.union([z.enum(documentTypes), z.string().min(1)]).optional(),
  signerName: z.string().optional(),
  signers: z.array(documentSignerSchema).optional(),
  confidentialityLevel: z.enum(confidentialityLevels).optional(),
  summary: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  dossierNumber: z.string().optional(),
  classementNumber: z.string().optional()
});

export const documentSchema = z.object({
  id: z.string(),
  numeroReference: z.string().min(1),
  year: z.number().int().min(2000).max(3000),
  referenceNumber: z.number().int().nonnegative(),
  referenceCode: z.string().min(1),
  dateCreation: z.union([z.string(), z.number()]),
  user: documentUserReferenceSchema,
  type: z.string().min(1),
  documentTypeId: z.string().optional(),
  documentTypeCode: z.string().optional(),
  documentTypeLabel: z.string().optional(),
  direction: documentDirectionReferenceSchema,
  dateDerniereModication: z.union([z.string(), z.number()]),
  reference: z.string().optional(),
  fileName: z.string().optional(),
  urlFileName: z.string().optional(),
  title: z.string().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  summary: z.string().optional(),
  directionId: z.string().optional(),
  serviceId: z.string().optional(),
  bureauId: z.string().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  signerId: z.string().optional(),
  signerName: z.string().optional(),
  signers: z.array(documentSignerSchema).optional(),
  emitterDirectionId: z.string().optional(),
  receiverDirectionIds: z.array(z.string()),
  copyDirectionIds: z.array(z.string()),
  copyTargets: z.array(documentRecipientTargetSchema).optional(),
  movementType: z.enum(movementTypes).optional(),
  confidentialityLevel: z.enum(confidentialityLevels).optional(),
  status: z.enum(documentStatuses).optional(),
  keywords: z.array(z.string()),
  physicalArchiveId: z.string().optional(),
  version: z.number().int().positive(),
  attachments: z.array(documentAttachmentSchema),
  originalFileName: z.string().optional(),
  mimeType: z.string().optional(),
  fileSizeBytes: z.number().int().nonnegative().optional(),
  storageProvider: z.enum(["LOCAL", "FIREBASE_STORAGE"]).optional(),
  fileKind: z.enum(documentFileKinds).optional(),
  digitizationStatus: z.enum(digitizationStatuses).optional(),
  ocrStatus: z.enum(ocrStatuses).optional(),
  ocrText: z.string().optional(),
  ocrExtractedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().optional(),
  fileUrl: z.string().optional(),
  filePath: z.string().optional(),
  aiExtractedData: aiExtractedDataSchema.optional()
});

export const createDocumentSchema = z
  .object({
    numeroReference: z.string().min(1).optional(),
    reference: z.string().min(1).optional(),
    year: z.number().int().min(2000).max(3000).optional(),
    referenceNumber: z.number().int().nonnegative().optional(),
    referenceCode: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    subject: z.string().optional(),
    description: z.string().optional(),
    summary: z.string().optional(),
    type: z.string().min(1).optional(),
    documentTypeId: z.string().min(1).optional(),
    folderId: z.string().min(1).optional(),
    documentType: z.enum(documentTypes).optional(),
    directionId: z.string().min(1).optional(),
    emitterDirectionId: z.string().min(1).optional(),
    receiverDirectionIds: z.array(z.string().min(1)).optional(),
    copyDirectionIds: z.array(z.string().min(1)).optional(),
    copyTargets: z.array(documentRecipientTargetSchema).optional(),
    serviceId: z.string().min(1).optional(),
    bureauId: z.string().min(1).optional(),
    authorId: z.string().optional(),
    signerId: z.string().optional(),
    signerName: z.string().optional(),
    signers: z.array(documentSignerSchema).optional(),
    confidentialityLevel: z.enum(confidentialityLevels).optional(),
    status: z.enum(documentStatuses).optional(),
    keywords: z.array(z.string()).optional(),
    version: z.number().int().positive().optional(),
    user: documentUserReferenceSchema.partial().optional(),
    direction: documentDirectionReferenceSchema.partial().optional(),
    fileName: z.string().optional(),
    urlFileName: z.string().optional(),
    attachments: z.array(documentAttachmentSchema).optional(),
    aiExtractedData: aiExtractedDataSchema.optional()
  })
  .superRefine((value, context) => {
    const direction = value.direction as { id?: string } | undefined;

    if (!value.numeroReference && !value.reference) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "numeroReference or reference is required."
      });
    }

    if (!value.type && !value.documentType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "type or documentType is required."
      });
    }

    if (
      !value.directionId &&
      !value.emitterDirectionId &&
      !direction?.id &&
      !(value.receiverDirectionIds && value.receiverDirectionIds.length > 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one linked direction is required."
      });
    }
  });

export const documentArchiveSchema = z.object({
  id: z.string(),
  year: z.number().int().min(2000).max(3000),
  documentId: z.string().min(1),
  ownerDirectionId: z.string().min(1).optional(),
  directionId: z.string().min(1).optional(),
  serviceId: z.string().optional(),
  bureauId: z.string().optional(),
  folderId: z.string().optional(),
  movementType: z.enum(movementTypes),
  archivedAt: z.string(),
  archivedBy: z.string().min(1),
  archiveFolderId: z.string().optional()
});

export const archiveFolderSchema = z.object({
  id: z.string(),
  year: z.number().int().min(2000).max(3000),
  folderType: z.enum(folderTypes),
  label: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  bureauId: z.string().min(1),
  accessibleBureauIds: z.array(z.string().min(1)).optional(),
  ownerDirectionId: z.string().min(1),
  directionId: z.string().min(1).optional(),
  partnerDirectionId: z.string().min(1).nullable().optional(),
  documentTypeIds: z.array(z.string().min(1)).optional(),
  documentTypes: z.array(documentTypeOptionSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"])
});

export const documentIntelligenceRequestedModeSchema = z.enum(["vision", "ocr", "auto"]);
export const documentIntelligenceEffectiveModeSchema = z.enum(["vision", "ocr", "hybrid"]);
export const documentIntelligenceJobStatusSchema = z.enum([
  "PENDING",
  "UPLOADED",
  "VISION_RUNNING",
  "OCR_RUNNING",
  "LLM_RUNNING",
  "COMPLETED",
  "LOW_CONFIDENCE",
  "FAILED"
]);

export const documentIntelligenceResultSchema = z.object({
  reference: z.string().default(""),
  title: z.string().default(""),
  subject: z.string().default(""),
  documentDate: z.string().default(""),
  emitterDirection: z.string().default(""),
  receiverDirections: z.array(z.string()).default([]),
  copyDirections: z.array(z.string()).default([]),
  signers: z.array(z.string()).default([]),
  documentType: z.string().default(""),
  confidentialityLevel: z.string().default(""),
  summary: z.string().default(""),
  keywords: z.array(z.string()).default([]),
  confidenceScore: z.number().min(0).max(1).default(0),
  fieldConfidence: z.record(z.number().min(0).max(1)).default({}),
  extractionMode: documentIntelligenceEffectiveModeSchema.default("vision"),
  rawExtractedText: z.string().default(""),
  rawVisionNotes: z.string().optional()
});

export const documentIntelligenceMatchingItemSchema = z.object({
  status: z.enum(["matched", "ambiguous", "unmatched"]),
  label: z.string().min(1),
  matchedDepartmentId: z.string().optional(),
  matchedDepartmentIds: z.array(z.string()).optional()
});

export const documentIntelligenceSignerMatchingItemSchema = z.object({
  status: z.enum(["matched", "ambiguous", "unmatched"]),
  label: z.string().min(1),
  matchedUserId: z.string().optional(),
  matchedUserIds: z.array(z.string()).optional(),
  directoryStatus: z.enum(["ACTIVE", "PENDING_COMPLETION", "INACTIVE"]).optional()
});

export const documentIntelligenceJobSchema = z.object({
  id: z.string(),
  userId: z.string(),
  originalFileName: z.string().min(1),
  bucket: z.string().min(1),
  objectKey: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().nonnegative(),
  requestedMode: documentIntelligenceRequestedModeSchema,
  effectiveMode: documentIntelligenceEffectiveModeSchema.nullable().optional(),
  status: documentIntelligenceJobStatusSchema,
  ocrProvider: z.string().nullable().optional(),
  llmProvider: z.string().nullable().optional(),
  modelName: z.string().nullable().optional(),
  extractedJson: documentIntelligenceResultSchema.nullable().optional(),
  rawExtractedText: z.string().nullable().optional(),
  confidenceScore: z.number().min(0).max(1).nullable().optional(),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const documentIntelligenceJobStatusViewSchema = z.object({
  id: z.string(),
  status: documentIntelligenceJobStatusSchema,
  requestedMode: documentIntelligenceRequestedModeSchema,
  effectiveMode: documentIntelligenceEffectiveModeSchema.nullable().optional(),
  confidenceScore: z.number().min(0).max(1).nullable().optional(),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const documentIntelligenceAnalyzeResponseSchema = z.object({
  jobId: z.string(),
  status: documentIntelligenceJobStatusSchema
});

export const documentIntelligenceModeReadinessSchema = z.object({
  available: z.boolean(),
  reason: z.string().nullable().optional()
});

export const documentIntelligenceProviderReadinessSchema = z.object({
  available: z.boolean(),
  provider: z.string().min(1),
  model: z.string().nullable().optional(),
  baseUrl: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  reason: z.string().nullable().optional()
});

export const documentIntelligenceReadinessSchema = z.object({
  available: z.boolean(),
  defaultMode: documentIntelligenceRequestedModeSchema,
  modes: z.object({
    vision: documentIntelligenceModeReadinessSchema,
    ocr: documentIntelligenceModeReadinessSchema,
    auto: documentIntelligenceModeReadinessSchema
  }),
  providers: z.object({
    vision: documentIntelligenceProviderReadinessSchema,
    text: documentIntelligenceProviderReadinessSchema,
    ocr: documentIntelligenceProviderReadinessSchema
  }),
  message: z.string().min(1)
});

export const documentIntelligenceResultViewSchema = z.object({
  job: documentIntelligenceJobStatusViewSchema,
  result: documentIntelligenceResultSchema,
  matching: z.object({
    emitterDirection: documentIntelligenceMatchingItemSchema.optional(),
    receiverDirections: z.array(documentIntelligenceMatchingItemSchema),
    copyDirections: z.array(documentIntelligenceMatchingItemSchema),
    signers: z.array(documentIntelligenceSignerMatchingItemSchema)
  })
});

export const createArchiveFolderSchema = z.object({
  year: z.number().int().min(2000).max(3000),
  folderType: z.enum(folderTypes).default("CORRESPONDANCE"),
  label: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  partnerDirectionId: z.string().min(1).optional(),
  documentTypeIds: z.array(z.string().min(1)).default([]),
  accessibleBureauIds: z.array(z.string().min(1)).default([])
}).superRefine((value, context) => {
  if (value.folderType === "CORRESPONDANCE" && !value.partnerDirectionId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["partnerDirectionId"],
      message: "partnerDirectionId is required for correspondence folders."
    });
  }

  if (value.folderType === "DOCUMENTAIRE" && !value.label) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["label"],
      message: "label is required for documentary folders."
    });
  }

  if (value.folderType === "DOCUMENTAIRE" && value.documentTypeIds.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["documentTypeIds"],
      message: "documentTypeIds is required for documentary folders."
    });
  }

  if (value.folderType === "AUTRE" && !value.label) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["label"],
      message: "label is required for custom folders."
    });
  }
});

export const updateArchiveFolderStatusSchema = z.object({
  status: z.enum(["ACTIVE", "ARCHIVED"])
});

export const auditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  action: z.enum(auditActions),
  entityType: z.string(),
  entityId: z.string(),
  description: z.string(),
  ipAddress: z.string().optional(),
  createdAt: z.string()
});
