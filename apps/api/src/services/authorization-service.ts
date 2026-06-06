import type { AuthenticatedUser, DocumentEntity } from "@sigeda/shared/types";

function isPrivilegedRole(role: AuthenticatedUser["role"]) {
  return role === "ADMIN" || role === "DIRECTION_GENERALE" || role === "AUDITEUR";
}

export class AuthorizationService {
  canAccessDocument(user: AuthenticatedUser, document: DocumentEntity) {
    const role = user.role;

    if (isPrivilegedRole(role)) {
      return true;
    }

    if (document.confidentialityLevel === "SECRET" || document.confidentialityLevel === "TRES_SECRET") {
      return role === "ARCHIVISTE";
    }

    if (role === "DIRECTEUR") {
      return user.directionId === document.directionId;
    }

    if (role === "CHEF_SERVICE") {
      return user.serviceId === document.serviceId;
    }

    if (role === "CHEF_BUREAU" || role === "AGENT") {
      return user.bureauId === document.bureauId;
    }

    if (role === "ARCHIVISTE") {
      return true;
    }

    return false;
  }

  filterDocuments(user: AuthenticatedUser, documents: DocumentEntity[]) {
    return documents.filter((document) => this.canAccessDocument(user, document));
  }
}
