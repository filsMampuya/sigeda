import type { Departement, DepartementListItem, DepartementType } from "@sigeda/shared/types";
import { randomUUID } from "node:crypto";

type DepartementRepositoryLike = {
  list: () => Promise<Departement[]>;
  getById: (id: string) => Promise<Departement | null>;
  upsert: (entity: Departement) => Promise<Departement>;
};

type CreateDirectionInput = {
  type: "DirectionGenerale" | "Direction";
  code: string;
  designation: string;
  parentId?: string;
  description?: string;
};

type CreateChildInput = {
  parentId: string;
  code: string;
  designation: string;
  description?: string;
};

export class OrganizationService {
  constructor(private readonly repository: DepartementRepositoryLike) {}

  async listByTypes(types: DepartementType[]) {
    const departements = await this.repository.list();
    const matches = departements.filter((departement) => types.includes(departement.type));
    return enrichDepartements(matches, departements);
  }

  async listByType(type: DepartementType) {
    return this.listByTypes([type]);
  }

  async listAll() {
    const departements = await this.repository.list();
    return enrichDepartements(departements, departements);
  }

  async getById(id: string) {
    return this.repository.getById(id);
  }

  async createDirection(input: CreateDirectionInput) {
    const timestamp = new Date().toISOString();
    let parents: string[] = [];

    if (input.type === "Direction") {
      const parent = await this.requireDepartement(input.parentId ?? "", "DirectionGenerale");
      parents = [parent.id];
    }

    return this.repository.upsert({
      id: randomUUID(),
      type: input.type,
      code: input.code,
      designation: input.designation,
      parents,
      dateCreation: timestamp,
      description: input.description || undefined,
      updatedAt: timestamp
    });
  }

  async createService(input: CreateChildInput) {
    const parent = await this.requireDepartement(input.parentId, "Direction");
    const timestamp = new Date().toISOString();

    return this.repository.upsert({
      id: randomUUID(),
      type: "Service",
      code: input.code,
      designation: input.designation,
      parents: [parent.id],
      dateCreation: timestamp,
      description: input.description || undefined,
      updatedAt: timestamp
    });
  }

  async createBureau(input: CreateChildInput) {
    const parent = await this.requireDepartement(input.parentId, "Service");
    const timestamp = new Date().toISOString();

    return this.repository.upsert({
      id: randomUUID(),
      type: "Bureau",
      code: input.code,
      designation: input.designation,
      parents: [parent.id],
      dateCreation: timestamp,
      description: input.description || undefined,
      updatedAt: timestamp
    });
  }

  private async requireDepartement(id: string, type: DepartementType) {
    const departement = await this.repository.getById(id);

    if (!departement || departement.type !== type) {
      throw new Error(`${type} not found.`);
    }

    return departement;
  }
}

function enrichDepartements(
  departements: Departement[],
  allDepartements: Departement[]
): DepartementListItem[] {
  const departementMap = new Map(allDepartements.map((departement) => [departement.id, departement]));

  return departements.map((departement) => {
    const parentId = departement.parents.at(-1) ?? null;
    const parent = parentId ? departementMap.get(parentId) ?? null : null;

    return {
      ...departement,
      parentId,
      parentDesignation: parent?.designation ?? null
    };
  });
}
