import type { AuditLog, Bureau, Direction, DocumentEntity, Service } from "@sigeda/shared/types";

const now = "2026-06-05T09:00:00.000Z";

export const seedDirections: Direction[] = [
  { id: "dir-dg", code: "DG", name: "Direction Generale", description: "Pilotage strategique", createdAt: now, updatedAt: now },
  { id: "dir-prod", code: "DPR", name: "Direction de la Production", description: "Production et fabrication", createdAt: now, updatedAt: now },
  { id: "dir-sec", code: "DSI", name: "Direction de la Securite", description: "Surete et controle", createdAt: now, updatedAt: now }
];

export const seedServices: Service[] = [
  { id: "srv-prod-plan", directionId: "dir-prod", code: "PLAN", name: "Service Planification", description: "Planification documentaire", createdAt: now, updatedAt: now },
  { id: "srv-prod-qual", directionId: "dir-prod", code: "QUAL", name: "Service Qualite", description: "Controle qualite", createdAt: now, updatedAt: now },
  { id: "srv-sec-arch", directionId: "dir-sec", code: "ARCH", name: "Service Archives Sensibles", description: "Protection documentaire", createdAt: now, updatedAt: now }
];

export const seedBureaux: Bureau[] = [
  { id: "bur-plan-01", directionId: "dir-prod", serviceId: "srv-prod-plan", code: "BPLAN", name: "Bureau Planification", description: "Suivi des references", createdAt: now, updatedAt: now },
  { id: "bur-qual-01", directionId: "dir-prod", serviceId: "srv-prod-qual", code: "BQUAL", name: "Bureau Qualite", description: "Validation et controle", createdAt: now, updatedAt: now },
  { id: "bur-arch-01", directionId: "dir-sec", serviceId: "srv-sec-arch", code: "BARCH", name: "Bureau Archives Sensibles", description: "Archives securisees", createdAt: now, updatedAt: now }
];

export const seedDocuments: DocumentEntity[] = [
  {
    id: "doc-001",
    reference: "DOC-2026-001",
    title: "Rapport de production trimestriel",
    description: "Synthese de production et anomalies observees.",
    documentType: "RAPPORT",
    directionId: "dir-prod",
    serviceId: "srv-prod-plan",
    bureauId: "bur-plan-01",
    authorId: "usr-admin",
    confidentialityLevel: "INTERNE",
    status: "VALIDE",
    keywords: ["production", "trimestre", "atelier"],
    fileUrl: "https://example.com/documents/doc-001.pdf",
    filePath: "documents/doc-001.pdf",
    originalFileName: "rapport-production.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 204800,
    storageProvider: "LOCAL",
    fileKind: "PDF",
    digitizationStatus: "DIGITIZED",
    ocrStatus: "COMPLETED",
    ocrText: "Rapport de production trimestriel",
    ocrExtractedAt: now,
    version: 3,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "doc-002",
    reference: "DOC-2026-002",
    title: "Note de securite atelier",
    description: "Instructions operationnelles pour zone sensible.",
    documentType: "NOTE",
    directionId: "dir-sec",
    serviceId: "srv-sec-arch",
    bureauId: "bur-arch-01",
    authorId: "usr-archiviste",
    confidentialityLevel: "SECRET",
    status: "EN_VALIDATION",
    keywords: ["securite", "atelier", "procedure"],
    fileUrl: "https://example.com/documents/doc-002.pdf",
    filePath: "documents/doc-002.pdf",
    originalFileName: "note-securite-scan.jpg",
    mimeType: "image/jpeg",
    fileSizeBytes: 184320,
    storageProvider: "LOCAL",
    fileKind: "IMAGE",
    digitizationStatus: "DIGITIZED",
    ocrStatus: "COMPLETED",
    ocrText: "Instructions operationnelles pour zone sensible",
    ocrExtractedAt: now,
    version: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "doc-003",
    reference: "DOC-2026-003",
    title: "Proces-verbal de reunion qualite",
    description: "Compte rendu des actions correctives.",
    documentType: "PV_REUNION",
    directionId: "dir-prod",
    serviceId: "srv-prod-qual",
    bureauId: "bur-qual-01",
    authorId: "usr-chef-service",
    confidentialityLevel: "CONFIDENTIEL",
    status: "ARCHIVE",
    keywords: ["qualite", "pv", "actions"],
    fileUrl: "https://example.com/documents/doc-003.pdf",
    filePath: "documents/doc-003.pdf",
    originalFileName: "pv-qualite.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 154002,
    storageProvider: "LOCAL",
    fileKind: "PDF",
    digitizationStatus: "DIGITIZED",
    ocrStatus: "COMPLETED",
    ocrText: "Compte rendu des actions correctives",
    ocrExtractedAt: now,
    version: 4,
    createdAt: now,
    updatedAt: now,
    archivedAt: now
  }
];

export const seedAuditLogs: AuditLog[] = [
  {
    id: "log-001",
    userId: "usr-admin",
    userName: "Admin SIGEDA",
    action: "CREATE_DOCUMENT",
    entityType: "Document",
    entityId: "doc-001",
    description: "Creation du rapport de production trimestriel",
    ipAddress: "127.0.0.1",
    createdAt: now
  },
  {
    id: "log-002",
    userId: "usr-archiviste",
    userName: "Archiviste Principal",
    action: "VALIDATE_DOCUMENT",
    entityType: "Document",
    entityId: "doc-003",
    description: "Validation et archivage du PV qualite",
    ipAddress: "127.0.0.1",
    createdAt: now
  }
];
