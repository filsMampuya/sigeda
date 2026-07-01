export type VisionExtractionInput = {
  imageBuffers: Buffer[];
  model: string;
  prompt: string;
};

export type TextExtractionInput = {
  model: string;
  prompt: string;
  text: string;
};

export type LocalLlmProviderOutput = {
  model: string;
  content: string;
};

export interface LocalLlmProvider {
  extractStructuredFromVision(input: VisionExtractionInput): Promise<LocalLlmProviderOutput>;
  extractStructuredFromText(input: TextExtractionInput): Promise<LocalLlmProviderOutput>;
}
