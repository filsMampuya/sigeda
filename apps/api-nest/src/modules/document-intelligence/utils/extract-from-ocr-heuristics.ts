import type { DocumentIntelligenceResult } from "@sigeda/shared/types";
import { applyConfidenceDefaults } from "./confidence.js";

export function extractDocumentFromOcrHeuristics(text: string): DocumentIntelligenceResult | null {
  const normalizedText = normalizeOcrText(text);

  if (!normalizedText) {
    return null;
  }

  const reference = extractReference(normalizedText);
  const title = extractTitle(normalizedText);
  const subject = extractSubject(normalizedText);
  const documentDate = extractDate(normalizedText);
  const receiverDirections = extractReceiverDirections(normalizedText);
  const copyDirections = extractCopyDirections(normalizedText);
  const signers = extractSigners(normalizedText);
  const emitterDirection = extractEmitterDirection(normalizedText, reference, signers);
  const summary = extractSummary(normalizedText, {
    emitterDirection,
    receiverDirections,
    subject,
    title
  });
  const keywords = extractKeywords(title, subject, emitterDirection, receiverDirections, copyDirections);
  const documentType = extractDocumentType(normalizedText);
  const confidentialityLevel = extractConfidentialityLevel(normalizedText);

  const populatedFields = [
    reference,
    title,
    subject,
    documentDate,
    emitterDirection,
    summary,
    documentType,
    confidentialityLevel,
    ...receiverDirections,
    ...copyDirections,
    ...signers
  ].filter((value) => value.trim().length > 0);

  if (populatedFields.length < 4) {
    return null;
  }

  return applyConfidenceDefaults({
    reference,
    title,
    subject,
    documentDate,
    emitterDirection,
    receiverDirections,
    copyDirections,
    signers,
    documentType,
    confidentialityLevel,
    summary,
    keywords,
    confidenceScore: 0,
    fieldConfidence: {
      reference: reference ? 0.9 : 0.1,
      title: title ? 0.85 : 0.1,
      subject: subject ? 0.9 : 0.1,
      documentDate: documentDate ? 0.9 : 0.1,
      emitterDirection: emitterDirection ? 0.8 : 0.1,
      receiverDirections: receiverDirections.length > 0 ? 0.8 : 0.1,
      copyDirections: copyDirections.length > 0 ? 0.8 : 0.35,
      signers: signers.length > 0 ? 0.7 : 0.45,
      documentType: documentType ? 0.95 : 0.1,
      confidentialityLevel: confidentialityLevel ? 0.9 : 0.3,
      summary: summary ? 0.75 : 0.1,
      keywords: keywords.length > 0 ? 0.7 : 0.1
    },
    extractionMode: "ocr",
    rawExtractedText: normalizedText
  });
}

function normalizeOcrText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractReference(text: string) {
  const labeledMatch = text.match(/R[eéèê]f[.,\s:]*([^\n]{4,})/i);

  if (labeledMatch?.[1]) {
    return cleanReference(labeledMatch[1]);
  }

  const fallbackMatch = text.match(/\b([A-Z][.,][\d%]{2,}\/n[°ºo]?\s*\d{2,})\b/i);
  return fallbackMatch?.[1] ? cleanReference(fallbackMatch[1]) : "";
}

function extractSubject(text: string) {
  const concernMatch = text.match(/Concerne\s*:\s*([^\n]+)/i);

  if (concernMatch?.[1]) {
    return cleanInlineValue(concernMatch[1]);
  }

  const objectMatch = text.match(/Objet\s*:\s*([^\n]+)/i);
  return objectMatch?.[1] ? cleanInlineValue(objectMatch[1]) : "";
}

function extractTitle(text: string) {
  const lines = text
    .split("\n")
    .map((line) => cleanInlineValue(line))
    .filter(Boolean);

  const explicitTitlePatterns = [
    /^NOTE\s+A\s+LA\s+DIRECTION(?:\s+DE)?\s+.+/i,
    /^NOTE\s+DE\s+SERVICE(?:\s*[:\-]\s*.+)?/i,
    /^NOTE\s+CIRCULAIRE(?:\s*[:\-]\s*.+)?/i,
    /^RAPPORT(?:\s*[:\-]\s*.+)?/i,
    /^LETTRE(?:\s*[:\-]\s*.+)?/i,
    /^BORDEREAU(?:\s*[:\-]\s*.+)?/i
  ];

  for (const line of lines.slice(0, 18)) {
    if (explicitTitlePatterns.some((pattern) => pattern.test(line))) {
      return normalizeAdministrativeTitle(line);
    }
  }

  const noteWithReceiver = text.match(/NOTE\s+A\s+LA\s+DIRECTION(?:\s+DE)?\s+([^\n]+)/i);

  if (noteWithReceiver?.[1]) {
    return normalizeAdministrativeTitle(`NOTE A LA DIRECTION ${cleanInlineValue(noteWithReceiver[1])}`);
  }

  const firstAdministrativeHeading = lines.find((line) =>
    /^(NOTE|RAPPORT|LETTRE|BORDEREAU)\b/i.test(line)
  );

  return firstAdministrativeHeading ? normalizeAdministrativeTitle(firstAdministrativeHeading) : "";
}

function extractDate(text: string) {
  const shortDateMatch = text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);

  if (shortDateMatch?.[1]) {
    return normalizeDetectedYear(shortDateMatch[1], text);
  }

  const longDateMatch = text.match(/\b(\d{1,2}\s+[^\W\d_][^\d\n]{1,24}\s+\d{4})\b/i);
  return longDateMatch?.[1] ? normalizeDetectedYear(longDateMatch[1].trim(), text) : "";
}

function extractReceiverDirections(text: string) {
  const patterns = [
    /NOTE\s+A\s+LA\s+DIRECTION(?:\s+DE)?\s+([^\n]+)/i,
    /\bA\s+LA\s+DIRECTION(?:\s+DE)?\s+([^\n]+)/i,
    /A\s+L['’]ATTENTION\s+DE\s+([^\n]+)/i,
    /A\s+MONSIEUR\s+LE\s+DIRECTEUR\s+([^\n]+)/i,
    /DESTINATAIRE\s*:\s*([^\n]+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return splitDirectionSequence(match[1]);
    }
  }

  return [];
}

function extractCopyDirections(text: string) {
  const match = text.match(/\bC\.?\s*[I1L]\.?\s*:?\s*([^\n]+(?:\n[^\n]+){0,3})/i);

  if (!match?.[1]) {
    return [];
  }

  const lines = match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(avec nos respects|veuillez|copie|ampliation)/i.test(line));

  return Array.from(
    new Set(
      lines
        .flatMap((line) => splitDirectionSequence(line))
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    )
  ).slice(0, 8);
}

function extractEmitterDirection(text: string, reference: string, signers: string[]) {
  const signatureAuthorityDirection = extractAuthorityDirectionFromSignatures(text, signers);

  if (signatureAuthorityDirection) {
    return signatureAuthorityDirection;
  }

  const collapsedText = text.replace(/\s+/g, " ");
  const activityMatch = collapsedText.match(
    /rapport d'activites de la direction\s+(.+?)(?:\s+du mois|\s+de l'annee|\s+pour|\.)/i
  );

  if (activityMatch?.[1]) {
    return `Direction ${toTitleCase(activityMatch[1].trim())}`;
  }

  const signerTitleMatch = text.match(/Directeur\s+([^\d\n]{3,60}?)(?:a\.i)?(?:\n|$)/i);

  if (signerTitleMatch?.[1]) {
    return normalizeDirectionLabel(`Direction ${cleanInlineValue(signerTitleMatch[1])}`);
  }

  const referenceDirection = inferDirectionFromCode(reference);

  if (referenceDirection) {
    return referenceDirection;
  }

  return "";
}

function extractAuthorityDirectionFromSignatures(text: string, signers: string[]) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const authorityHints = lines
    .map((line) => normalizeAuthorityDirectionLine(line))
    .filter((value): value is string => Boolean(value));

  if (authorityHints.length === 0) {
    return "";
  }

  if (signers.length >= 2) {
    return authorityHints[authorityHints.length - 1] ?? "";
  }

  return authorityHints[0] ?? "";
}

function extractSigners(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = Array.from(
    new Set(
      lines.filter((line) => /^[A-Z][A-Z' -]{5,}$/.test(line) && !line.startsWith("NOTE ") && !line.startsWith("BANQUE "))
    )
  )
    .flatMap((line) => splitMergedSignerLine(line))
    .filter((line, index, current) => line.length > 0 && current.indexOf(line) === index);

  return candidates.slice(0, 6);
}

function extractSummary(
  text: string,
  context: {
    emitterDirection: string;
    receiverDirections: string[];
    subject: string;
    title: string;
  }
) {
  const bodyContext = text.replace(/\s+/g, " ");
  const receiver = context.receiverDirections[0] ?? "";
  const normalizedSubject = cleanInlineValue(context.subject);

  if (normalizedSubject) {
    const periodMatch = bodyContext.match(/du mois de\s+([A-Za-zÀ-ÿ]+\s+\d{4})/i);
    const period = periodMatch?.[1]?.trim();

    if (/^transmission\b/i.test(normalizedSubject)) {
      return finalizeAdministrativeSummary(
        `${normalizedSubject}${context.emitterDirection ? ` ${formatDirectionComplement(context.emitterDirection, "de")}` : ""}${period ? ` pour ${period}` : ""}${receiver ? ` ${formatDirectionComplement(receiver, "a")}` : ""}`
      );
    }

    return finalizeAdministrativeSummary(
      `${normalizedSubject}${context.emitterDirection ? ` emis par ${context.emitterDirection}` : ""}${receiver ? ` a destination de ${receiver}` : ""}`
    );
  }

  const reportMatch = bodyContext.match(
    /rapport d['’]activites(?:\s+de\s+la\s+direction\s+([^.]+?))?(?:\s+du mois de\s+([^.]+?))?(?:\s|\.|,)/i
  );

  if (reportMatch) {
    const directionPart = reportMatch[1] ? ` de la Direction ${toTitleCase(reportMatch[1].trim())}` : "";
    const periodPart = reportMatch[2] ? ` pour ${reportMatch[2].trim()}` : "";

    return finalizeAdministrativeSummary(
      `Transmission du rapport d'activites${directionPart}${periodPart}${receiver ? ` a l'attention de ${receiver}` : ""}`
    );
  }

  const concernBlockMatch = text.match(/Concerne\s*:[^\n]+\n+([\s\S]+?)\n+\s*Avec nos respects\.?/i);

  if (concernBlockMatch?.[1]) {
    const sentence = concernBlockMatch[1]
      .replace(/\s+/g, " ")
      .replace(/Avec nos respects\.?$/i, "")
      .trim();

    return finalizeAdministrativeSummary(sentence);
  }

  const genericBodyMatch = text.match(/\n{2,}([\s\S]{40,400}?)\n{2,}/);
  return genericBodyMatch?.[1] ? finalizeAdministrativeSummary(genericBodyMatch[1]) : "";
}

function extractKeywords(
  title: string,
  subject: string,
  emitterDirection: string,
  receiverDirections: string[],
  copyDirections: string[]
) {
  return Array.from(
    new Set(
      [title, subject, emitterDirection, ...receiverDirections, ...copyDirections]
        .flatMap((value) => value.split(/[:,-]/))
        .map((value) => value.trim())
        .filter((value) => value.length >= 4)
    )
  ).slice(0, 8);
}

function extractDocumentType(text: string) {
  if (/^\s*NOTE\b/im.test(text)) {
    return "NOTE";
  }

  if (/Concerne\s*:/i.test(text) && /Directeur/i.test(text)) {
    return "NOTE";
  }

  if (/\bRAPPORT\b/i.test(text)) {
    return "RAPPORT";
  }

  return "DOCUMENT_ADMINISTRATIF";
}

function extractConfidentialityLevel(text: string) {
  if (/strictement confidentiel/i.test(text) || /tres confidentiel/i.test(text)) {
    return "TRES_SECRET";
  }

  if (/\bsecret\b/i.test(text)) {
    return "SECRET";
  }

  if (/\bconfidentiel\b/i.test(text)) {
    return "CONFIDENTIEL";
  }

  if (/\breserve\b/i.test(text)) {
    return "INTERNE";
  }

  return "";
}

function cleanReference(value: string) {
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/^[:.\s-]+/, "")
    .replace(/%/g, "4")
    .replace(/D,(\d+)/i, "D.$1")
    .replace(/,\s*/g, ".")
    .trim();

  const extracted =
    cleaned.match(/([A-Z][.,]\d{2,}\/n\S*\s*\d{2,})/i)?.[1] ??
    cleaned.match(/([A-Z][.,]\d{2,}\/n)/i)?.[1] ??
    cleaned;

  return extracted.replace(/\/n\S*\s*(\d{2,})/i, "/n° $1").trim();
}

function cleanInlineValue(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[.;:,]\s*$/, "")
    .trim();
}

function finalizeAdministrativeSummary(value: string) {
  const cleaned = cleanInlineValue(value)
    .replace(/\bNous vous transmettons,?\b/i, "Transmission")
    .replace(/\bet vous en souhaitons bonne reception\b/gi, "")
    .replace(/\bavec nos respects\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  const normalized =
    cleaned.charAt(0).toUpperCase() +
    cleaned.slice(1);
  const shortened = normalized.length > 240 ? normalized.slice(0, 237).trimEnd() + "..." : normalized;

  return /[.!?]$/.test(shortened) ? shortened : `${shortened}.`;
}

function formatDirectionComplement(direction: string, preposition: "de" | "a") {
  const cleaned = cleanInlineValue(direction);

  if (!cleaned) {
    return "";
  }

  if (preposition === "de") {
    return `de la ${cleaned}`;
  }

  return `a l'attention de la ${cleaned}`;
}

function normalizeAdministrativeTitle(value: string) {
  return cleanInlineValue(value)
    .replace(/\bde l['â€™]hotel des monnaies\b/gi, "de l'Hotel des Monnaies")
    .replace(/\bhotel des monnaies\b/gi, "Hotel des Monnaies")
    .replace(/\ba\s*\.?\s*i\s*\.?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .toUpperCase();
}

function splitDirectionSequence(value: string) {
  return value
    .split(/\s{2,}|;|\/|\||\bET\b/i)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .map((item) => normalizeDirectionLabel(item))
    .filter((item) => item.length > 0);
}

function normalizeDirectionLabel(value: string) {
  const cleaned = cleanInlineValue(value)
    .replace(/^a\s+/i, "")
    .replace(/^direction\s+/i, "Direction ")
    .replace(/^monsieur le directeur\s+/i, "Direction ")
    .replace(/^madame la directrice\s+/i, "Direction ")
    .replace(/\bde l['’']hotel des monnaies\b/i, "")
    .replace(/\bhotel des monnaies\b/i, "")
    .replace(/\ba\s*\.?\s*i\s*\.?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const mappedCode = inferDirectionFromCode(cleaned);

  if (mappedCode) {
    return mappedCode;
  }

  if (/direction de coordination/i.test(cleaned) || /^coordination$/i.test(cleaned)) {
    return "Direction Generale";
  }

  return toTitleCase(cleaned);
}

function inferDirectionFromCode(referenceOrCode: string) {
  const normalized = referenceOrCode.toUpperCase();
  const mapping: Array<[string, string]> = [
    ["DTECH", "Direction Technique"],
    ["DT", "Direction Technique"],
    ["DAF", "Direction Administrative et Financiere"],
    ["DG", "Direction Generale"],
    ["DCOM", "Direction Commerciale"],
    ["DC", "Direction Commerciale"],
    ["DADM", "Direction Administrative"],
    ["DFIN", "Direction des Finances"]
  ];

  const matched = mapping.find(([code]) => normalized.includes(code));
  return matched?.[1] ?? "";
}

function normalizeAuthorityDirectionLine(line: string) {
  const cleaned = cleanInlineValue(line);

  if (/^directeur general\b/i.test(cleaned)) {
    return "Direction Generale";
  }

  if (/^direction de coordination\b/i.test(cleaned) || /^coordination$/i.test(cleaned)) {
    return "Direction Generale";
  }

  const explicitDirectionMatch = cleaned.match(/\bdirection\s+(.+)/i);

  if (explicitDirectionMatch?.[1]) {
    return normalizeDirectionLabel(`Direction ${cleanInlineValue(explicitDirectionMatch[1])}`);
  }

  const titledAuthorityMatch = cleaned.match(
    /\b(?:directeur|chef de service|manager|responsable|chef de bureau)\s+(.+)/i
  );

  if (titledAuthorityMatch?.[1]) {
    return normalizeDirectionLabel(`Direction ${cleanInlineValue(titledAuthorityMatch[1])}`);
  }

  return "";
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bDu\b/g, "du")
    .replace(/\bDe\b/g, "de")
    .replace(/\bDes\b/g, "des")
    .replace(/\bLa\b/g, "la")
    .replace(/\bLe\b/g, "le")
    .replace(/\bD'\b/g, "d'");
}

function normalizeDetectedYear(value: string, fullText: string) {
  if (!/2076\b/.test(value)) {
    return value;
  }

  if (/2026/.test(fullText)) {
    return value.replace(/2076\b/g, "2026");
  }

  return value;
}

function splitMergedSignerLine(value: string) {
  const cleaned = value.trim().replace(/\s+/g, " ");
  const tokens = cleaned.split(" ").filter(Boolean);

  if (tokens.length === 4) {
    return [`${tokens[0]} ${tokens[1]}`, `${tokens[2]} ${tokens[3]}`];
  }

  return [cleaned];
}
