import type {
  DocumentIntelligenceRequestedMode,
  DocumentIntelligenceResult
} from "@sigeda/shared/types";
import { isLowConfidence } from "./confidence.js";

export function resolveRequestedMode(mode: string | undefined | null): DocumentIntelligenceRequestedMode {
  if (mode === "vision" || mode === "ocr") {
    return mode;
  }

  return "auto";
}

export function shouldRunVision(requestedMode: DocumentIntelligenceRequestedMode) {
  return requestedMode === "vision" || requestedMode === "auto";
}

export function shouldRunOcrFallback(input: {
  requestedMode: DocumentIntelligenceRequestedMode;
  mimeType: string;
  visionResult?: DocumentIntelligenceResult | null;
  visionError?: unknown;
}) {
  if (input.requestedMode === "ocr") {
    return true;
  }

  if (input.requestedMode === "vision") {
    return false;
  }

  if (input.visionError) {
    return true;
  }

  if (!input.visionResult) {
    return true;
  }

  if (input.mimeType === "application/pdf") {
    return true;
  }

  if (isLowConfidence(input.visionResult)) {
    return true;
  }

  if (!input.visionResult.reference.trim()) {
    return true;
  }

  if (!input.visionResult.subject.trim()) {
    return true;
  }

  if (!input.visionResult.emitterDirection.trim()) {
    return true;
  }

  if (input.visionResult.receiverDirections.length === 0 && input.visionResult.copyDirections.length === 0) {
    return true;
  }

  return false;
}
