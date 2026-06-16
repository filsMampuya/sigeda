import { Injectable } from "@nestjs/common";
import type { AuditLog, AuthenticatedUser } from "@sigeda/shared/types";
import { PrismaService } from "../prisma/prisma.service.js";
import { resolveDepartmentScope } from "../../shared/department-scope.js";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(principal: { sub: string; email?: string }) {
    const include = {
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
    } as const;
    const user =
      (await this.prisma.user.findUnique({
        where: { keycloakId: principal.sub },
        include
      })) ??
      (principal.email
        ? await this.prisma.user.findFirst({
            where: {
              email: {
                equals: principal.email.trim().toLowerCase(),
                mode: "insensitive"
              }
            },
            include
          })
        : null);
    const scopedUser = user ? toAuthenticatedUser(user) : null;

    const documents = await this.prisma.document.findMany({
      include: {
        author: {
          include: {
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
        },
        attachments: true,
        versions: {
          select: {
            id: true
          }
        },
        annotations: {
          select: {
            id: true,
            sourceDirectionId: true
          }
        },
        transmissions: {
          select: {
            id: true,
            sentAt: true,
            respondedAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const scopedDocuments = scopeDocuments(documents, scopedUser);
    const directionIds = uniqueStrings(
      scopedDocuments.flatMap((doc) => [
        resolveDepartmentScope(doc.author.department).directionId,
        ...doc.annotations.map((annotation) => annotation.sourceDirectionId)
      ])
    );
    const directionLabels = await this.loadDepartmentLabels(directionIds);
    const auditLogs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return {
      totalDocuments: scopedDocuments.length,
      documentsByDirection: aggregateByScope(scopedDocuments, "directionId", directionLabels),
      documentsByService: aggregateByScope(scopedDocuments, "serviceId"),
      documentsByBureau: aggregateByScope(scopedDocuments, "bureauId"),
      confidentialDocuments: scopedDocuments.filter((doc) =>
        ["CONFIDENTIEL", "SECRET", "TRES_SECRET"].includes(doc.confidentiality ?? "")
      ).length,
      archivedDocuments: scopedDocuments.filter((doc) => doc.status === "ARCHIVE").length,
      pendingValidation: scopedDocuments.filter((doc) => doc.status === "EN_VALIDATION").length,
      annotatedDocuments: scopedDocuments.filter((doc) => doc.annotations.length > 0).length,
      versionedDocuments: scopedDocuments.filter((doc) => doc.versions.length > 1).length,
      topAnnotatingDirections: aggregateBy(
        scopedDocuments.flatMap((doc) => doc.annotations.map((annotation) => annotation.sourceDirectionId)),
        directionLabels
      ),
      averageVersionsBeforeValidation: computeAverageVersionsBeforeValidation(scopedDocuments),
      recentActivity: auditLogs.map(mapAuditLog).slice(0, 5),
      digitizationRate:
        scopedDocuments.filter((doc) => doc.attachments.length > 0).length / Math.max(scopedDocuments.length, 1),
      mostViewedDocuments: scopedDocuments.slice(0, 5).map((document) => ({
        id: document.id,
        reference: document.reference,
        title: document.title || document.subject || document.reference
      }))
    };
  }

  private async loadDepartmentLabels(ids: string[]) {
    if (!ids.length) {
      return new Map<string, string>();
    }

    const departments = await this.prisma.department.findMany({
      where: {
        id: {
          in: ids
        }
      },
      select: {
        id: true,
        code: true,
        designation: true
      }
    });

    return new Map(
      departments.map((department) => [
        department.id,
        [department.code, department.designation].filter(Boolean).join(" - ") || department.id
      ])
    );
  }
}

function aggregateBy(keys: Array<string | null>, labels?: Map<string, string>) {
  const counts = new Map<string, number>();

  for (const key of keys.filter(Boolean) as string[]) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      label: labels?.get(key),
      count
    }))
    .sort((left, right) => right.count - left.count);
}

function aggregateByScope<T extends { author: { department: DepartmentNode } }>(
  documents: T[],
  field: "directionId" | "serviceId" | "bureauId",
  labels?: Map<string, string>
) {
  return aggregateBy(
    documents.map((document) => resolveDepartmentScope(document.author.department)[field]),
    labels
  );
}

function mapAuditLog(log: {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: Date;
  metadata: unknown;
}) {
  const metadata = isObject(log.metadata) ? log.metadata : {};
  const userName = getString(metadata.userName) || getString(metadata.email) || getString(metadata.subject) || "System";

  return {
    id: log.id,
    userId: log.userId ?? "",
    userName,
    action: normalizeAuditAction(log.action),
    entityType: log.entityType,
    entityId: log.entityId ?? "",
    description: getString(metadata.description) || log.action,
    ipAddress: undefined,
    createdAt: log.createdAt.toISOString()
  } satisfies AuditLog;
}

function scopeDocuments<T extends { author: { department: DepartmentNode } }>(documents: T[], user: AuthenticatedUser | null) {
  if (!user || user.role === "ADMIN" || user.role === "DIRECTION_GENERALE" || user.role === "AUDITEUR") {
    return documents;
  }

  if (user.role === "DIRECTEUR") {
    return documents.filter((document) => resolveDepartmentScope(document.author.department).directionId === user.directionId);
  }

  if (user.role === "ARCHIVISTE") {
    return documents.filter((document) => resolveDepartmentScope(document.author.department).serviceId === user.serviceId);
  }

  return documents.filter((document) => resolveDepartmentScope(document.author.department).bureauId === user.bureauId);
}

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: { code: string };
  department: DepartmentNode;
}) {
  const scope = resolveDepartmentScope(user.department);

  return {
    id: user.id,
    email: user.email,
    displayName: [user.nom, user.prenom].filter(Boolean).join(" ").trim() || user.email,
    role: normalizeRole(user.role.code),
    directionId: scope.directionId,
    serviceId: scope.serviceId,
    bureauId: scope.bureauId
  } satisfies AuthenticatedUser;
}

type DepartmentNode = Parameters<typeof resolveDepartmentScope>[0];

function normalizeRole(roleCode: string): AuthenticatedUser["role"] {
  if (roleCode === "DIRECTEUR_GENERAL") {
    return "DIRECTION_GENERALE";
  }

  if (roleCode === "MANAGER") {
    return "ARCHIVISTE";
  }

  if (roleCode === "ADMIN" || roleCode === "DIRECTEUR" || roleCode === "AGENT" || roleCode === "AUDITEUR") {
    return roleCode;
  }

  return "AGENT";
}

function normalizeAuditAction(action: string): AuditLog["action"] {
  if (
    action === "CREATE_DOCUMENT" ||
    action === "CREATE_DOCUMENT_VERSION" ||
    action === "CREATE_DOCUMENT_ANNOTATION" ||
    action === "TRANSMIT_DOCUMENT_VERSION" ||
    action === "UPDATE_DOCUMENT" ||
    action === "DELETE_DOCUMENT" ||
    action === "VIEW_DOCUMENT" ||
    action === "DOWNLOAD_DOCUMENT" ||
    action === "VIEW_FILE" ||
    action === "DOWNLOAD_FILE" ||
    action === "ARCHIVE_DOCUMENT" ||
    action === "CLASSIFY_DOCUMENT_ARCHIVE" ||
    action === "CREATE_ARCHIVE_ANNOTATION" ||
    action === "UPLOAD_ARCHIVE_ANNOTATION_FILE" ||
    action === "VALIDATE_DOCUMENT" ||
    action === "REJECT_DOCUMENT" ||
    action === "LOGIN" ||
    action === "LOGOUT"
  ) {
    return action;
  }

  return "VIEW_DOCUMENT";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function uniqueStrings(values: Array<string | null>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function computeAverageVersionsBeforeValidation(
  documents: Array<{
    status: string;
    versions: Array<{ id: string }>;
  }>
) {
  const validated = documents.filter((document) => document.status === "VALIDE");

  if (!validated.length) {
    return 0;
  }

  const total = validated.reduce((sum, document) => sum + Math.max(document.versions.length, 1), 0);
  return total / validated.length;
}
