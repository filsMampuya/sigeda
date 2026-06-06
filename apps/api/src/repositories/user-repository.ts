import type { Firestore } from "firebase-admin/firestore";
import type { User } from "@sigeda/shared/types";

export class UserRepository {
  private seedPromise: Promise<void> | null = null;

  constructor(
    private readonly db: Firestore | null,
    private readonly seedData: User[] = []
  ) {}

  async list() {
    if (!this.db) {
      throw new Error("Firestore is not configured for collection User.");
    }

    await this.ensureSeeded();
    const snapshot = await this.db.collection("User").get();
    return snapshot.docs.map((doc) => normalizeUser(doc.data()));
  }

  async getById(id: string) {
    if (!this.db) {
      throw new Error("Firestore is not configured for collection User.");
    }

    await this.ensureSeeded();
    const snapshot = await this.db.collection("User").doc(id).get();
    return snapshot.exists ? normalizeUser(snapshot.data()) : null;
  }

  async upsert(entity: User) {
    if (!this.db) {
      throw new Error("Firestore is not configured for collection User.");
    }

    await this.db.collection("User").doc(entity.id).set(entity, { merge: true });
    return entity;
  }

  private async ensureSeeded() {
    if (!this.db || this.seedData.length === 0) {
      return;
    }

    if (!this.seedPromise) {
      this.seedPromise = (async () => {
        const collectionRef = this.db!.collection("User");
        const existing = await collectionRef.limit(1).get();

        if (!existing.empty) {
          return;
        }

        const batch = this.db!.batch();

        for (const entity of this.seedData) {
          batch.set(collectionRef.doc(entity.id), entity, { merge: true });
        }

        await batch.commit();
      })();
    }

    await this.seedPromise;
  }
}

function normalizeUser(record: Record<string, unknown> | undefined): User {
  if (!record) {
    throw new Error("Invalid User record.");
  }

  return {
    id: String(record.id),
    email: String(record.email ?? ""),
    role: record.role as User["role"],
    isActive: Boolean(record.isActive ?? true),
    updatedAt: String(record.updatedAt ?? record.dateCreation ?? new Date().toISOString()),
    personne:
      typeof record.personne === "object" && record.personne
        ? {
            nom: String((record.personne as Record<string, unknown>).nom ?? ""),
            prenom: String((record.personne as Record<string, unknown>).prenom ?? "")
          }
        : { nom: "", prenom: "" },
    matricule: String(record.matricule ?? record.id ?? "INCONNU"),
    bureau:
      typeof record.bureau === "object" && record.bureau
        ? {
            id: String((record.bureau as Record<string, unknown>).id ?? ""),
            type: "Bureau",
            code: String((record.bureau as Record<string, unknown>).code ?? ""),
            designation: String((record.bureau as Record<string, unknown>).designation ?? "")
          }
        : null,
    dateCreation: String(record.dateCreation ?? record.createdAt ?? new Date().toISOString()),
    directionId: typeof record.directionId === "string" ? record.directionId : null,
    serviceId: typeof record.serviceId === "string" ? record.serviceId : null,
    bureauId: typeof record.bureauId === "string" ? record.bureauId : null,
    displayName: typeof record.displayName === "string" ? record.displayName : undefined
  };
}
