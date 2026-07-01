import { randomBytes } from "node:crypto";
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import { UserDirectorySource, UserDirectoryStatus, type User } from "@sigeda/database";
import type { PaginatedResult } from "@sigeda/shared/types";
import { PrismaService } from "../prisma/prisma.service.js";
import { resolveDepartmentScope } from "../../shared/department-scope.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import type { ListUsersQueryDto } from "./dto/list-users-query.dto.js";

type CreateUserInput = {
  mode?: "CREATE" | "COMPLETE";
  pendingUserId?: string;
  matricule: string;
  email: string;
  nom: string;
  prenom: string;
  functionTitle?: string;
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
        orderBy: [{ nom: "asc" }, { prenom: "asc" }, { createdAt: "desc" }]
      }),
      this.resolvePrincipalUser(principal)
    ]);

    const includePending = query.includePending ?? false;
    const scopedUsers = users.filter((user) => {
      if (!canAccessUserRecord(user, principalUser)) {
        return false;
      }

      if (!includePending && user.directoryStatus === UserDirectoryStatus.PENDING_COMPLETION) {
        return false;
      }

      if (query.directoryStatus && user.directoryStatus !== query.directoryStatus) {
        return false;
      }

      return true;
    });

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
    const normalizedEmail = normalizeEmail(input.email);
    const normalizedMatricule = input.matricule.trim();
    const trimmedFunctionTitle = input.functionTitle?.trim() || undefined;

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

    const bureauDirection = bureau.directionId
      ? await this.prisma.department.findUnique({
          where: { id: bureau.directionId },
          select: { code: true }
        })
      : null;

    this.assertRoleBureauCompatibility(role.code, bureauDirection?.code ?? null);

    const pendingCandidate = await this.resolvePendingCandidate({
      pendingUserId: input.pendingUserId,
      mode: input.mode,
      email: normalizedEmail,
      matricule: normalizedMatricule,
      nom: input.nom,
      prenom: input.prenom,
      functionTitle: trimmedFunctionTitle,
      bureauId: bureau.id
    });

    const duplicate = await this.prisma.user.findFirst({
      where: {
        id: pendingCandidate ? { not: pendingCandidate.id } : undefined,
        directoryStatus: {
          not: UserDirectoryStatus.PENDING_COMPLETION
        },
        OR: [{ email: normalizedEmail }, { matricule: normalizedMatricule }]
      }
    });

    if (duplicate) {
      throw new ConflictException("User email or matricule already exists.");
    }

    const defaultPassword = generateDevelopmentPassword();
    const keycloakProvision = await this.createKeycloakUser({
      email: normalizedEmail,
      firstName: input.prenom,
      lastName: input.nom,
      password: defaultPassword,
      roleCode: role.code
    });

    try {
      const user = pendingCandidate
        ? await this.prisma.user.update({
            where: { id: pendingCandidate.id },
            data: {
              keycloakId: keycloakProvision.keycloakId,
              matricule: normalizedMatricule,
              email: normalizedEmail,
              nom: input.nom.trim(),
              prenom: input.prenom.trim(),
              functionTitle: trimmedFunctionTitle,
              roleId: role.id,
              departmentId: bureau.id,
              isActive: true,
              directoryStatus: UserDirectoryStatus.ACTIVE,
              directorySource: UserDirectorySource.KEYCLOAK_PROVISIONED
            },
            include: { role: true, department: true }
          })
        : await this.prisma.user.create({
            data: {
              keycloakId: keycloakProvision.keycloakId,
              matricule: normalizedMatricule,
              email: normalizedEmail,
              nom: input.nom.trim(),
              prenom: input.prenom.trim(),
              functionTitle: trimmedFunctionTitle,
              roleId: role.id,
              departmentId: bureau.id,
              isActive: true,
              directoryStatus: UserDirectoryStatus.ACTIVE,
              directorySource: UserDirectorySource.KEYCLOAK_PROVISIONED
            },
            include: { role: true, department: true }
          });

      return {
        user,
        defaultPassword,
        mustChangePassword: true as const,
        operation: pendingCandidate ? ("COMPLETED_PENDING" as const) : ("CREATED" as const)
      };
    } catch (error) {
      await this.deleteKeycloakUser(keycloakProvision.keycloakId);
      throw error;
    }
  }

  private async resolvePendingCandidate(input: {
    pendingUserId?: string;
    mode?: "CREATE" | "COMPLETE";
    email: string;
    matricule: string;
    nom: string;
    prenom: string;
    functionTitle?: string;
    bureauId: string;
  }) {
    if (input.pendingUserId) {
      const candidate = await this.prisma.user.findUnique({
        where: { id: input.pendingUserId },
        include: { role: true, department: true }
      });

      if (!candidate || candidate.directoryStatus !== UserDirectoryStatus.PENDING_COMPLETION) {
        throw new NotFoundException("Agent a completer introuvable ou deja finalise.");
      }

      return candidate;
    }

    const exactCandidates = await this.prisma.user.findMany({
      where: {
        directoryStatus: UserDirectoryStatus.PENDING_COMPLETION,
        OR: [
          { email: input.email },
          { matricule: input.matricule }
        ]
      },
      include: { role: true, department: true }
    });

    if (exactCandidates.length > 1) {
      throw new ConflictException(
        "Plusieurs agents a completer correspondent a ces informations. Selectionnez explicitement l'agent a completer."
      );
    }

    if (exactCandidates.length === 1) {
      return exactCandidates[0];
    }

    const nominalCandidates = await this.prisma.user.findMany({
      where: {
        directoryStatus: UserDirectoryStatus.PENDING_COMPLETION,
        nom: {
          equals: input.nom.trim(),
          mode: "insensitive"
        },
        prenom: {
          equals: input.prenom.trim(),
          mode: "insensitive"
        },
        departmentId: input.bureauId,
        ...(input.functionTitle
          ? {
              functionTitle: {
                equals: input.functionTitle,
                mode: "insensitive"
              }
            }
          : {})
      },
      include: { role: true, department: true }
    });

    if (nominalCandidates.length > 1) {
      throw new ConflictException(
        "Plusieurs agents a completer partagent le meme nom. Selectionnez explicitement l'agent a completer."
      );
    }

    if (nominalCandidates.length === 1) {
      return nominalCandidates[0];
    }

    if (input.mode === "COMPLETE") {
      throw new NotFoundException("Aucun agent a completer correspondant n'a ete trouve.");
    }

    return null;
  }

  private assertRoleBureauCompatibility(roleCode: string, bureauDirectionCode: string | null) {
    if (roleCode !== "DIRECTEUR_GENERAL") {
      return;
    }

    if (bureauDirectionCode !== "DG") {
      throw new ConflictException(
        "Le profil Directeur general doit etre rattache exclusivement a une structure relevant de la Direction generale."
      );
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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
