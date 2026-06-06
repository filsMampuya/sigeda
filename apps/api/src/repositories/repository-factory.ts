import type { AuditLog, Bureau, Direction, DocumentEntity, Service } from "@sigeda/shared/types";

import { env } from "../config/env";
import { firestore } from "../config/firebase-admin";
import { seedAuditLogs, seedBureaux, seedDirections, seedDocuments, seedServices } from "../seed/demo-data";
import { FirestoreRepository } from "./firestore-repository";
import { InMemoryRepository } from "./in-memory-repository";

function useFirestore() {
  return Boolean(env.FIREBASE_PROJECT_ID);
}

export function createDirectionRepository() {
  return useFirestore()
    ? new FirestoreRepository<Direction>(firestore, "directions")
    : new InMemoryRepository<Direction>(seedDirections);
}

export function createServiceRepository() {
  return useFirestore()
    ? new FirestoreRepository<Service>(firestore, "services")
    : new InMemoryRepository<Service>(seedServices);
}

export function createBureauRepository() {
  return useFirestore()
    ? new FirestoreRepository<Bureau>(firestore, "bureaux")
    : new InMemoryRepository<Bureau>(seedBureaux);
}

export function createDocumentRepository() {
  return useFirestore()
    ? new FirestoreRepository<DocumentEntity>(firestore, "documents")
    : new InMemoryRepository<DocumentEntity>(seedDocuments);
}

export function createAuditLogRepository() {
  return useFirestore()
    ? new FirestoreRepository<AuditLog>(firestore, "auditLogs")
    : new InMemoryRepository<AuditLog>(seedAuditLogs);
}
