import { documentIntelligenceResultSchema } from "@sigeda/shared/schemas";
import type { DocumentIntelligenceEffectiveMode, DocumentIntelligenceResult } from "@sigeda/shared/types";
import { extractDocumentFromOcrHeuristics } from "./extract-from-ocr-heuristics.js";

export function normalizeLlmResultPayload(
  payload: unknown,
  fallbackMode: DocumentIntelligenceEffectiveMode,
  rawExtractedText: string
): DocumentIntelligenceResult {
  const source = isRecord(payload) ? payload : {};
  const fieldConfidence = normalizeFieldConfidence(source.fieldConfidence);
  const heuristicFallback = rawExtractedText ? extractDocumentFromOcrHeuristics(rawExtractedText) : null;
  const rawSubject = readString(source.subject);
  const rawTitle = readString(source.title);

  const normalizedReference = normalizeReference(
    chooseReferenceValue(readString(source.reference), heuristicFallback?.reference ?? "")
  );
  const normalizedDate = normalizeDocumentDate(
    chooseStringValue(readString(source.documentDate), heuristicFallback?.documentDate ?? ""),
    heuristicFallback?.documentDate ?? ""
  );
  const normalizedEmitterDirection = normalizeDirectionLabel(
    chooseStringValue(readString(source.emitterDirection), heuristicFallback?.emitterDirection ?? "")
  );
  const normalizedReceiverDirections = normalizeDirectionArray(
    readStringArray(source.receiverDirections),
    heuristicFallback?.receiverDirections ?? []
  );
  const normalizedCopyDirections = normalizeDirectionArray(
    readStringArray(source.copyDirections),
    heuristicFallback?.copyDirections ?? []
  );
  const normalizedSigners = normalizeSigners(
    readSignerArray(source.signers),
    heuristicFallback?.signers ?? []
  );
  const normalizedTitle = normalizeAdministrativeTitle(
    chooseTitleValue(rawTitle, rawSubject, heuristicFallback?.title ?? "")
  );

  return documentIntelligenceResultSchema.parse({
    reference: normalizedReference,
    title: normalizedTitle,
    subject: rawSubject,
    documentDate: normalizedDate,
    emitterDirection: normalizedEmitterDirection,
    receiverDirections: normalizedReceiverDirections,
    copyDirections: normalizedCopyDirections,
    signers: normalizedSigners,
    documentType: readString(source.documentType),
    confidentialityLevel: readString(source.confidentialityLevel),
    summary: readString(source.summary),
    keywords: readStringArray(source.keywords),
    confidenceScore: normalizeConfidenceScore(source.confidenceScore, fieldConfidence),
    fieldConfidence,
    extractionMode: readEffectiveMode(source.extractionMode) ?? fallbackMode,
    rawExtractedText: readString(source.rawExtractedText) || rawExtractedText,
    rawVisionNotes: readOptionalString(source.rawVisionNotes)
  }) as DocumentIntelligenceResult;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown) {
  const normalized = readString(value);
  return normalized.length > 0 ? normalized : undefined;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => readString(entry))
    .filter((entry, index, values) => entry.length > 0 && values.indexOf(entry) === index);
}

function readSignerArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }

      if (isRecord(entry)) {
        return readString(entry.fullName) || readString(entry.name) || readString(entry.signer);
      }

      return "";
    })
    .filter((entry, index, values) => entry.length > 0 && values.indexOf(entry) === index);
}

function chooseStringValue(primary: string, fallback: string) {
  return primary.trim().length > 0 ? primary.trim() : fallback.trim();
}

function chooseReferenceValue(primary: string, fallback: string) {
  if (fallback.trim().length > 0) {
    return fallback.trim();
  }

  return primary.trim();
}

function chooseTitleValue(primary: string, subject: string, fallback: string) {
  const normalizedPrimary = primary.trim();
  const normalizedSubject = subject.trim();
  const normalizedFallback = fallback.trim();

  if (normalizedFallback.length > 0) {
    if (!normalizedPrimary) {
      return normalizedFallback;
    }

    if (
      normalizedPrimary.localeCompare(normalizedSubject, undefined, { sensitivity: "accent" }) === 0 ||
      normalizedPrimary.length <= 6
    ) {
      return normalizedFallback;
    }
  }

  return normalizedPrimary;
}

function normalizeReference(reference: string) {
  return reference
    .replace(/\s+/g, " ")
    .replace(/%/g, "4")
    .replace(/,\s*/g, ".")
    .trim();
}

function normalizeAdministrativeTitle(title: string) {
  const cleaned = title
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\bde l['â€™]hotel des monnaies\b/gi, "de l'Hotel des Monnaies")
    .replace(/\bhotel des monnaies\b/gi, "Hotel des Monnaies")
    .replace(/\ba\s*\.?\s*i\s*\.?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned
    .toUpperCase()
    .replace(/\bCOORDINATION\b/g, "DIRECTION DE COORDINATION");
}

function normalizeDocumentDate(documentDate: string, heuristicDate: string) {
  const cleaned = documentDate.trim();

  if (!cleaned) {
    return heuristicDate.trim();
  }

  if (/^\d{2}\/\d{2}\/20\d{2}$/.test(cleaned) && cleaned.slice(-2) !== "76") {
    return cleaned;
  }

  if (heuristicDate.trim()) {
    return heuristicDate.trim();
  }

  return cleaned.replace(/2076\b/, "2026");
}

function normalizeDirectionArray(values: string[], fallbackValues: string[]) {
  const source = values.length > 0 ? values : fallbackValues;

  return source
    .map((value) => normalizeDirectionLabel(value))
    .filter((value, index, current) => value.length > 0 && current.indexOf(value) === index);
}

function normalizeDirectionLabel(value: string) {
  const cleaned = value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\bde l['’]hotel des monnaies\b/i, "")
    .replace(/\bhotel des monnaies\b/i, "")
    .replace(/\ba\s*\.?\s*i\s*\.?\b/gi, "")
    .replace(/\bpar delegation\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  if (/direction de coordination/i.test(cleaned) || /^coordination$/i.test(cleaned)) {
    return "Direction Generale";
  }

  if (/^direction generale$/i.test(cleaned)) {
    return "Direction Generale";
  }

  if (/^direction technique$/i.test(cleaned) || /^direction technique\.?$/i.test(cleaned)) {
    return "Direction Technique";
  }

  return cleaned
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bDu\b/g, "du")
    .replace(/\bDe\b/g, "de")
    .replace(/\bDes\b/g, "des")
    .replace(/\bLa\b/g, "la")
    .replace(/\bLe\b/g, "le")
    .replace(/\bD'\b/g, "d'");
}

function normalizeSigners(values: string[], fallbackValues: string[]) {
  const source = values.length > 0 ? values : fallbackValues;
  const normalized = source
    .flatMap((value) => splitMergedSigner(value))
    .map((value) => value.trim())
    .filter((value, index, current) => value.length > 0 && current.indexOf(value) === index);

  if (normalized.length > 1) {
    return normalized;
  }

  return fallbackValues.length > normalized.length ? fallbackValues : normalized;
}

function splitMergedSigner(value: string) {
  const cleaned = value.trim().replace(/\s+/g, " ");

  if (/^[A-Z' -]+$/.test(cleaned)) {
    const tokens = cleaned.split(" ").filter(Boolean);

    if (tokens.length === 4) {
      return [`${tokens[0]} ${tokens[1]}`, `${tokens[2]} ${tokens[3]}`];
    }
  }

  return [cleaned];
}

function normalizeFieldConfidence(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, currentValue]) => [key, clamp01(currentValue)])
      .filter(([, currentValue]) => typeof currentValue === "number")
  );
}

function normalizeConfidenceScore(value: unknown, fieldConfidence: Record<string, number>) {
  const directValue = clamp01(value);

  if (typeof directValue === "number") {
    return directValue;
  }

  const scores = Object.values(fieldConfidence);

  if (scores.length === 0) {
    return 0;
  }

  return scores.reduce((sum, current) => sum + current, 0) / scores.length;
}

function clamp01(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function readEffectiveMode(value: unknown): DocumentIntelligenceEffectiveMode | null {
  return value === "vision" || value === "ocr" || value === "hybrid" ? value : null;
}
