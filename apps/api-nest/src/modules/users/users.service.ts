import { randomBytes } from "node:crypto";
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import type { PaginatedResult } from "@sigeda/shared/types";
import { PrismaService } from "../prisma/prisma.service.js";
import { resolveDepartmentScope } from "../../shared/department-scope.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import type { ListUsersQueryDto } from "./dto/list-users-query.dto.js";

type CreateUserInput = {
  matricule: string;
  email: string;
  nom: string;
  prenom: string;
  roleCode: string;
  bureauCode: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQueryDto, principal: AuthenticatedPrincipal) {
    const [users, principalUser] = await Promise.all([
      this.prisma.user.findMany({
        include: {
          role: true,
          department: {
            include: {
              parent: {
                include: {
                  parent: true
                }
              }
            }
          }
        },
        orderBy: { matricule: "asc" }
      }),
      this.resolvePrincipalUser(principal)
    ]);

    const scopedUsers = users.filter((user) => canAccessUserRecord(user, principalUser));
    return paginate(scopedUsers, query);
  }

  async get(id: string, principal: AuthenticatedPrincipal) {
    const [user, principalUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id },
        include: {
          role: true,
          department: {
            include: {
              parent: {
                include: {
                  parent: true
                }
              }
            }
          }
        }
      }),
      this.resolvePrincipalUser(principal)
    ]);

    if (!user || !canAccessUserRecord(user, principalUser)) {
      throw new NotFoundException("User not found.");
    }

    return user;
  }

  async create(input: CreateUserInput) {
    const duplicate = await this.prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { matricule: input.matricule }] }
    });

    if (duplicate) {
      throw new ConflictException("User email or matricule already exists.");
    }

    const role = await this.prisma.role.findUnique({ where: { code: input.roleCode } });

    if (!role) {
      throw new NotFoundException("Role not found.");
    }

    const bureau = await this.prisma.department.findUnique({
      where: { code: input.bureauCode },
      include: { parent: { include: { parent: true } } }
    });

    if (!bureau || bureau.type !== "BUREAU") {
      throw new NotFoundException("Bureau not found.");
    }

    if (role.code === "DIRECTEUR_GENERAL" && bureau.directionId) {
      const direction = await this.prisma.department.findUnique({ where: { id: bureau.directionId } });

      if (direction?.code !== "DG") {
        throw new ConflictException(
          "Le profil Directeur general doit etre rattache exclusivement a une structure relevant de la Direction generale."
        );
      }
    } else if (role.code === "DIRECTEUR_GENERAL") {
      throw new ConflictException(
        "Le profil Directeur general doit etre rattache exclusivement a une structure relevant de la Direction generale."
      );
    }

    const defaultPassword = generateDevelopmentPassword();
    const keycloakProvision = await this.createKeycloakUser({
      email: input.email,
      firstName: input.prenom,
      lastName: input.nom,
      password: defaultPassword,
      roleCode: role.code
    });

    try {
      const user = await this.prisma.user.create({
        data: {
          keycloakId: keycloakProvision.keycloakId,
          matricule: input.matricule,
          email: input.email,
          nom: input.nom,
          prenom: input.prenom,
          roleId: role.id,
          departmentId: bureau.id
        },
        include: { role: true, department: true }
      });

      return {
        user,
        defaultPassword,
        mustChangePassword: true as const
      };
    } catch (error) {
      await this.deleteKeycloakUser(keycloakProvision.keycloakId);
      throw error;
    }
  }

  private async createKeycloakUser(input: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    roleCode: string;
  }) {
    const token = await this.getKeycloakAdminAccessToken();
    const { adminBaseUrl, realm } = getKeycloakAdminConfig();
    const usersUrl = `${adminBaseUrl}/admin/realms/${realm}/users`;

    const createResponse = await fetch(usersUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: input.email,
        email: input.email,
        emailVerified: true,
        firstName: input.firstName,
        lastName: input.lastName,
        enabled: true,
        requiredActions: [],
        credentials: [
          {
            type: "password",
            value: input.password,
            temporary: false
          }
        ]
      })
    });

    if (!createResponse.ok) {
      const message = await safeReadText(createResponse);
      throw new InternalServerErrorException(`Keycloak user creation failed: ${message || createResponse.statusText}`);
    }

    const location = createResponse.headers.get("location");
    const keycloakId = location?.split("/").pop();

    if (!keycloakId) {
      throw new InternalServerErrorException("Keycloak did not return the created user id.");
    }

    const rolesResponse = await fetch(`${adminBaseUrl}/admin/realms/${realm}/roles/${input.roleCode}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!rolesResponse.ok) {
      throw new InternalServerErrorException(`Keycloak role lookup failed for ${input.roleCode}.`);
    }

    const roleRepresentation = await rolesResponse.json();
    const assignResponse = await fetch(`${usersUrl}/${keycloakId}/role-mappings/realm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([roleRepresentation])
    });

    if (!assignResponse.ok) {
      const message = await safeReadText(assignResponse);
      throw new InternalServerErrorException(`Keycloak role assignment failed: ${message || assignResponse.statusText}`);
    }

    return { keycloakId };
  }

  private async deleteKeycloakUser(keycloakId: string) {
    try {
      const token = await this.getKeycloakAdminAccessToken();
      const { adminBaseUrl, realm } = getKeycloakAdminConfig();

      await fetch(`${adminBaseUrl}/admin/realms/${realm}/users/${keycloakId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch {
      // Best-effort cleanup only.
    }
  }

  private async getKeycloakAdminAccessToken() {
    const { adminBaseUrl, realm, adminUsername, adminPassword } = getKeycloakAdminConfig();
    const response = await fetch(`${adminBaseUrl}/realms/master/protocol/openid-connect/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: "admin-cli",
        username: adminUsername,
        password: adminPassword
      })
    });

    if (!response.ok) {
      const message = await safeReadText(response);
      throw new InternalServerErrorException(`Keycloak admin authentication failed: ${message || response.statusText}`);
    }

    const payload = (await response.json()) as { access_token?: string };

    if (!payload.access_token) {
      throw new InternalServerErrorException(`Keycloak admin authentication returned no access token for realm ${realm}.`);
    }

    return payload.access_token;
  }

  private async resolvePrincipalUser(principal: AuthenticatedPrincipal) {
    return (
      (await this.prisma.user.findUnique({
        where: { keycloakId: principal.sub },
        include: {
          role: true,
          department: {
            include: {
              parent: {
                include: {
                  parent: true
                }
              }
            }
          }
        }
      })) ??
      (principal.email
        ? await this.prisma.user.findFirst({
            where: {
              email: {
                equals: principal.email.trim().toLowerCase(),
                mode: "insensitive"
              }
            },
            include: {
              role: true,
              department: {
                include: {
                  parent: {
                    include: {
                      parent: true
                    }
                  }
                }
              }
            }
          })
        : null)
    );
  }
}

type UserWithScope = Awaited<ReturnType<UsersService["resolvePrincipalUser"]>>;

function canAccessUserRecord(
  targetUser: {
    id: string;
    department: Parameters<typeof resolveDepartmentScope>[0];
  },
  principalUser: UserWithScope
) {
  if (!principalUser) {
    return false;
  }

  if (["ADMIN", "DIRECTEUR_GENERAL", "AUDITEUR"].includes(principalUser.role.code)) {
    return true;
  }

  if (!targetUser.department) {
    return false;
  }

  const principalScope = resolveDepartmentScope(principalUser.department);
  const targetScope = resolveDepartmentScope(targetUser.department);

  if (principalUser.role.code === "DIRECTEUR") {
    return Boolean(principalScope.directionId && principalScope.directionId === targetScope.directionId);
  }

  if (principalUser.role.code === "MANAGER") {
    return Boolean(principalScope.serviceId && principalScope.serviceId === targetScope.serviceId);
  }

  return Boolean(principalScope.bureauId && principalScope.bureauId === targetScope.bureauId);
}

function paginate<T>(items: T[], query: ListUsersQueryDto): PaginatedResult<T> {
  const page = Math.max(query.page ?? 1, 1);
  const pageSize = Math.max(query.pageSize ?? 10, 1);
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages
  };
}

function generateDevelopmentPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const random = randomBytes(8);
  const token = Array.from(random, (value) => alphabet[value % alphabet.length]).join("");

  return `Sigeda!${token}`;
}

function getKeycloakAdminConfig() {
  const issuer = process.env.KEYCLOAK_ISSUER ?? "http://localhost:8080/realms/sigeda";
  const jwksUri = process.env.KEYCLOAK_JWKS_URI;
  const adminBaseUrl = process.env.KEYCLOAK_ADMIN_BASE_URL ?? (jwksUri ? new URL(jwksUri).origin : new URL(issuer).origin);
  const realm = process.env.KEYCLOAK_REALM ?? issuer.split("/realms/")[1] ?? "sigeda";
  const adminUsername = process.env.KEYCLOAK_ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "SigedaKeycloak_2026!";

  return { adminBaseUrl, realm, adminUsername, adminPassword };
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
