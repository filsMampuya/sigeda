import type { Firestore } from "firebase-admin/firestore";

export class FirestoreRepository<T extends { id: string }> {
  constructor(
    private readonly db: Firestore | null,
    private readonly collectionName: string
  ) {}

  async list(): Promise<T[]> {
    if (!this.db) {
      throw new Error(`Firestore is not configured for collection ${this.collectionName}.`);
    }
    const snapshot = await this.db.collection(this.collectionName).get();
    return snapshot.docs.map((doc) => doc.data() as T);
  }

  async getById(id: string): Promise<T | null> {
    if (!this.db) {
      throw new Error(`Firestore is not configured for collection ${this.collectionName}.`);
    }
    const snapshot = await this.db.collection(this.collectionName).doc(id).get();
    return snapshot.exists ? (snapshot.data() as T) : null;
  }

  async upsert(entity: T): Promise<T> {
    if (!this.db) {
      throw new Error(`Firestore is not configured for collection ${this.collectionName}.`);
    }
    await this.db.collection(this.collectionName).doc(entity.id).set(entity, { merge: true });
    return entity;
  }
}
