import type { ArchiveFolder, AuditLog, Departement, DocumentEntity, PhysicalArchive, User } from "@sigeda/shared/types";
import type { DocumentArchive } from "@sigeda/shared/types";

const now = "2026-06-05T09:00:00.000Z";
const nowTimestamp = Date.parse(now);
const demoYear = 2026;

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

const directionAdministrative = {
  id: "DIR_ADM",
  type: "Direction",
  code: "DIR_ADM",
  designation: "Direction Administrative",
  parent: {
    code: directionGenerale.code,
    designation: directionGenerale.designation
  },
  parents: [directionGenerale.code],
  dateCreation: nowTimestamp,
  dateDerniereModification: nowTimestamp
} satisfies Departement;

const directionTechnique = {
  id: "DIR_TECH",
  type: "Direction",
  code: "DIR_TECH",
  designation: "Direction Technique",
  parent: {
    code: directionGenerale.code,
    designation: directionGenerale.designation
  },
  parents: [directionGenerale.code],
  dateCreation: nowTimestamp,
  dateDerniereModification: nowTimestamp
} satisfies Departement;

const directionAudit = {
  id: "DIR_AUDIT",
  type: "Direction",
  code: "DIR_AUDIT",
  designation: "Direction Audit",
  parent: {
    code: directionGenerale.code,
    designation: directionGenerale.designation
  },
  parents: [directionGenerale.code],
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
  directionAdministrative,
  directionTechnique,
  directionAudit,
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
    year: demoYear,
    referenceNumber: 1,
    referenceCode: "DOC-2026",
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
    reference: "DOC-2026-001",
    fileName: "rapport-production.pdf",
    urlFileName: "https://example.com/documents/doc-001.pdf",
    title: "Rapport de production trimestriel",
    subject: "Production trimestrielle",
    description: "Synthese de production et anomalies observees.",
    summary: "Bilan trimestriel de production avec synthese des anomalies.",
    directionId: directionFinances.id,
    serviceId: serviceCompta.id,
    bureauId: bureauCadre.id,
    authorId: "usr-admin",
    authorName: "Admin SIGEDA",
    signerName: "Directeur des Finances",
    emitterDirectionId: directionFinances.id,
    receiverDirectionIds: [directionAdministrative.id, directionTechnique.id],
    copyDirectionIds: [directionAudit.id],
    confidentialityLevel: "INTERNE",
    status: "VALIDE",
    keywords: ["production", "trimestre", "atelier"],
    attachments: [],
    originalFileName: "rapport-production.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 204800,
    storageProvider: "LOCAL",
    fileUrl: "https://example.com/documents/doc-001.pdf",
    filePath: "documents/ADM-001/doc-001.pdf",
    fileKind: "PDF",
    digitizationStatus: "DIGITIZED",
    ocrStatus: "COMPLETED",
    ocrText: "Rapport de production trimestriel",
    ocrExtractedAt: now,
    aiExtractedData: {
      reference: "DOC-2026-001",
      subject: "Production trimestrielle",
      emitterDirectionId: directionFinances.id,
      receiverDirectionIds: [directionAdministrative.id, directionTechnique.id],
      copyDirectionIds: [directionAudit.id],
      documentType: "RAPPORT",
      signerName: "Directeur des Finances",
      confidentialityLevel: "INTERNE",
      summary: "Bilan trimestriel de production avec synthese des anomalies.",
      keywords: ["production", "trimestre", "atelier"]
    },
    version: 3,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "doc-002",
    numeroReference: "DOC-2026-002",
    year: demoYear,
    referenceNumber: 2,
    referenceCode: "DOC-2026",
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
    reference: "DOC-2026-002",
    fileName: "note-securite-scan.jpg",
    urlFileName: "https://example.com/documents/doc-002.pdf",
    title: "Note de securite atelier",
    subject: "Consignes de securite",
    description: "Instructions operationnelles pour zone sensible.",
    summary: "Rappel des procedures de securite pour les zones sensibles.",
    directionId: directionFinances.id,
    serviceId: serviceCompta.id,
    bureauId: bureauCadre.id,
    authorId: "usr-archiviste",
    authorName: "Archiviste Principal",
    signerName: "Chef de service Qualite",
    emitterDirectionId: directionFinances.id,
    receiverDirectionIds: [directionTechnique.id],
    copyDirectionIds: [directionAudit.id],
    confidentialityLevel: "SECRET",
    status: "EN_VALIDATION",
    keywords: ["securite", "atelier", "procedure"],
    attachments: [],
    originalFileName: "note-securite-scan.jpg",
    mimeType: "image/jpeg",
    fileSizeBytes: 184320,
    storageProvider: "LOCAL",
    fileUrl: "https://example.com/documents/doc-002.pdf",
    filePath: "documents/ARCH-001/doc-002.jpg",
    fileKind: "IMAGE",
    digitizationStatus: "DIGITIZED",
    ocrStatus: "COMPLETED",
    ocrText: "Instructions operationnelles pour zone sensible",
    ocrExtractedAt: now,
    aiExtractedData: {
      reference: "DOC-2026-002",
      subject: "Consignes de securite",
      emitterDirectionId: directionFinances.id,
      receiverDirectionIds: [directionTechnique.id],
      copyDirectionIds: [directionAudit.id],
      documentType: "NOTE",
      signerName: "Chef de service Qualite",
      confidentialityLevel: "SECRET",
      summary: "Rappel des procedures de securite pour les zones sensibles.",
      keywords: ["securite", "atelier", "procedure"]
    },
    version: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "doc-003",
    numeroReference: "DOC-2026-003",
    year: demoYear,
    referenceNumber: 3,
    referenceCode: "DOC-2026",
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
    reference: "DOC-2026-003",
    fileName: "pv-qualite.pdf",
    urlFileName: "https://example.com/documents/doc-003.pdf",
    title: "Proces-verbal de reunion qualite",
    subject: "Actions correctives qualite",
    description: "Compte rendu des actions correctives.",
    summary: "Synthese des decisions prises en reunion qualite.",
    directionId: directionFinances.id,
    serviceId: serviceCompta.id,
    bureauId: bureauCadre.id,
    authorId: "usr-chef-service",
    authorName: "Chef Service Qualite",
    signerName: "Directeur des Finances",
    emitterDirectionId: directionFinances.id,
    receiverDirectionIds: [directionAdministrative.id],
    copyDirectionIds: [],
    confidentialityLevel: "CONFIDENTIEL",
    status: "ARCHIVE",
    keywords: ["qualite", "pv", "actions"],
    attachments: [],
    originalFileName: "pv-qualite.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 154002,
    storageProvider: "LOCAL",
    fileUrl: "https://example.com/documents/doc-003.pdf",
    filePath: "documents/QUAL-001/doc-003.pdf",
    fileKind: "PDF",
    digitizationStatus: "DIGITIZED",
    ocrStatus: "COMPLETED",
    ocrText: "Compte rendu des actions correctives",
    ocrExtractedAt: now,
    aiExtractedData: {
      reference: "DOC-2026-003",
      subject: "Actions correctives qualite",
      emitterDirectionId: directionFinances.id,
      receiverDirectionIds: [directionAdministrative.id],
      copyDirectionIds: [],
      documentType: "PV_REUNION",
      signerName: "Directeur des Finances",
      confidentialityLevel: "CONFIDENTIEL",
      summary: "Synthese des decisions prises en reunion qualite.",
      keywords: ["qualite", "pv", "actions"]
    },
    version: 4,
    createdAt: now,
    updatedAt: now,
    archivedAt: now
  }
];

export const seedDocumentArchives: DocumentArchive[] = [
  {
    id: "doc-001__B_CADRE__SORTIE__DIR_ADM",
    year: demoYear,
    documentId: "doc-001",
    ownerDirectionId: directionFinances.id,
    directionId: directionFinances.id,
    serviceId: serviceCompta.id,
    bureauId: bureauCadre.id,
    folderId: `${demoYear}__${bureauCadre.id}__${directionFinances.id}__${directionAdministrative.id}`,
    movementType: "SORTIE",
    archivedAt: now,
    archivedBy: "usr-admin"
  },
  {
    id: "doc-001__B_CADRE__SORTIE__DIR_TECH",
    year: demoYear,
    documentId: "doc-001",
    ownerDirectionId: directionFinances.id,
    directionId: directionFinances.id,
    serviceId: serviceCompta.id,
    bureauId: bureauCadre.id,
    folderId: `${demoYear}__${bureauCadre.id}__${directionFinances.id}__${directionTechnique.id}`,
    movementType: "SORTIE",
    archivedAt: now,
    archivedBy: "usr-admin"
  },
  {
    id: "doc-001__B_CADRE__SORTIE__DIR_AUDIT",
    year: demoYear,
    documentId: "doc-001",
    ownerDirectionId: directionFinances.id,
    directionId: directionFinances.id,
    serviceId: serviceCompta.id,
    bureauId: bureauCadre.id,
    folderId: `${demoYear}__${bureauCadre.id}__${directionFinances.id}__${directionAudit.id}`,
    movementType: "SORTIE",
    archivedAt: now,
    archivedBy: "usr-admin"
  }
];

export const seedPhysicalArchives: PhysicalArchive[] = [
  {
    id: "phy-001",
    documentArchiveId: "doc-001__B_CADRE__SORTIE__DIR_ADM",
    documentId: "doc-001",
    directionId: directionFinances.id,
    partnerDirectionId: directionAdministrative.id,
    year: demoYear,
    folderId: `${demoYear}__${bureauCadre.id}__${directionFinances.id}__${directionAdministrative.id}`,
    movementType: "SORTIE",
    section: "SORTIE",
    site: "Hotel des Monnaies",
    batiment: "Bloc A",
    salle: "Salle Courrier",
    rayon: "R1",
    etagere: "E2",
    classeur: "Classeur Direction Administrative",
    dossier: "Dossier Rapports 2026",
    boiteArchive: "BA-001",
    classementKey: "1",
    createdAt: now,
    updatedAt: now
  }
];

export const seedArchiveFolders: ArchiveFolder[] = [
  {
    id: `${demoYear}__${bureauCadre.id}__${directionFinances.id}__${directionAdministrative.id}`,
    year: demoYear,
    bureauId: bureauCadre.id,
    ownerDirectionId: directionFinances.id,
    directionId: directionFinances.id,
    partnerDirectionId: directionAdministrative.id,
    createdAt: now,
    status: "ACTIVE"
  },
  {
    id: `${demoYear}__${bureauCadre.id}__${directionFinances.id}__${directionTechnique.id}`,
    year: demoYear,
    bureauId: bureauCadre.id,
    ownerDirectionId: directionFinances.id,
    directionId: directionFinances.id,
    partnerDirectionId: directionTechnique.id,
    createdAt: now,
    status: "ACTIVE"
  },
  {
    id: `${demoYear}__${bureauCadre.id}__${directionFinances.id}__${directionAudit.id}`,
    year: demoYear,
    bureauId: bureauCadre.id,
    ownerDirectionId: directionFinances.id,
    directionId: directionFinances.id,
    partnerDirectionId: directionAudit.id,
    createdAt: now,
    status: "ACTIVE"
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
