import { BadRequestException } from "@nestjs/common";

export function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

export function optionalTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();
  return normalized.length ? normalized : undefined;
}

export function parseInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (/^-?\d+$/.test(normalized)) {
      return Number.parseInt(normalized, 10);
    }
  }

  return value;
}

export function parseStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalized) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry).trim()).filter(Boolean);
      }
    } catch {
      return normalized
        .split(",")
        .map((entry) => entry.trim().replace(/^"+|"+$/g, ""))
        .filter(Boolean);
    }
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }

  return [];
}

export function parseJsonArray<T>(value: unknown, fallback: T[] = []) {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(normalized) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    throw new BadRequestException("Le format JSON fourni est invalide.");
  }
}
