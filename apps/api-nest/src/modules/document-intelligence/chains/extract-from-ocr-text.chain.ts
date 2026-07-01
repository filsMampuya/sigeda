import type { DocumentIntelligenceResult } from "@sigeda/shared/types";
import type { LocalLlmProvider } from "../providers/local-llm-provider.interface.js";
import { buildTextExtractionPrompt } from "../prompts/extract-document-from-text.prompt.js";
import { extractDocumentFromOcrHeuristics } from "../utils/extract-from-ocr-heuristics.js";
import { normalizeLlmResultPayload } from "../utils/normalize-llm-result.js";
import { parseLlmJsonContent } from "../utils/parse-llm-json.js";
import { prepareOcrTextForLlm } from "../utils/prepare-ocr-text.js";

export async function extractFromOcrTextChain(input: {
  provider: LocalLlmProvider;
  model: string;
  text: string;
}): Promise<{ result: DocumentIntelligenceResult; modelName: string }> {
  const preparedText = prepareOcrTextForLlm(input.text);
  const response = await input.provider.extractStructuredFromText({
    model: input.model,
    prompt: buildTextExtractionPrompt(),
    text: preparedText
  });

  try {
    const payload = parseLlmJsonContent(response.content);
    const result = normalizeLlmResultPayload(payload, "ocr", preparedText) as DocumentIntelligenceResult;

    return {
      result: {
        ...result,
        extractionMode: "ocr",
        rawExtractedText: preparedText
      },
      modelName: response.model
    };
  } catch {
    const heuristicResult = extractDocumentFromOcrHeuristics(preparedText);

    if (!heuristicResult) {
      throw new Error("La reponse du modele local n'est pas un JSON valide et aucun fallback OCR n'est disponible.");
    }

    return {
      result: {
        ...heuristicResult,
        extractionMode: "ocr",
        rawExtractedText: preparedText
      },
      modelName: `${response.model}:heuristic-fallback`
    };
  }
}
