import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

type CreateUserInput = {
  keycloakId: string;
  matricule: string;
  email: string;
  nom: string;
  prenom: string;
  roleId: string;
  departmentId?: string | null;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({ include: { role: true, department: true }, orderBy: { matricule: "asc" } });
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true, department: true } });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return user;
  }

  async create(input: CreateUserInput) {
    const duplicate = await this.prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { matricule: input.matricule }, { keycloakId: input.keycloakId }] }
    });

    if (duplicate) {
      throw new ConflictException("User email, matricule or Keycloak id already exists.");
    }

    return this.prisma.user.create({ data: input });
  }
}
