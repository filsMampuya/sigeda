import type { Departement, DepartementListItem, DepartementType } from "@sigeda/shared/types";
import { randomUUID } from "node:crypto";

import { HttpError } from "../errors/http-error";

type DepartementRepositoryLike = {
  list: () => Promise<Departement[]>;
  getById: (id: string) => Promise<Departement | null>;
  upsert: (entity: Departement) => Promise<Departement>;
};

type CreateDirectionInput = {
  type: "Direction Generale" | "Direction" | "DirectionGenerale";
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
    const timestamp = Date.now();
    let parents: string[] = [];
    const type = input.type === "DirectionGenerale" ? "Direction Generale" : input.type;

    if (type === "Direction") {
      const parent = await this.requireDepartement(input.parentId ?? "", "Direction Generale");
      parents = [parent.code];
    }

    return this.repository.upsert({
      id: randomUUID(),
      type,
      code: input.code,
      designation: input.designation,
      parent: type === "Direction" && parents[0] ? { code: parents[0], designation: parents[0] } : null,
      parents,
      dateCreation: timestamp,
      description: input.description || undefined,
      dateDerniereModification: timestamp,
      updatedAt: timestamp
    });
  }

  async createService(input: CreateChildInput) {
    const parent = await this.requireDepartement(input.parentId, "Direction");
    const timestamp = Date.now();

    return this.repository.upsert({
      id: randomUUID(),
      type: "Service",
      code: input.code,
      designation: input.designation,
      parent: { code: parent.code, designation: parent.designation },
      parents: [...parent.parents, parent.code],
      dateCreation: timestamp,
      description: input.description || undefined,
      dateDerniereModification: timestamp,
      updatedAt: timestamp
    });
  }

  async createBureau(input: CreateChildInput) {
    const parent = await this.requireDepartement(input.parentId, "Service");
    const timestamp = Date.now();

    return this.repository.upsert({
      id: randomUUID(),
      type: "Bureau",
      code: input.code,
      designation: input.designation,
      parent: { code: parent.code, designation: parent.designation },
      parents: [...parent.parents, parent.code],
      dateCreation: timestamp,
      description: input.description || undefined,
      dateDerniereModification: timestamp,
      updatedAt: timestamp
    });
  }

  private async requireDepartement(id: string, type: DepartementType) {
    const departement = await this.repository.getById(id);

    if (!departement || departement.type !== type) {
      throw new HttpError(404, `${type} not found.`);
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
