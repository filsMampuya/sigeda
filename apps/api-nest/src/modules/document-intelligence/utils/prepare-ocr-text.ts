export function prepareOcrTextForLlm(text: string) {
  const maxChars = Number.parseInt(process.env.DOCUMENT_AI_MAX_OCR_TEXT_CHARS ?? "4000", 10);

  const normalized = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return normalized.slice(0, maxChars);
}
