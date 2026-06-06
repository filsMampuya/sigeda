import { z } from "zod";
import { auditActions, confidentialityLevels, documentStatuses, documentTypes, roles } from "../constants";
export const userSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    displayName: z.string().min(1),
    role: z.enum(roles),
    directionId: z.string().nullable().optional(),
    serviceId: z.string().nullable().optional(),
    bureauId: z.string().nullable().optional(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export const directionSchema = z.object({
    id: z.string(),
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export const serviceSchema = z.object({
    id: z.string(),
    directionId: z.string(),
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export const bureauSchema = z.object({
    id: z.string(),
    directionId: z.string(),
    serviceId: z.string(),
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
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
export const documentSchema = z.object({
    id: z.string(),
    reference: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    documentType: z.enum(documentTypes),
    directionId: z.string(),
    serviceId: z.string(),
    bureauId: z.string(),
    authorId: z.string(),
    confidentialityLevel: z.enum(confidentialityLevels),
    status: z.enum(documentStatuses),
    keywords: z.array(z.string()),
    fileUrl: z.string().url().optional(),
    filePath: z.string().optional(),
    physicalArchiveId: z.string().optional(),
    version: z.number().int().positive(),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.string().optional()
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
