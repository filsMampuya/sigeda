import type { DepartmentType } from "@sigeda/database";

export type DepartmentScopeNode = {
  id: string;
  type: DepartmentType;
  directionId?: string | null;
  serviceId?: string | null;
  parent?: {
    id: string;
    type: DepartmentType;
    directionId?: string | null;
    serviceId?: string | null;
    parent?: {
      id: string;
      type: DepartmentType;
      directionId?: string | null;
      serviceId?: string | null;
    } | null;
  } | null;
} | null;

export function resolveDepartmentScope(department: DepartmentScopeNode) {
  if (!department) {
    return { directionId: null, serviceId: null, bureauId: null };
  }

  if (department.type === "BUREAU") {
    return {
      directionId: department.directionId ?? department.parent?.directionId ?? department.parent?.parent?.id ?? null,
      serviceId: department.serviceId ?? (department.parent?.type === "SERVICE" ? department.parent.id : null),
      bureauId: department.id
    };
  }

  if (department.type === "SERVICE") {
    return {
      directionId: department.directionId ?? department.parent?.id ?? null,
      serviceId: department.id,
      bureauId: null
    };
  }

  return {
    directionId: department.id,
    serviceId: null,
    bureauId: null
  };
}

export function resolveOwnerDirectionIdFromBureau(department: DepartmentScopeNode) {
  if (!department || department.type !== "BUREAU") {
    return null;
  }

  return resolveDepartmentScope(department).directionId;
}
