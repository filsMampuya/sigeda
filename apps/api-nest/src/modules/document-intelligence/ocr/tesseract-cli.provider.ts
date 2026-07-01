import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import type { OcrInput, OcrOutput, OcrProvider } from "./ocr-provider.interface.js";
import {
  cropImageBottomLeftRegionForOcr,
  cleanupWorkspace,
  convertPdfToPngPages,
  cropImageTopRegionForOcr,
  createWorkspace,
  execFileAsync,
  normalizeImageForOcr,
  writeSourceFile
} from "../utils/file-preprocessing.js";

@Injectable()
export class TesseractCliProvider implements OcrProvider {
  async checkAvailability() {
    try {
      await execFileAsync("tesseract", ["--version"]);
      return {
        available: true,
        reason: null
      };
    } catch (error) {
      return {
        available: false,
        reason: `OCR local indisponible: ${stringifyError(error)}`
      };
    }
  }

  async extractText(input: OcrInput): Promise<OcrOutput> {
    const startedAt = Date.now();
    const workspace = await createWorkspace("document-intelligence-ocr");
    const warnings: string[] = [];

    try {
      const sourceFile = await writeSourceFile(workspace, input.fileName, input.fileBuffer);
      const language = process.env.OCR_LANGUAGE ?? "fra+eng";

      if (input.mimeType === "application/pdf") {
        const pageFiles = await convertPdfToPngPages(workspace, sourceFile);
        const texts: string[] = [];

        for (const pageFile of pageFiles) {
          const { stdout } = await execFileAsync("tesseract", [
            pageFile,
            "stdout",
            "-l",
            language,
            "--psm",
            "4"
          ]);
          texts.push(stdout.trim());
        }

        return {
          text: texts.filter(Boolean).join("\n\n"),
          pageCount: pageFiles.length,
          durationMs: Date.now() - startedAt,
          warnings
        };
      }

      const normalizedImagePath = await normalizeImageForOcr(workspace, sourceFile);
      const imageLanguage = resolveImageOcrLanguage(language);
      const topRegionPath = await cropImageTopRegionForOcr(workspace, normalizedImagePath);
      const topRegionOutput = await execFileAsync("tesseract", [
        topRegionPath,
        "stdout",
        "-l",
        imageLanguage,
        "--psm",
        "4"
      ]);
      const topRegionText = topRegionOutput.stdout.trim();

      if (isSufficientTopRegionText(topRegionText)) {
        const fullImageOutput = await execFileAsync("tesseract", [
          normalizedImagePath,
          "stdout",
          "-l",
          imageLanguage,
          "--psm",
          "4"
        ]);
        const footerCopyText = await extractFooterCopyText(normalizedImagePath, workspace);

        return {
          text: mergeOcrTexts(topRegionText, fullImageOutput.stdout.trim(), footerCopyText),
          pageCount: 1,
          durationMs: Date.now() - startedAt,
          warnings: [...warnings, "OCR_TOP_REGION_MERGED", ...(footerCopyText ? ["OCR_COPY_FOOTER_SCANNED"] : [])]
        };
      }

      const { stdout } = await execFileAsync("tesseract", [
        normalizedImagePath,
        "stdout",
        "-l",
        imageLanguage,
        "--psm",
        "4"
      ]);
      const footerCopyText = await extractFooterCopyText(normalizedImagePath, workspace);
      const imageBuffer = await readFile(normalizedImagePath);

      if (imageBuffer.length === 0) {
        warnings.push("EMPTY_IMAGE_BUFFER");
      }

      return {
        text: mergeOcrTexts(stdout.trim(), footerCopyText),
        pageCount: 1,
        durationMs: Date.now() - startedAt,
        warnings: [...warnings, ...(footerCopyText ? ["OCR_COPY_FOOTER_SCANNED"] : [])]
      };
    } catch (error) {
      throw new ServiceUnavailableException(`OCR local indisponible: ${String(error)}`);
    } finally {
      await cleanupWorkspace(workspace);
    }
  }
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function resolveImageOcrLanguage(language: string) {
  if (language.includes("+")) {
    return language.split("+")[0] || language;
  }

  return language;
}

function isSufficientTopRegionText(text: string) {
  if (text.length < 140) {
    return false;
  }

  return /Concerne\s*:/i.test(text) || /NOTE A LA DIRECTION/i.test(text) || /Ref[.,\s:]/i.test(text);
}

function mergeOcrTexts(...texts: string[]) {
  const mergedLines = texts
    .flatMap((text) => text.split("\n"))
    .map((line) => line.trim())
    .filter(Boolean);

  return Array.from(new Set(mergedLines)).join("\n");
}

async function extractFooterCopyText(normalizedImagePath: string, workspace: string) {
  try {
    const footerCropPath = await cropImageBottomLeftRegionForOcr(workspace, normalizedImagePath);
    const focusedFooterCropPath = `${workspace}/ocr-image-copy-bottom-left-focused.png`;
    await execFileAsync("convert", [
      footerCropPath,
      "-gravity",
      "NorthWest",
      "-crop",
      "72%x38%+0+0",
      "+repage",
      focusedFooterCropPath
    ]);

    const footerScanVariants = [
      {
        outputPath: `${workspace}/ocr-copy-footer-normal.png`,
        convertArgs: [focusedFooterCropPath, "-resize", "1200%", "-colorspace", "Gray", "-sharpen", "0x2"],
        tesseractArgs: [
          "stdout",
          "-l",
          "eng",
          "--psm",
          "7",
          "-c",
          "tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.:/0123456789"
        ]
      },
      {
        outputPath: `${workspace}/ocr-copy-footer-threshold.png`,
        convertArgs: [focusedFooterCropPath, "-resize", "1400%", "-colorspace", "Gray", "-threshold", "70%"],
        tesseractArgs: [
          "stdout",
          "-l",
          "eng",
          "--psm",
          "11",
          "-c",
          "tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.:/0123456789"
        ]
      },
      {
        outputPath: `${workspace}/ocr-copy-footer-contrast.png`,
        convertArgs: [
          focusedFooterCropPath,
          "-resize",
          "1600%",
          "-colorspace",
          "Gray",
          "-contrast-stretch",
          "0",
          "-sharpen",
          "0x2"
        ],
        tesseractArgs: [
          "stdout",
          "-l",
          "eng",
          "--psm",
          "6",
          "-c",
          "tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.:/0123456789"
        ]
      }
    ];

    const candidateLines: string[] = [];

    for (const variant of footerScanVariants) {
      await execFileAsync("convert", [...variant.convertArgs, variant.outputPath]);
      const { stdout } = await execFileAsync("tesseract", [variant.outputPath, ...variant.tesseractArgs]);
      const normalized = normalizeFooterCopyText(stdout);

      if (normalized.length > 0) {
        candidateLines.push(normalized);
      }
    }

    return selectFooterCopyText(candidateLines);
  } catch {
    return "";
  }
}

function normalizeFooterCopyText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .replace(/[|!]/g, "I")
    .replace(/[\[\](){}]/g, "")
    .replace(/[,;]/g, ":")
    .trim();
}

function selectFooterCopyText(lines: string[]) {
  for (const line of lines) {
    const directMatch = line.match(/\bC\.?\s*[I1L]\.?\s*:?\s*([A-Z]{2,10})\b/i);

    if (directMatch?.[1]) {
      const normalizedCode = normalizeFooterDirectionCode(directMatch[1]);

      if (normalizedCode) {
        return `C.I.: ${normalizedCode}`;
      }
    }
  }

  for (const line of lines) {
    const fuzzyMatch = line.match(/\b([A-Z0-9]{2,10})\b/);

    if (fuzzyMatch?.[1]) {
      const normalizedCode = normalizeFooterDirectionCode(fuzzyMatch[1]);

      if (normalizedCode) {
        return `C.I.: ${normalizedCode}`;
      }
    }
  }

  return "";
}

function normalizeFooterDirectionCode(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!cleaned) {
    return "";
  }

  const exactCodes = new Set(["DT", "DG", "DC", "DAF", "DADM", "DCOM", "DFIN", "DTECH"]);

  if (exactCodes.has(cleaned)) {
    return cleaned;
  }

  const corrected = cleaned
    .replace(/^[0OQ]/, "D")
    .replace(/[1I|]/g, "I");

  if (exactCodes.has(corrected)) {
    return corrected;
  }

  if (/^D[F]$/.test(corrected)) {
    return "DT";
  }

  if (corrected === "DA") {
    return "DADM";
  }

  return "";
}
