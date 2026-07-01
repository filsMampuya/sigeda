export type OcrInput = {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
};

export type OcrOutput = {
  text: string;
  pageCount: number;
  durationMs: number;
  warnings: string[];
};

export interface OcrProvider {
  extractText(input: OcrInput): Promise<OcrOutput>;
}
