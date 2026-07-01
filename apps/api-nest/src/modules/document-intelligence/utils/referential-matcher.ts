import type { DocumentIntelligenceMatchingItem } from "@sigeda/shared/types";

type DepartmentReference = {
  id: string;
  code: string;
  designation: string;
  type: string;
};

export function buildDirectionMatch(
  label: string,
  departments: DepartmentReference[]
): DocumentIntelligenceMatchingItem | undefined {
  const normalizedLabel = normalize(label);

  if (!normalizedLabel) {
    return undefined;
  }

  const matches = departments.filter((department) => {
    return normalize(department.code) === normalizedLabel || normalize(department.designation) === normalizedLabel;
  });

  if (matches.length === 1) {
    return {
      status: "matched",
      label,
      matchedDepartmentId: matches[0]!.id
    };
  }

  if (matches.length > 1) {
    return {
      status: "ambiguous",
      label,
      matchedDepartmentIds: matches.map((item) => item.id)
    };
  }

  return {
    status: "unmatched",
    label
  };
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
