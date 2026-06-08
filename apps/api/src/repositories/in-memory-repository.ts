export class InMemoryRepository<T extends { id: string }> {
  private readonly items = new Map<string, T>();

  constructor(initialData: T[] = []) {
    initialData.forEach((item) => {
      this.items.set(item.id, item);
    });
  }

  async list(): Promise<T[]> {
    return Array.from(this.items.values());
  }

  async getById(id: string): Promise<T | null> {
    return this.items.get(id) ?? null;
  }

  async upsert(entity: T): Promise<T> {
    this.items.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}
