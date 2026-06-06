import type { Firestore } from "firebase-admin/firestore";
import type { Departement, DepartementType } from "@sigeda/shared/types";

type LegacyDirectionRecord = {
  id: string;
  code: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

type LegacyServiceRecord = {
  id: string;
  directionId: string;
  code: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

type LegacyBureauRecord = {
  id: string;
  directionId: string;
  serviceId: string;
  code: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

export class DepartementRepository {
  private seedPromise: Promise<void> | null = null;

  constructor(
    private readonly db: Firestore | null,
    private readonly seedData: Departement[] = []
  ) {}

  async list() {
    if (!this.db) {
      throw new Error("Firestore is not configured for collection Departement.");
    }

    await this.ensureSeeded();
    const canonicalSnapshot = await this.db.collection("Departement").get();

    if (!canonicalSnapshot.empty) {
      return canonicalSnapshot.docs.map((doc) => normalizeDepartement(doc.data()));
    }

    return this.listLegacy();
  }

  async getById(id: string) {
    if (!this.db) {
      throw new Error("Firestore is not configured for collection Departement.");
    }

    await this.ensureSeeded();
    const canonicalSnapshot = await this.db.collection("Departement").doc(id).get();

    if (canonicalSnapshot.exists) {
      return normalizeDepartement(canonicalSnapshot.data());
    }

    const legacyItems = await this.listLegacy();
    return legacyItems.find((item) => item.id === id) ?? null;
  }

  async upsert(entity: Departement) {
    if (!this.db) {
      throw new Error("Firestore is not configured for collection Departement.");
    }

    await this.db.collection("Departement").doc(entity.id).set(entity, { merge: true });
    return entity;
  }

  private async listLegacy() {
    if (!this.db) {
      return [];
    }

    const [directions, services, bureaux] = await Promise.all([
      this.db.collection("directions").get(),
      this.db.collection("services").get(),
      this.db.collection("bureaux").get()
    ]);

    const directionRecords = directions.docs.map((doc) => doc.data() as LegacyDirectionRecord);
    const serviceRecords = services.docs.map((doc) => doc.data() as LegacyServiceRecord);

    return [
      ...directionRecords.map(mapLegacyDirection),
      ...serviceRecords.map(mapLegacyService),
      ...bureaux.docs.map((doc) => mapLegacyBureau(doc.data() as LegacyBureauRecord))
    ];
  }

  private async ensureSeeded() {
    if (!this.db || this.seedData.length === 0) {
      return;
    }

    if (!this.seedPromise) {
      this.seedPromise = (async () => {
        const canonicalCollection = this.db!.collection("Departement");
        const existingCanonical = await canonicalCollection.limit(1).get();

        if (!existingCanonical.empty) {
          return;
        }

        const [legacyDirections, legacyServices, legacyBureaux] = await Promise.all([
          this.db!.collection("directions").limit(1).get(),
          this.db!.collection("services").limit(1).get(),
          this.db!.collection("bureaux").limit(1).get()
        ]);

        if (!legacyDirections.empty || !legacyServices.empty || !legacyBureaux.empty) {
          return;
        }

        const batch = this.db!.batch();

        for (const entity of this.seedData) {
          batch.set(canonicalCollection.doc(entity.id), entity, { merge: true });
        }

        await batch.commit();
      })();
    }

    await this.seedPromise;
  }
}

function mapLegacyDirection(direction: LegacyDirectionRecord): Departement {
  return {
    id: direction.id,
    type: inferLegacyDirectionType(direction),
    code: direction.code,
    designation: direction.name,
    parents: [],
    dateCreation: direction.createdAt ?? direction.updatedAt ?? new Date().toISOString(),
    description: direction.description,
    updatedAt: direction.updatedAt ?? direction.createdAt
  };
}

function mapLegacyService(service: LegacyServiceRecord): Departement {
  return {
    id: service.id,
    type: "Service",
    code: service.code,
    designation: service.name,
    parents: [service.directionId],
    dateCreation: service.createdAt ?? service.updatedAt ?? new Date().toISOString(),
    description: service.description,
    updatedAt: service.updatedAt ?? service.createdAt
  };
}

function mapLegacyBureau(bureau: LegacyBureauRecord): Departement {
  return {
    id: bureau.id,
    type: "Bureau",
    code: bureau.code,
    designation: bureau.name,
    parents: [bureau.serviceId],
    dateCreation: bureau.createdAt ?? bureau.updatedAt ?? new Date().toISOString(),
    description: bureau.description,
    updatedAt: bureau.updatedAt ?? bureau.createdAt
  };
}

function inferLegacyDirectionType(direction: LegacyDirectionRecord): DepartementType {
  if (direction.code === "DG" || direction.name.toLowerCase().includes("generale")) {
    return "DirectionGenerale";
  }

  return "Direction";
}

function normalizeDepartement(record: Record<string, unknown> | undefined): Departement {
  if (!record) {
    throw new Error("Invalid Departement record.");
  }

  return {
    id: String(record.id),
    type: record.type as DepartementType,
    code: String(record.code),
    designation: String(record.designation),
    parents: Array.isArray(record.parents) ? record.parents.map((parentId) => String(parentId)) : [],
    dateCreation: String(record.dateCreation ?? record.createdAt ?? new Date().toISOString()),
    description: typeof record.description === "string" ? record.description : undefined,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : undefined
  };
}
