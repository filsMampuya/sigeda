import type { DocumentIntelligenceResult } from "@sigeda/shared/types";

export function applyConfidenceDefaults(result: DocumentIntelligenceResult): DocumentIntelligenceResult {
  const fieldConfidence = {
    reference: scoreText(result.reference),
    title: scoreText(result.title),
    subject: scoreText(result.subject),
    documentDate: scoreText(result.documentDate),
    emitterDirection: scoreText(result.emitterDirection),
    receiverDirections: scoreArray(result.receiverDirections),
    copyDirections: scoreArray(result.copyDirections),
    signers: scoreArray(result.signers),
    documentType: scoreText(result.documentType),
    confidentialityLevel: scoreText(result.confidentialityLevel),
    summary: scoreText(result.summary),
    keywords: scoreArray(result.keywords),
    ...result.fieldConfidence
  };

  const numericScores = Object.values(fieldConfidence).filter((value) => Number.isFinite(value));
  const average =
    numericScores.length > 0
      ? numericScores.reduce((sum, value) => sum + value, 0) / numericScores.length
      : result.confidenceScore;

  return {
    ...result,
    fieldConfidence,
    confidenceScore: clamp01(average)
  };
}

export function isLowConfidence(result: DocumentIntelligenceResult) {
  const threshold = Number.parseFloat(process.env.DOCUMENT_AI_LOW_CONFIDENCE_THRESHOLD ?? "0.70");
  return result.confidenceScore < threshold;
}

function scoreText(value: string) {
  return value.trim().length > 0 ? 0.85 : 0.1;
}

function scoreArray(values: string[]) {
  return values.length > 0 ? 0.8 : 0.1;
}

function clamp01(value: number) {
  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return Number(value.toFixed(4));
}
