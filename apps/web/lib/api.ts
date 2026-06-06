import type {
  AuditLog,
  Bureau,
  Direction,
  DocumentEntity,
  Service
} from "@sigeda/shared/types";

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
    const response = await fetch(`${defaultBaseUrl}${path}`, {
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
    const response = await fetch(`${defaultBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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
  return fetchApi<Direction[]>("/api/directions");
}

export function getServices() {
  return fetchApi<Service[]>("/api/services");
}

export function getBureaux() {
  return fetchApi<Bureau[]>("/api/bureaux");
}

export function createDirection(input: Omit<Direction, "id" | "createdAt" | "updatedAt">) {
  return postApi<typeof input, Direction>("/api/directions", input);
}

export function createService(input: Omit<Service, "id" | "createdAt" | "updatedAt">) {
  return postApi<typeof input, Service>("/api/services", input);
}

export function createBureau(input: Omit<Bureau, "id" | "createdAt" | "updatedAt">) {
  return postApi<typeof input, Bureau>("/api/bureaux", input);
}

export function createDocument(input: Omit<DocumentEntity, "id" | "createdAt" | "updatedAt" | "archivedAt">) {
  return postApi<typeof input, DocumentEntity>("/api/documents", input);
}
