export function formatStructureLabel(code?: string | null, designation?: string | null, fallback?: string | null) {
  if (code && designation) {
    return `${code} - ${designation}`;
  }

  return designation ?? code ?? fallback ?? "-";
}

export function formatRoleLabel(value?: string | null) {
  if (!value) {
    return "-";
  }

  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`)
    .join(" ");
}

export function formatShortDate(value?: string | number | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}
