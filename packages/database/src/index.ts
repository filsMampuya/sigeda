import prismaClientModule from "@prisma/client";

const prismaRuntime = prismaClientModule as typeof import("@prisma/client");

export const PrismaClient = prismaRuntime.PrismaClient;
export const Prisma = prismaRuntime.Prisma;
export const DepartmentType = prismaRuntime.DepartmentType;
export const FolderStatus = prismaRuntime.FolderStatus;
export const FolderType = prismaRuntime.FolderType;
export const MovementType = prismaRuntime.MovementType;
export const DocumentStatus = prismaRuntime.DocumentStatus;
export const RecipientKind = prismaRuntime.RecipientKind;
export const RecipientTargetKind = prismaRuntime.RecipientTargetKind;
export const AnnotationStatus = prismaRuntime.AnnotationStatus;
export const AttachmentStorageProvider = prismaRuntime.AttachmentStorageProvider;
export const UserDirectoryStatus = prismaRuntime.UserDirectoryStatus;
export const UserDirectorySource = prismaRuntime.UserDirectorySource;
export const DocumentIntelligenceJobStatus = prismaRuntime.DocumentIntelligenceJobStatus;

export const prisma = new PrismaClient();

export type DepartmentType = (typeof DepartmentType)[keyof typeof DepartmentType];
export type FolderStatus = (typeof FolderStatus)[keyof typeof FolderStatus];
export type FolderType = (typeof FolderType)[keyof typeof FolderType];
export type MovementType = (typeof MovementType)[keyof typeof MovementType];
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];
export type RecipientKind = (typeof RecipientKind)[keyof typeof RecipientKind];
export type RecipientTargetKind = (typeof RecipientTargetKind)[keyof typeof RecipientTargetKind];
export type AnnotationStatus = (typeof AnnotationStatus)[keyof typeof AnnotationStatus];
export type AttachmentStorageProvider = (typeof AttachmentStorageProvider)[keyof typeof AttachmentStorageProvider];
export type UserDirectoryStatus = (typeof UserDirectoryStatus)[keyof typeof UserDirectoryStatus];
export type UserDirectorySource = (typeof UserDirectorySource)[keyof typeof UserDirectorySource];
export type DocumentIntelligenceJobStatus =
  (typeof DocumentIntelligenceJobStatus)[keyof typeof DocumentIntelligenceJobStatus];

export type Attachment = import("@prisma/client").Attachment;
export type Department = import("@prisma/client").Department;
export type Document = import("@prisma/client").Document;
export type DocumentAnnotation = import("@prisma/client").DocumentAnnotation;
export type DocumentArchive = import("@prisma/client").DocumentArchive;
export type DocumentIntelligenceJob = import("@prisma/client").DocumentIntelligenceJob;
export type DocumentRecipient = import("@prisma/client").DocumentRecipient;
export type DocumentTransmission = import("@prisma/client").DocumentTransmission;
export type Folder = import("@prisma/client").Folder;
export type Role = import("@prisma/client").Role;
export type User = import("@prisma/client").User;
