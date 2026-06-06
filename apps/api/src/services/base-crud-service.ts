import { randomUUID } from "node:crypto";

export class BaseCrudService<T extends { id: string }> {
  constructor(
    private readonly repository: {
      list: () => Promise<T[]>;
      getById: (id: string) => Promise<T | null>;
      upsert: (entity: T) => Promise<T>;
    }
  ) {}

  list() {
    return this.repository.list();
  }

  getById(id: string) {
    return this.repository.getById(id);
  }

  create(entity: Omit<T, "id">) {
    const timestamp = new Date().toISOString();
    const nextEntity = {
      ...entity,
      id: randomUUID()
    } as Record<string, unknown>;

    if ("createdAt" in nextEntity) {
      nextEntity.createdAt = timestamp;
    }

    if ("updatedAt" in nextEntity) {
      nextEntity.updatedAt = timestamp;
    }

    return this.repository.upsert(nextEntity as T);
  }

  async update(id: string, entity: Partial<T>) {
    const existing = await this.repository.getById(id);
    const nextEntity = {
      ...(existing as T),
      ...(entity as T),
      id
    } as Record<string, unknown>;

    if (existing && "updatedAt" in existing) {
      nextEntity.updatedAt = new Date().toISOString();
    }

    return this.repository.upsert(nextEntity as T);
  }
}
