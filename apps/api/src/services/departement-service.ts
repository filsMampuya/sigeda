import type { Departement, DepartementType } from "@sigeda/shared/types";
import { randomUUID } from "node:crypto";

import { HttpError } from "../errors/http-error";

type DepartementRepositoryLike = {
  list: () => Promise<Departement[]>;
  upsert: (entity: Departement) => Promise<Departement>;
};

type CreateDepartementInput = {
  type: DepartementType;
  code: string;
  designation: string;
  parent?: {
    code: string;
    designation: string;
  };
};

const requiredParentTypeByType: Partial<Record<DepartementType, DepartementType>> = {
  Direction: "Direction Generale",
  Service: "Direction",
  Bureau: "Service"
};

export class DepartementService {
  constructor(private readonly repository: DepartementRepositoryLike) {}

  async list() {
    return this.repository.list();
  }

  async getByCode(code: string) {
    const departement = await this.findByCode(code);

    if (!departement) {
      throw new HttpError(404, "Departement not found.");
    }

    return departement;
  }

  async create(input: CreateDepartementInput) {
    const existing = await this.findByCode(input.code);

    if (existing) {
      throw new HttpError(409, "Departement code already exists.");
    }

    const parent = await this.resolveParent(input);
    const timestamp = Date.now();
    const entity: Departement = {
      id: randomUUID(),
      type: input.type,
      code: input.code,
      designation: input.designation,
      parent: parent ? { code: parent.code, designation: parent.designation } : null,
      parents: parent ? [...parent.parents, parent.code] : [],
      dateCreation: timestamp,
      dateDerniereModification: timestamp
    };

    return this.repository.upsert(entity);
  }

  async hierarchy() {
    const departements = await this.list();
    const childrenByParentCode = new Map<string, Departement[]>();
    const roots: Departement[] = [];

    for (const departement of departements) {
      const parentCode = departement.parent?.code;

      if (!parentCode) {
        roots.push(departement);
        continue;
      }

      childrenByParentCode.set(parentCode, [...(childrenByParentCode.get(parentCode) ?? []), departement]);
    }

    const toNode = (departement: Departement): Departement & { children: Array<Departement & { children: unknown[] }> } => ({
      ...departement,
      children: (childrenByParentCode.get(departement.code) ?? [])
        .sort(sortByCode)
        .map((child) => toNode(child))
    });

    return roots.sort(sortByCode).map((root) => toNode(root));
  }

  private async resolveParent(input: CreateDepartementInput) {
    if (input.type === "Direction Generale") {
      return null;
    }

    if (!input.parent) {
      throw new HttpError(400, "Parent is required for this departement type.");
    }

    const parent = await this.findByCode(input.parent.code);

    if (!parent) {
      throw new HttpError(404, "Parent departement not found.");
    }

    const requiredType = requiredParentTypeByType[input.type];

    if (requiredType && parent.type !== requiredType) {
      throw new HttpError(400, `${input.type} parent must be ${requiredType}.`);
    }

    return parent;
  }

  private async findByCode(code: string) {
    const departements = await this.list();
    return departements.find((departement) => departement.code === code) ?? null;
  }
}

function sortByCode(left: Departement, right: Departement) {
  return left.code.localeCompare(right.code);
}

