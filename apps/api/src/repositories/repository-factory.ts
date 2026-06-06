import type { AuditLog, Departement, DocumentEntity, User } from "@sigeda/shared/types";

import { firestore } from "../config/firebase-admin";
import {
  seedAuditLogs,
  seedDepartements,
  seedDocuments,
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
