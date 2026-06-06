import { createRequire } from "node:module";
import Tesseract from "tesseract.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text?: string }>;

type OcrExtractionResult = {
  ocrExtractedAt?: string;
  ocrStatus: "NOT_APPLICABLE" | "PENDING" | "COMPLETED" | "FAILED";
  ocrText?: string;
};

export class OcrService {
  async extract(file: Express.Multer.File, fileKind: "PDF" | "IMAGE" | "OTHER"): Promise<OcrExtractionResult> {
    if (fileKind === "IMAGE") {
      return this.extractFromImage(file);
    }

    if (fileKind === "PDF") {
      return this.extractFromPdf(file);
    }

    return {
      ocrStatus: "NOT_APPLICABLE"
    };
  }

  private async extractFromImage(file: Express.Multer.File): Promise<OcrExtractionResult> {
    try {
      const result = await Tesseract.recognize(file.buffer, "eng");

      return {
        ocrStatus: "COMPLETED",
        ocrText: result.data.text.trim(),
        ocrExtractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("OCR failed for image", error);
      return {
        ocrStatus: "FAILED"
      };
    }
  }

  private async extractFromPdf(file: Express.Multer.File): Promise<OcrExtractionResult> {
    try {
      const result = await pdfParse(file.buffer);
      const text = result.text?.trim() ?? "";

      if (!text) {
        return {
          ocrStatus: "FAILED"
        };
      }

      return {
        ocrStatus: "COMPLETED",
        ocrText: text,
        ocrExtractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("OCR/text extraction failed for pdf", error);
      return {
        ocrStatus: "FAILED"
      };
    }
  }
}
