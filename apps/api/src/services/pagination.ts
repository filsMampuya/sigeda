import type { PaginatedResult } from "@sigeda/shared/types";

export function parsePagination(query: Record<string, unknown>) {
  const page = parsePositiveInteger(query.page, 1);
  const pageSize = Math.min(parsePositiveInteger(query.pageSize, 10), 100);

  return { page, pageSize };
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const start = (normalizedPage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: normalizedPage,
    pageSize,
    totalPages
  };
}

function parsePositiveInteger(value: unknown, fallback: number) {
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    return parsed > 0 ? parsed : fallback;
  }

  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  return fallback;
}
