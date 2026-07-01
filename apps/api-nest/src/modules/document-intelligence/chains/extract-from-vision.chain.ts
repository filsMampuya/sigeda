import type { DocumentIntelligenceResult } from "@sigeda/shared/types";
import type { LocalLlmProvider } from "../providers/local-llm-provider.interface.js";
import { buildVisionExtractionPrompt } from "../prompts/extract-document-from-vision.prompt.js";
import { normalizeLlmResultPayload } from "../utils/normalize-llm-result.js";
import { parseLlmJsonContent } from "../utils/parse-llm-json.js";

export async function extractFromVisionChain(input: {
  provider: LocalLlmProvider;
  model: string;
  imageBuffers: Buffer[];
}): Promise<{ result: DocumentIntelligenceResult; modelName: string }> {
  const response = await input.provider.extractStructuredFromVision({
    model: input.model,
    prompt: buildVisionExtractionPrompt(),
    imageBuffers: input.imageBuffers
  });

  const payload = parseLlmJsonContent(response.content);
  const result = normalizeLlmResultPayload(payload, "vision", "") as DocumentIntelligenceResult;

  return {
    result: {
      ...result,
      extractionMode: "vision",
      rawExtractedText: result.rawExtractedText ?? ""
    },
    modelName: response.model
  };
}
