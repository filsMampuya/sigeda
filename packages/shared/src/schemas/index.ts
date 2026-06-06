import { z } from "zod";

import {
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

export const userPersonneSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1)
});

export const departementReferenceSchema = z.object({
  id: z.string().optional(),
  type: z.enum(departementTypes).optional(),
  code: z.string().min(1),
  designation: z.string().min(1)
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(roles),
  isActive: z.boolean(),
  updatedAt: z.string(),
  personne: userPersonneSchema,
  matricule: z.string().min(1),
  bureau: departementReferenceSchema.nullable().optional(),
  dateCreation: z.string(),
  directionId: z.string().nullable().optional(),
  serviceId: z.string().nullable().optional(),
  bureauId: z.string().nullable().optional(),
  displayName: z.string().optional()
});

export const departementSchema = z.object({
  id: z.string(),
  type: z.enum(departementTypes),
  code: z.string().min(1),
  designation: z.string().min(1),
  parents: z.array(z.string()),
  dateCreation: z.string(),
  description: z.string().optional(),
  updatedAt: z.string().optional()
});

export const createDirectionSchema = z.object({
  type: z.enum(["DirectionGenerale", "Direction"]),
  code: z.string().min(1),
  designation: z.string().min(1),
  parentId: z.string().optional(),
  description: z.string().optional()
}).superRefine((value, context) => {
  if (value.type === "Direction" && !value.parentId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "parentId is required for Direction."
    });
  }
});

export const createServiceSchema = z.object({
  parentId: z.string().min(1),
  code: z.string().min(1),
  designation: z.string().min(1),
  description: z.string().optional()
});

export const createBureauSchema = z.object({
  parentId: z.string().min(1),
  code: z.string().min(1),
  designation: z.string().min(1),
  description: z.string().optional()
});

export const physicalArchiveSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  site: z.string().min(1),
  batiment: z.string().min(1),
  salle: z.string().min(1),
  rayon: z.string().min(1),
  etagere: z.string().min(1),
  classeur: z.string().min(1),
  dossier: z.string().min(1),
  boiteArchive: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string()
});
export const createPhysicalArchiveSchema = physicalArchiveSchema.omit({
  id: true,
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

export const documentSchema = z.object({
  id: z.string(),
  numeroReference: z.string().min(1),
  dateCreation: z.string(),
  user: documentUserReferenceSchema,
  type: z.string().min(1),
  direction: documentDirectionReferenceSchema,
  dateDerniereModication: z.string(),
  fileName: z.string().optional(),
  urlFileName: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  directionId: z.string().optional(),
  serviceId: z.string().optional(),
  bureauId: z.string().optional(),
  authorId: z.string().optional(),
  confidentialityLevel: z.enum(confidentialityLevels).optional(),
  status: z.enum(documentStatuses).optional(),
  keywords: z.array(z.string()),
  physicalArchiveId: z.string().optional(),
  version: z.number().int().positive(),
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
  archivedAt: z.string().optional()
});

export const createDocumentSchema = z
  .object({
    numeroReference: z.string().min(1).optional(),
    reference: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    type: z.string().min(1).optional(),
    documentType: z.enum(documentTypes).optional(),
    directionId: z.string().min(1).optional(),
    serviceId: z.string().min(1).optional(),
    bureauId: z.string().min(1).optional(),
    authorId: z.string().optional(),
    confidentialityLevel: z.enum(confidentialityLevels).optional(),
    status: z.enum(documentStatuses).optional(),
    keywords: z.array(z.string()).optional(),
    version: z.number().int().positive().optional(),
    user: documentUserReferenceSchema.partial().optional(),
    direction: documentDirectionReferenceSchema.partial().optional(),
    fileName: z.string().optional(),
    urlFileName: z.string().optional()
  })
  .superRefine((value, context) => {
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

    if (!value.directionId && !value.direction?.id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "directionId is required."
      });
    }
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
