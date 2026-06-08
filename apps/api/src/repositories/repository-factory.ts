import type { ArchiveFolder, AuditLog, Departement, DocumentArchive, DocumentEntity, PhysicalArchive, User } from "@sigeda/shared/types";

import { firestore } from "../config/firebase-admin";
import {
  seedAuditLogs,
  seedArchiveFolders,
  seedDocumentArchives,
  seedDepartements,
  seedDocuments,
  seedPhysicalArchives,
  seedUsers
} from "../seed/demo-data";
import { DepartementRepository } from "./departement-repository";
import { DocumentRepository } from "./document-repository";
import { FirestoreRepository } from "./firestore-repository";
import { InMemoryRepository } from "./in-memory-repository";
import { UserRepository } from "./user-repository";

function useFirestore() {
  return Boolean(firestore);
}

export function createDepartementRepository() {
  return useFirestore()
    ? new DepartementRepository(firestore, seedDepartements)
    : new InMemoryRepository<Departement>(seedDepartements);
}

export function createDocumentRepository() {
  return useFirestore()
    ? new DocumentRepository(firestore, seedDocuments)
    : new InMemoryRepository<DocumentEntity>(seedDocuments);
}

export function createUserRepository() {
  return useFirestore()
    ? new UserRepository(firestore, seedUsers)
    : new InMemoryRepository<User>(seedUsers);
}

export function createAuditLogRepository() {
  return useFirestore()
    ? new FirestoreRepository<AuditLog>(firestore, "auditLogs", seedAuditLogs)
    : new InMemoryRepository<AuditLog>(seedAuditLogs);
}

export function createArchiveFolderRepository() {
  return useFirestore()
    ? new FirestoreRepository<ArchiveFolder>(firestore, "archiveFolders", seedArchiveFolders)
    : new InMemoryRepository<ArchiveFolder>(seedArchiveFolders);
}

export function createDocumentArchiveRepository() {
  return useFirestore()
    ? new FirestoreRepository<DocumentArchive>(firestore, "documentArchives", seedDocumentArchives)
    : new InMemoryRepository<DocumentArchive>(seedDocumentArchives);
}

export function createPhysicalArchiveRepository() {
  return useFirestore()
    ? new FirestoreRepository<PhysicalArchive>(firestore, "physicalArchives", seedPhysicalArchives)
    : new InMemoryRepository<PhysicalArchive>(seedPhysicalArchives);
}
