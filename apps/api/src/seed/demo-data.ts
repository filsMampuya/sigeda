import type { AuditLog, Departement, DocumentEntity, User } from "@sigeda/shared/types";

const now = "2026-06-05T09:00:00.000Z";

const directionGenerale = {
  id: "dir-gen-01",
  type: "DirectionGenerale",
  code: "DG",
  designation: "Direction Generale",
  parents: [],
  dateCreation: now,
  description: "Pilotage strategique",
  updatedAt: now
} satisfies Departement;

const directionProduction = {
  id: "dir-prod",
  type: "Direction",
  code: "DPR",
  designation: "Direction de la Production",
  parents: [directionGenerale.id],
  dateCreation: now,
  description: "Production et fabrication",
  updatedAt: now
} satisfies Departement;

const directionSecurite = {
  id: "dir-sec",
  type: "Direction",
  code: "DSI",
  designation: "Direction de la Securite",
  parents: [directionGenerale.id],
  dateCreation: now,
  description: "Surete et controle",
  updatedAt: now
} satisfies Departement;

const servicePlanification = {
  id: "srv-prod-plan",
  type: "Service",
  code: "PLAN",
  designation: "Service Planification",
  parents: [directionProduction.id],
  dateCreation: now,
  description: "Planification documentaire",
  updatedAt: now
} satisfies Departement;

const serviceQualite = {
  id: "srv-prod-qual",
  type: "Service",
  code: "QUAL",
  designation: "Service Qualite",
  parents: [directionProduction.id],
  dateCreation: now,
  description: "Controle qualite",
  updatedAt: now
} satisfies Departement;

const serviceArchivesSensibles = {
  id: "srv-sec-arch",
  type: "Service",
  code: "ARCH",
  designation: "Service Archives Sensibles",
  parents: [directionSecurite.id],
  dateCreation: now,
  description: "Protection documentaire",
  updatedAt: now
} satisfies Departement;

const bureauPlanification = {
  id: "bur-plan-01",
  type: "Bureau",
  code: "BPLAN",
  designation: "Bureau Planification",
  parents: [servicePlanification.id],
  dateCreation: now,
  description: "Suivi des references",
  updatedAt: now
} satisfies Departement;

const bureauQualite = {
  id: "bur-qual-01",
  type: "Bureau",
  code: "BQUAL",
  designation: "Bureau Qualite",
  parents: [serviceQualite.id],
  dateCreation: now,
  description: "Validation et controle",
  updatedAt: now
} satisfies Departement;

const bureauArchivesSensibles = {
  id: "bur-arch-01",
  type: "Bureau",
  code: "BARCH",
  designation: "Bureau Archives Sensibles",
  parents: [serviceArchivesSensibles.id],
  dateCreation: now,
  description: "Archives securisees",
  updatedAt: now
} satisfies Departement;

export const seedDepartements: Departement[] = [
  directionGenerale,
  directionProduction,
  directionSecurite,
  servicePlanification,
  serviceQualite,
  serviceArchivesSensibles,
  bureauPlanification,
  bureauQualite,
  bureauArchivesSensibles
];

export const seedUsers: User[] = [
  {
    id: "usr-admin",
    email: "admin@sigeda.local",
    role: "ADMIN",
    isActive: true,
    updatedAt: now,
    personne: { nom: "Admin", prenom: "SIGEDA" },
    matricule: "ADM-001",
    bureau: null,
    dateCreation: now,
    directionId: null,
    serviceId: null,
    bureauId: null,
    displayName: "Admin SIGEDA"
  },
  {
    id: "usr-archiviste",
    email: "archiviste@sigeda.local",
    role: "ARCHIVISTE",
    isActive: true,
    updatedAt: now,
    personne: { nom: "Archiviste", prenom: "Principal" },
    matricule: "ARCH-001",
    bureau: {
      id: bureauArchivesSensibles.id,
      type: "Bureau",
      code: bureauArchivesSensibles.code,
      designation: bureauArchivesSensibles.designation
    },
    dateCreation: now,
    directionId: directionSecurite.id,
    serviceId: serviceArchivesSensibles.id,
    bureauId: bureauArchivesSensibles.id,
    displayName: "Archiviste Principal"
  },
  {
    id: "usr-chef-service",
    email: "chef.service@sigeda.local",
    role: "CHEF_SERVICE",
    isActive: true,
    updatedAt: now,
    personne: { nom: "Chef", prenom: "Qualite" },
    matricule: "QUAL-001",
    bureau: {
      id: bureauQualite.id,
      type: "Bureau",
      code: bureauQualite.code,
      designation: bureauQualite.designation
    },
    dateCreation: now,
    directionId: directionProduction.id,
    serviceId: serviceQualite.id,
    bureauId: bureauQualite.id,
    displayName: "Chef Service Qualite"
  }
];

export const seedDocuments: DocumentEntity[] = [
  {
    id: "doc-001",
    numeroReference: "DOC-2026-001",
    dateCreation: now,
    user: {
      id: "usr-admin",
      nom: "Admin",
      prenom: "SIGEDA",
      matricule: "ADM-001",
      email: "admin@sigeda.local"
    },
    type: "RAPPORT",
    direction: {
      id: directionProduction.id,
      code: directionProduction.code,
      designation: directionProduction.designation
    },
    dateDerniereModication: now,
    fileName: "rapport-production.pdf",
    urlFileName: "https://example.com/documents/doc-001.pdf",
    title: "Rapport de production trimestriel",
    description: "Synthese de production et anomalies observees.",
    directionId: directionProduction.id,
    serviceId: servicePlanification.id,
    bureauId: bureauPlanification.id,
    authorId: "usr-admin",
    confidentialityLevel: "INTERNE",
    status: "VALIDE",
    keywords: ["production", "trimestre", "atelier"],
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
    numeroReference: "DOC-2026-002",
    dateCreation: now,
    user: {
      id: "usr-archiviste",
      nom: "Archiviste",
      prenom: "Principal",
      matricule: "ARCH-001",
      email: "archiviste@sigeda.local"
    },
    type: "NOTE",
    direction: {
      id: directionSecurite.id,
      code: directionSecurite.code,
      designation: directionSecurite.designation
    },
    dateDerniereModication: now,
    fileName: "note-securite-scan.jpg",
    urlFileName: "https://example.com/documents/doc-002.pdf",
    title: "Note de securite atelier",
    description: "Instructions operationnelles pour zone sensible.",
    directionId: directionSecurite.id,
    serviceId: serviceArchivesSensibles.id,
    bureauId: bureauArchivesSensibles.id,
    authorId: "usr-archiviste",
    confidentialityLevel: "SECRET",
    status: "EN_VALIDATION",
    keywords: ["securite", "atelier", "procedure"],
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
    numeroReference: "DOC-2026-003",
    dateCreation: now,
    user: {
      id: "usr-chef-service",
      nom: "Chef",
      prenom: "Qualite",
      matricule: "QUAL-001",
      email: "chef.service@sigeda.local"
    },
    type: "PV_REUNION",
    direction: {
      id: directionProduction.id,
      code: directionProduction.code,
      designation: directionProduction.designation
    },
    dateDerniereModication: now,
    fileName: "pv-qualite.pdf",
    urlFileName: "https://example.com/documents/doc-003.pdf",
    title: "Proces-verbal de reunion qualite",
    description: "Compte rendu des actions correctives.",
    directionId: directionProduction.id,
    serviceId: serviceQualite.id,
    bureauId: bureauQualite.id,
    authorId: "usr-chef-service",
    confidentialityLevel: "CONFIDENTIEL",
    status: "ARCHIVE",
    keywords: ["qualite", "pv", "actions"],
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
