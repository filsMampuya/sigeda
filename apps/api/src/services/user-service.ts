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

    const bureau = await this.findBureau(input.bureau.code);
    const defaultPassword = generateDevelopmentPassword();
    const timestamp = Date.now();
    const entity: User = {
      id: randomUUID(),
      personne: input.personne,
      profile: input.profile,
      email: input.email,
      matricule: input.matricule,
      bureau: {
        code: bureau.code,
        designation: bureau.designation
      },
      dateCreation: timestamp,
      dateDerniereModification: timestamp
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
}

function generateDevelopmentPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const random = randomBytes(8);
  const token = Array.from(random, (value) => alphabet[value % alphabet.length]).join("");

  return `Sigeda!${token}`;
}

