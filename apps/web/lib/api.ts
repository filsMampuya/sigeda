import type {
  AuthenticatedUser,
  AuditLog,
  Departement,
  DepartementListItem,
  DocumentEntity,
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
  try {
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
      return null;
    }

    return (await response.json()) as TOutput;
  } catch {
    return null;
  }
}

export function getDashboardStats() {
  return fetchApi<DashboardStats>("/api/dashboard/stats");
}

export function getCurrentUser() {
  return fetchApi<{ user: AuthenticatedUser | null }>("/api/auth/me");
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
  return fetchApi<DepartementListItem[]>("/api/directions");
}

export function getServices() {
  return fetchApi<DepartementListItem[]>("/api/services");
}

export function getBureaux() {
  return fetchApi<DepartementListItem[]>("/api/bureaux");
}

export function createDirection(input: {
  type: "DirectionGenerale" | "Direction";
  code: string;
  designation: string;
  parentId?: string;
  description?: string;
}) {
  return postApi<typeof input, Departement>("/api/directions", input);
}

export function createService(input: {
  parentId: string;
  code: string;
  designation: string;
  description?: string;
}) {
  return postApi<typeof input, Departement>("/api/services", input);
}

export function createBureau(input: {
  parentId: string;
  code: string;
  designation: string;
  description?: string;
}) {
  return postApi<typeof input, Departement>("/api/bureaux", input);
}

export function createDocument(input: Record<string, unknown>) {
  return postApi<typeof input, DocumentEntity>("/api/documents", input);
}
