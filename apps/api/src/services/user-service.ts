import type { Departement, User } from "@sigeda/shared/types";
import { createUserResultSchema, userSchema } from "@sigeda/shared/schemas";
import { randomBytes, randomUUID } from "node:crypto";

import { HttpError } from "../errors/http-error";

type UserRepositoryLike = {
  list: () => Promise<User[]>;
  upsert: (entity: User) => Promise<User>;
};

type DepartementRepositoryLike = {
  list: () => Promise<Departement[]>;
};

type CreateUserInput = {
  personne: {
    nom: string;
    prenom: string;
  };
  profile: {
    code: string;
    designation: string;
  };
  email: string;
  matricule: string;
  bureau: {
    code: string;
    designation: string;
  };
};

export type CreateUserResult = {
  user: User;
  defaultPassword: string;
  mustChangePassword: true;
};

export class UserService {
  constructor(
    private readonly repository: UserRepositoryLike,
    private readonly departementRepository: DepartementRepositoryLike
  ) {}

  async list() {
    const users = await this.repository.list();
    return users.map((user) => userSchema.parse(user));
  }

  async getByMatricule(matricule: string) {
    const user = await this.findByMatricule(matricule);

    if (!user) {
      throw new HttpError(404, "User not found.");
    }

    return user;
  }

  async create(input: CreateUserInput) {
    const existing = await this.findByMatricule(input.matricule);

    if (existing) {
      throw new HttpError(409, "User matricule already exists.");
    }

    const organization = await this.resolveOrganizationFromBureau(input.bureau.code);
    this.assertRoleOrganizationConsistency(input.profile.code, organization.direction);
    const defaultPassword = generateDevelopmentPassword();
    const timestamp = Date.now();
    const entity: User = {
      id: randomUUID(),
      personne: input.personne,
      profile: input.profile,
      role: input.profile.code as User["role"],
      isActive: true,
      email: input.email,
      matricule: input.matricule,
      bureau: {
        code: organization.bureau.code,
        designation: organization.bureau.designation
      },
      dateCreation: timestamp,
      dateDerniereModification: timestamp,
      directionId: organization.direction.id,
      serviceId: organization.service.id,
      bureauId: organization.bureau.id,
      displayName: `${input.personne.nom} ${input.personne.prenom}`.trim()
    };

    const user = userSchema.parse(await this.repository.upsert(entity));

    return createUserResultSchema.parse({
      user,
      defaultPassword,
      mustChangePassword: true
    }) satisfies CreateUserResult;
  }

  private async findByMatricule(matricule: string) {
    const users = await this.list();
    return users.find((user) => user.matricule === matricule) ?? null;
  }

  private async findBureau(code: string) {
    const departements = await this.departementRepository.list();
    const bureau = departements.find((departement) => departement.code === code);

    if (!bureau) {
      throw new HttpError(404, "Bureau not found.");
    }

    if (bureau.type !== "Bureau") {
      throw new HttpError(400, "bureau.code must reference a Bureau departement.");
    }

    return bureau;
  }

  private async resolveOrganizationFromBureau(code: string) {
    const departements = await this.departementRepository.list();
    const bureau = await this.findBureau(code);
    const service = departements.find((departement) => departement.code === bureau.parent?.code);

    if (!service || service.type !== "Service") {
      throw new HttpError(400, "Le bureau doit etre rattache a un service valide.");
    }

    const direction = departements.find((departement) => departement.code === service.parent?.code);

    if (!direction || (direction.type !== "Direction" && direction.type !== "Direction Generale")) {
      throw new HttpError(400, "Le service doit etre rattache a une direction valide.");
    }

    return { bureau, service, direction };
  }

  private assertRoleOrganizationConsistency(role: string, direction: Departement) {
    if (role === "DIRECTION_GENERALE" && direction.type !== "Direction Generale") {
      throw new HttpError(
        400,
        "Le profil Direction generale doit etre rattache exclusivement a une structure relevant de la Direction generale."
      );
    }
  }
}

function generateDevelopmentPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const random = randomBytes(8);
  const token = Array.from(random, (value) => alphabet[value % alphabet.length]).join("");

  return `Sigeda!${token}`;
}

