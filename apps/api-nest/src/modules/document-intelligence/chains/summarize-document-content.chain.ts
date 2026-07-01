import type { DocumentIntelligenceResult } from "@sigeda/shared/types";
import type { LocalLlmProvider } from "../providers/local-llm-provider.interface.js";
import { buildAdministrativeSummaryPrompt } from "../prompts/summarize-document-content.prompt.js";
import { parseLlmJsonContent } from "../utils/parse-llm-json.js";
import { prepareOcrTextForLlm } from "../utils/prepare-ocr-text.js";

export async function summarizeDocumentContentChain(input: {
  provider: LocalLlmProvider;
  model: string;
  text: string;
  extracted: Pick<
    DocumentIntelligenceResult,
    "reference" | "title" | "subject" | "documentDate" | "emitterDirection" | "receiverDirections" | "copyDirections" | "documentType"
  >;
}): Promise<{ summary: string; modelName: string }> {
  const preparedText = prepareOcrTextForLlm(input.text);
  const contextPayload = {
    reference: input.extracted.reference,
    title: input.extracted.title,
    subject: input.extracted.subject,
    documentDate: input.extracted.documentDate,
    emitterDirection: input.extracted.emitterDirection,
    receiverDirections: input.extracted.receiverDirections,
    copyDirections: input.extracted.copyDirections,
    documentType: input.extracted.documentType
  };
  const response = await input.provider.extractStructuredFromText({
    model: input.model,
    prompt: `${buildAdministrativeSummaryPrompt()}\n\nMETADONNEES EXTRAITES:\n${JSON.stringify(contextPayload)}`,
    text: preparedText
  });

  const payload = parseLlmJsonContent(response.content);
  const summary = normalizeAdministrativeSummary(readSummaryPayload(payload), input.extracted, preparedText);

  if (!summary) {
    throw new Error("Le modele local n'a pas retourne de resume exploitable.");
  }

  return {
    summary,
    modelName: response.model
  };
}

function readSummaryPayload(payload: unknown) {
  if (typeof payload === "string") {
    return payload.trim();
  }

  if (typeof payload === "object" && payload !== null && "summary" in payload) {
    const value = (payload as { summary?: unknown }).summary;
    return typeof value === "string" ? value.trim() : "";
  }

  return "";
}

function normalizeAdministrativeSummary(
  value: string,
  extracted: Pick<
    DocumentIntelligenceResult,
    "subject" | "emitterDirection" | "receiverDirections"
  >,
  rawText: string
) {
  const normalized = value
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .replace(/^["']+|["']+$/g, "")
    .replace(/\bavec nos respects\b/gi, "")
    .replace(/\bnous vous en souhaitons bonne reception\b/gi, "")
    .replace(/\bnous souhaitons bonne reception\b/gi, "")
    .replace(/\bveuillez agreer[^.]*\.?/gi, "")
    .trim();

  const transmissionSummary = buildAdministrativeTransmissionSummary(extracted, rawText);

  if (transmissionSummary) {
    return transmissionSummary;
  }

  if (!normalized) {
    return "";
  }

  const compact = normalized.length > 240 ? normalized.slice(0, 237).trimEnd() + "..." : normalized;
  return /[.!?]$/.test(compact) ? compact : `${compact}.`;
}

function buildAdministrativeTransmissionSummary(
  extracted: Pick<DocumentIntelligenceResult, "subject" | "emitterDirection" | "receiverDirections">,
  rawText: string
) {
  if (!/^transmission\b/i.test(extracted.subject.trim())) {
    return "";
  }

  const cleanedSubject = extracted.subject
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.;:,]\s*$/g, "");
  const receiver = extracted.receiverDirections[0]?.trim();
  const emitter = extracted.emitterDirection.trim();
  const periodMatch = rawText.match(/du mois de\s+([A-Za-zÀ-ÿ]+\s+\d{4})/i);
  const period = periodMatch?.[1]?.trim();
  const pieces = [cleanedSubject];

  if (emitter) {
    pieces.push(`de la ${emitter}`);
  }

  if (period) {
    pieces.push(`pour ${period}`);
  }

  if (receiver) {
    pieces.push(`a l'attention de la ${receiver}`);
  }

  const sentence = pieces.join(" ");
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}
