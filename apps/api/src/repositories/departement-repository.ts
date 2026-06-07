import type { Firestore } from "firebase-admin/firestore";
import type { Departement } from "@sigeda/shared/types";

export class DepartementRepository {
  private seedPromise: Promise<void> | null = null;
  private readonly collectionName = "departements";

  constructor(
    private readonly db: Firestore | null,
    private readonly seedData: Departement[] = []
  ) {}

  async list() {
    if (!this.db) {
      throw new Error(`Firestore is not configured for collection ${this.collectionName}.`);
    }

    await this.ensureSeeded();
    const snapshot = await this.db.collection(this.collectionName).get();
    return snapshot.docs.map((doc) => normalizeDepartement(doc.id, doc.data()));
  }

  async getById(id: string) {
    return this.getByCode(id);
  }

  async getByCode(code: string) {
    if (!this.db) {
      throw new Error(`Firestore is not configured for collection ${this.collectionName}.`);
    }

    await this.ensureSeeded();
    const snapshot = await this.db.collection(this.collectionName).where("code", "==", code).limit(1).get();
    return snapshot.empty ? null : normalizeDepartement(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async upsert(entity: Departement) {
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
          const existing = await collectionRef.where("code", "==", entity.code).limit(1).get();

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

function normalizeDepartement(id: string, record: Record<string, unknown> | undefined): Departement {
  if (!record) {
    throw new Error("Invalid departement record.");
  }

  const timestamp = Date.now();
  const entityId = typeof record.id === "string" ? record.id : id;

  return {
    id: entityId,
    type: record.type as Departement["type"],
    code: String(record.code ?? id),
    designation: String(record.designation ?? ""),
    parent:
      typeof record.parent === "object" && record.parent
        ? {
            code: String((record.parent as Record<string, unknown>).code ?? ""),
            designation: String((record.parent as Record<string, unknown>).designation ?? "")
          }
        : null,
    parents: Array.isArray(record.parents) ? record.parents.map((parentCode) => String(parentCode)) : [],
    dateCreation: typeof record.dateCreation === "number" ? record.dateCreation : timestamp,
    dateDerniereModification:
      typeof record.dateDerniereModification === "number"
        ? record.dateDerniereModification
        : typeof record.updatedAt === "number"
          ? record.updatedAt
          : timestamp,
    description: typeof record.description === "string" ? record.description : undefined,
    updatedAt:
      typeof record.updatedAt === "string" || typeof record.updatedAt === "number" ? record.updatedAt : undefined
  };
}

function removeUndefined<T extends object>(record: T) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  ) as T;
}
