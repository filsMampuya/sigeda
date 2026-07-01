export function buildDocumentIntelligenceObjectKey(jobId: string, originalFileName: string) {
  const safeFileName = originalFileName.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const prefix = process.env.DOCUMENT_AI_TEMP_BUCKET_PREFIX ?? "tmp/document-intelligence";
  return `${prefix}/${jobId}/${safeFileName}`;
}
