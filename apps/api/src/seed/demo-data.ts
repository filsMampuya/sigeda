import type { AuditLog, Departement, DocumentEntity, User } from "@sigeda/shared/types";

const now = "2026-06-05T09:00:00.000Z";
const nowTimestamp = Date.parse(now);

const directionGenerale = {
  id: "DG",
  type: "Direction Generale",
  code: "DG",
  designation: "Direction Generale",
  parent: null,
  parents: [],
  dateCreation: nowTimestamp,
  dateDerniereModification: nowTimestamp
} satisfies Departement;

const directionFinances = {
  id: "DIR_FIN",
  type: "Direction",
  code: "DIR_FIN",
  designation: "Direction des Finances",
  parent: {
    code: directionGenerale.code,
    designation: directionGenerale.designation
  },
  parents: [directionGenerale.code],
  dateCreation: nowTimestamp,
  dateDerniereModification: nowTimestamp
} satisfies Departement;

const serviceCompta = {
  id: "SRV_COMPTA",
  type: "Service",
  code: "SRV_COMPTA",
  designation: "Service Comptabilite",
  parent: {
    code: directionFinances.code,
    designation: directionFinances.designation
  },
  parents: [directionGenerale.code, directionFinances.code],
  dateCreation: nowTimestamp,
  dateDerniereModification: nowTimestamp
} satisfies Departement;

const bureauCadre = {
  id: "B_CADRE",
  type: "Bureau",
  code: "B_CADRE",
  designation: "Bureau du Cadre",
  parent: {
    code: serviceCompta.code,
    designation: serviceCompta.designation
  },
  parents: [directionGenerale.code, directionFinances.code, serviceCompta.code],
  dateCreation: nowTimestamp,
  dateDerniereModification: nowTimestamp
} satisfies Departement;

export const seedDepartements: Departement[] = [
  directionGenerale,
  directionFinances,
  serviceCompta,
  bureauCadre
];

export const seedUsers: User[] = [
  {
    id: "usr-admin",
    email: "admin@sigeda.local",
    role: "ADMIN",
    isActive: true,
    updatedAt: now,
    personne: { nom: "Admin", prenom: "SIGEDA" },
    profile: {
      code: "ADMIN",
      designation: "Administrateur"
    },
    matricule: "ADM-001",
    bureau: {
      code: bureauCadre.code,
      designation: bureauCadre.designation
    },
    dateCreation: nowTimestamp,
    dateDerniereModification: nowTimestamp,
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
    profile: {
      code: "ARCHIVISTE",
      designation: "Archiviste"
    },
    matricule: "ARCH-001",
    bureau: {
      code: bureauCadre.code,
      designation: bureauCadre.designation
    },
    dateCreation: nowTimestamp,
    dateDerniereModification: nowTimestamp,
    directionId: directionFinances.id,
    serviceId: serviceCompta.id,
    bureauId: bureauCadre.id,
    displayName: "Archiviste Principal"
  },
  {
    id: "usr-chef-service",
    email: "chef.service@sigeda.local",
    role: "CHEF_SERVICE",
    isActive: true,
    updatedAt: now,
    personne: { nom: "Chef", prenom: "Qualite" },
    profile: {
      code: "CHEF_SERVICE",
      designation: "Chef service"
    },
    matricule: "QUAL-001",
    bureau: {
      code: bureauCadre.code,
      designation: bureauCadre.designation
    },
    dateCreation: nowTimestamp,
    dateDerniereModification: nowTimestamp,
    directionId: directionFinances.id,
    serviceId: serviceCompta.id,
    bureauId: bureauCadre.id,
    displayName: "Chef Service Qualite"
  },
  {
    id: "IK2zPG5BuhRuRuzq47XD4CIEyzJ3",
    email: "agent.demo.20260606@sigeda.local",
    role: "AGENT",
    isActive: true,
    updatedAt: now,
    personne: { nom: "Demo", prenom: "Agent" },
    profile: {
      code: "AGENT",
      designation: "Agent"
    },
    matricule: "AGT-2026-001",
    bureau: {
      code: bureauCadre.code,
      designation: bureauCadre.designation
    },
    dateCreation: nowTimestamp,
    dateDerniereModification: nowTimestamp,
    directionId: directionFinances.id,
    serviceId: serviceCompta.id,
    bureauId: bureauCadre.id,
    displayName: "Agent Demo"
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
      id: directionFinances.id,
      code: directionFinances.code,
      designation: directionFinances.designation
    },
    dateDerniereModication: now,
    fileName: "rapport-production.pdf",
    urlFileName: "https://example.com/documents/doc-001.pdf",
    title: "Rapport de production trimestriel",
    description: "Synthese de production et anomalies observees.",
    directionId: directionFinances.id,
    serviceId: serviceCompta.id,
    bureauId: bureauCadre.id,
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
      id: directionFinances.id,
      code: directionFinances.code,
      designation: directionFinances.designation
    },
    dateDerniereModication: now,
    fileName: "note-securite-scan.jpg",
    urlFileName: "https://example.com/documents/doc-002.pdf",
    title: "Note de securite atelier",
    description: "Instructions operationnelles pour zone sensible.",
    directionId: directionFinances.id,
    serviceId: serviceCompta.id,
    bureauId: bureauCadre.id,
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
      id: directionFinances.id,
      code: directionFinances.code,
      designation: directionFinances.designation
    },
    dateDerniereModication: now,
    fileName: "pv-qualite.pdf",
    urlFileName: "https://example.com/documents/doc-003.pdf",
    title: "Proces-verbal de reunion qualite",
    description: "Compte rendu des actions correctives.",
    directionId: directionFinances.id,
    serviceId: serviceCompta.id,
    bureauId: bureauCadre.id,
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
