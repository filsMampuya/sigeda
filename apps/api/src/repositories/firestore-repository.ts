import type { Firestore } from "firebase-admin/firestore";

export class FirestoreRepository<T extends { id: string }> {
  private seedPromise: Promise<void> | null = null;

  constructor(
    private readonly db: Firestore | null,
    private readonly collectionName: string,
    private readonly seedData: T[] = []
  ) {}

  async list(): Promise<T[]> {
    if (!this.db) {
      throw new Error(`Firestore is not configured for collection ${this.collectionName}.`);
    }
    await this.ensureSeeded();
    const snapshot = await this.db.collection(this.collectionName).get();
    return snapshot.docs.map((doc) => doc.data() as T);
  }

  async getById(id: string): Promise<T | null> {
    if (!this.db) {
      throw new Error(`Firestore is not configured for collection ${this.collectionName}.`);
    }
    await this.ensureSeeded();
    const snapshot = await this.db.collection(this.collectionName).doc(id).get();
    return snapshot.exists ? (snapshot.data() as T) : null;
  }

  async upsert(entity: T): Promise<T> {
    if (!this.db) {
      throw new Error(`Firestore is not configured for collection ${this.collectionName}.`);
    }
    await this.ensureSeeded();
    await this.db.collection(this.collectionName).doc(entity.id).set(entity, { merge: true });
    return entity;
  }

  async delete(id: string): Promise<void> {
    if (!this.db) {
      throw new Error(`Firestore is not configured for collection ${this.collectionName}.`);
    }
    await this.ensureSeeded();
    await this.db.collection(this.collectionName).doc(id).delete();
  }

  private async ensureSeeded() {
    if (!this.db || this.seedData.length === 0) {
      return;
    }

    if (!this.seedPromise) {
      this.seedPromise = (async () => {
        const collectionRef = this.db!.collection(this.collectionName);
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
