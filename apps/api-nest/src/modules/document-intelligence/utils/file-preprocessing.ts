import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";

export async function createWorkspace(prefix: string) {
  const baseDir = process.env.OCR_TEMP_DIR?.trim() || join(tmpdir(), "sigeda-ocr");
  await mkdir(baseDir, { recursive: true });
  return mkdtemp(join(baseDir, `${prefix}-`));
}

export async function cleanupWorkspace(path: string) {
  await rm(path, { recursive: true, force: true });
}

export async function writeSourceFile(workspace: string, fileName: string, fileBuffer: Buffer) {
  const filePath = join(workspace, basename(fileName));
  await writeFile(filePath, fileBuffer);
  return filePath;
}

export async function convertPdfFirstPageToPng(workspace: string, pdfPath: string) {
  const outputPrefix = join(workspace, "vision-page");
  await execFileAsync("pdftoppm", ["-f", "1", "-l", "1", "-singlefile", "-png", pdfPath, outputPrefix]);
  return readFile(`${outputPrefix}.png`);
}

export async function convertPdfToPngPages(workspace: string, pdfPath: string) {
  const outputPrefix = join(workspace, "ocr-page");
  await execFileAsync("pdftoppm", ["-png", pdfPath, outputPrefix]);
  const files = (await readdir(workspace))
    .filter((name) => name.startsWith("ocr-page") && name.endsWith(".png"))
    .sort();

  return files.map((name) => join(workspace, name));
}

export async function normalizeImageForOcr(workspace: string, sourcePath: string) {
  const outputPath = join(workspace, "ocr-image.png");
  await execFileAsync("convert", [
    sourcePath,
    "-auto-orient",
    "-colorspace",
    "Gray",
    "-strip",
    "-resize",
    "2200x2200>",
    "-density",
    "150",
    outputPath
  ]);

  return outputPath;
}

export async function cropImageTopRegionForOcr(
  workspace: string,
  sourcePath: string,
  heightPercent = Number.parseInt(process.env.OCR_IMAGE_TOP_CROP_PERCENT ?? "94", 10)
) {
  const clampedPercent = Number.isFinite(heightPercent)
    ? Math.min(Math.max(heightPercent, 40), 100)
    : 82;
  const outputPath = join(workspace, "ocr-image-top.png");
  await execFileAsync("convert", [
    sourcePath,
    "-gravity",
    "North",
    "-crop",
    `100%x${clampedPercent}%+0+0`,
    "+repage",
    outputPath
  ]);

  return outputPath;
}

export async function cropImageBottomLeftRegionForOcr(
  workspace: string,
  sourcePath: string,
  widthPercent = Number.parseInt(process.env.OCR_IMAGE_COPY_WIDTH_PERCENT ?? "41", 10),
  heightPercent = Number.parseInt(process.env.OCR_IMAGE_COPY_HEIGHT_PERCENT ?? "29", 10)
) {
  const clampedWidth = Number.isFinite(widthPercent)
    ? Math.min(Math.max(widthPercent, 12), 60)
    : 41;
  const clampedHeight = Number.isFinite(heightPercent)
    ? Math.min(Math.max(heightPercent, 10), 45)
    : 29;
  const outputPath = join(workspace, "ocr-image-copy-bottom-left.png");
  await execFileAsync("convert", [
    sourcePath,
    "-gravity",
    "SouthWest",
    "-crop",
    `${clampedWidth}%x${clampedHeight}%+0+0`,
    "+repage",
    outputPath
  ]);

  return outputPath;
}

export async function execFileAsync(command: string, args: string[], timeoutMs?: number) {
  const timeout = timeoutMs ?? Number.parseInt(process.env.OCR_TIMEOUT_MS ?? "60000", 10);

  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(command, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}
