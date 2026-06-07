import type { Firestore } from "firebase-admin/firestore";
import type { User } from "@sigeda/shared/types";

export class UserRepository {
  private seedPromise: Promise<void> | null = null;
  private readonly collectionName = "users";

  constructor(
    private readonly db: Firestore | null,
    private readonly seedData: User[] = []
  ) {}

  async list() {
    if (!this.db) {
      throw new Error(`Firestore is not configured for collection ${this.collectionName}.`);
    }

    await this.ensureSeeded();
    const snapshot = await this.db.collection(this.collectionName).get();
    return snapshot.docs.map((doc) => normalizeUser(doc.id, doc.data()));
  }

  async getById(id: string) {
    if (!this.db) {
      throw new Error(`Firestore is not configured for collection ${this.collectionName}.`);
    }

    await this.ensureSeeded();
    const byDocumentId = await this.db.collection(this.collectionName).doc(id).get();

    if (byDocumentId.exists) {
      return normalizeUser(byDocumentId.id, byDocumentId.data());
    }

    const byFirebaseId = await this.db.collection(this.collectionName).where("id", "==", id).limit(1).get();
    return byFirebaseId.empty ? null : normalizeUser(byFirebaseId.docs[0].id, byFirebaseId.docs[0].data());
  }

  async getByMatricule(matricule: string) {
    if (!this.db) {
      throw new Error(`Firestore is not configured for collection ${this.collectionName}.`);
    }

    await this.ensureSeeded();
    const snapshot = await this.db.collection(this.collectionName).where("matricule", "==", matricule).limit(1).get();
    return snapshot.empty ? null : normalizeUser(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async upsert(entity: User) {
    if (!this.db) {
      throw new Error(`Firestore is not configured for collection ${this.collectionName}.`);
    }

    await this.ensureSeeded();
    await this.db.collection(this.collectionName).doc(entity.id).set(removeUndefined(entity), { merge: true });
    return entity;
  }

  private async ensureSeeded() {
    if (!this.db || this.seedData.length === 0) {
      return;
    }

    if (!this.seedPromise) {
      this.seedPromise = (async () => {
        const collectionRef = this.db!.collection(this.collectionName);
        const batch = this.db!.batch();

        for (const entity of this.seedData) {
          const existing = await collectionRef.where("matricule", "==", entity.matricule).limit(1).get();

          if (existing.empty) {
            batch.set(collectionRef.doc(entity.id), removeUndefined(entity), { merge: true });
          }
        }

        await batch.commit();
      })();
    }

    await this.seedPromise;
  }
}

function normalizeUser(id: string, record: Record<string, unknown> | undefined): User {
  if (!record) {
    throw new Error("Invalid user record.");
  }

  const timestamp = Date.now();
  const entityId = typeof record.id === "string" ? record.id : id;

  return {
    id: entityId,
    email: typeof record.email === "string" ? record.email : undefined,
    role: record.role as User["role"],
    isActive: typeof record.isActive === "boolean" ? record.isActive : undefined,
    updatedAt:
      typeof record.updatedAt === "string" || typeof record.updatedAt === "number" ? record.updatedAt : undefined,
    personne:
      typeof record.personne === "object" && record.personne
        ? {
            nom: String((record.personne as Record<string, unknown>).nom ?? ""),
            prenom: String((record.personne as Record<string, unknown>).prenom ?? "")
          }
        : { nom: "", prenom: "" },
    profile:
      typeof record.profile === "object" && record.profile
        ? {
            code: String((record.profile as Record<string, unknown>).code ?? "AGENT"),
            designation: String((record.profile as Record<string, unknown>).designation ?? "Agent")
          }
        : {
            code: typeof record.role === "string" ? String(record.role) : "AGENT",
            designation: typeof record.role === "string" ? humanizeRole(String(record.role)) : "Agent"
          },
    matricule: String(record.matricule ?? id),
    bureau:
      typeof record.bureau === "object" && record.bureau
        ? {
            code: String((record.bureau as Record<string, unknown>).code ?? ""),
            designation: String((record.bureau as Record<string, unknown>).designation ?? "")
          }
        : null,
    dateCreation: typeof record.dateCreation === "number" ? record.dateCreation : timestamp,
    dateDerniereModification:
      typeof record.dateDerniereModification === "number"
        ? record.dateDerniereModification
        : typeof record.updatedAt === "number"
          ? record.updatedAt
          : timestamp,
    directionId: typeof record.directionId === "string" ? record.directionId : null,
    serviceId: typeof record.serviceId === "string" ? record.serviceId : null,
    bureauId: typeof record.bureauId === "string" ? record.bureauId : null,
    displayName: typeof record.displayName === "string" ? record.displayName : undefined
  };
}

function humanizeRole(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`)
    .join(" ");
}

function removeUndefined<T extends object>(record: T) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  ) as T;
}
