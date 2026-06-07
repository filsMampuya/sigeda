import type {
  AuthenticatedUser,
  AuditLog,
  Departement,
  DocumentEntity,
  User,
} from "@sigeda/shared/types";

import { getServerAuthToken } from "@/lib/auth";
import { getServerApiBaseUrl } from "@/lib/env";

export type DashboardStats = {
  totalDocuments: number;
  documentsByDirection: Array<{ key: string; count: number }>;
  documentsByService: Array<{ key: string; count: number }>;
  documentsByBureau: Array<{ key: string; count: number }>;
  confidentialDocuments: number;
  archivedDocuments: number;
  pendingValidation: number;
  recentActivity: AuditLog[];
  digitizationRate: number;
  mostViewedDocuments: Array<{ id: string; reference: string; title: string }>;
};

const defaultBaseUrl = getServerApiBaseUrl();

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getResponseMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown; issues?: Array<{ message?: string }> };

    const issueMessage = body.issues?.find((issue) => issue.message)?.message;
    if (issueMessage) {
      return issueMessage;
    }

    if (typeof body.message === "string") {
      return body.message;
    }
  } catch {
    // The API may return an empty or non-JSON response.
  }

  return `API request failed with status ${response.status}.`;
}

async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const authToken = getServerAuthToken();
    const response = await fetch(`${defaultBaseUrl}${path}`, {
      headers: authToken
        ? {
            Authorization: `Bearer ${authToken}`
          }
        : undefined,
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function postApi<TInput, TOutput>(path: string, body: TInput): Promise<TOutput | null> {
  const authToken = getServerAuthToken();
  const response = await fetch(`${defaultBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new ApiError(response.status, await getResponseMessage(response));
  }

  return (await response.json()) as TOutput;
}

export function getDashboardStats() {
  return fetchApi<DashboardStats>("/api/dashboard/stats");
}

export function getCurrentUser() {
  return fetchApi<{ user: AuthenticatedUser | null }>("/api/auth/me");
}

export function getUsers() {
  return fetchApi<User[]>("/api/users");
}

export function getDocuments(searchParams?: URLSearchParams) {
  const query = searchParams?.toString();
  const path = query ? `/api/documents/search?${query}` : "/api/documents";
  return fetchApi<DocumentEntity[]>(path);
}

export function getDocumentById(id: string) {
  return fetchApi<DocumentEntity>(`/api/documents/${id}`);
}

export function getAuditLogs() {
  return fetchApi<AuditLog[]>("/api/audit-logs");
}

export function getDirections() {
  return fetchApi<Departement[]>("/api/directions");
}

export function getServices() {
  return fetchApi<Departement[]>("/api/services");
}

export function getBureaux() {
  return fetchApi<Departement[]>("/api/bureaux");
}

export function getDepartements() {
  return fetchApi<Departement[]>("/api/departements");
}

export function createDepartement(input: {
  type: "Direction Generale" | "Direction" | "Service" | "Bureau";
  code: string;
  designation: string;
  parent?: {
    code: string;
    designation: string;
  };
}) {
  return postApi<typeof input, Departement>("/api/departements", input);
}

export function createDirection(input: {
  type: "Direction Generale" | "Direction";
  code: string;
  designation: string;
  parent?: {
    code: string;
    designation: string;
  };
}) {
  return createDepartement(input);
}

export function createService(input: {
  parent: {
    code: string;
    designation: string;
  };
  code: string;
  designation: string;
  description?: string;
}) {
  return createDepartement({
    type: "Service",
    code: input.code,
    designation: input.designation,
    parent: input.parent
  });
}

export function createBureau(input: {
  parent: {
    code: string;
    designation: string;
  };
  code: string;
  designation: string;
  description?: string;
}) {
  return createDepartement({
    type: "Bureau",
    code: input.code,
    designation: input.designation,
    parent: input.parent
  });
}

export function createDocument(input: Record<string, unknown>) {
  return postApi<typeof input, DocumentEntity>("/api/documents", input);
}

export function createUser(input: {
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
}) {
  return postApi<typeof input, { user: User; defaultPassword: string; mustChangePassword: true }>("/api/users", input);
}
