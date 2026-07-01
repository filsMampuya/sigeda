export function isDocumentIntelligenceDebugEnabled() {
  return (process.env.DOCUMENT_AI_DEBUG ?? "").trim().toLowerCase() === "true";
}

export function documentIntelligenceDebugLog(event: string, payload?: Record<string, unknown>) {
  if (!isDocumentIntelligenceDebugEnabled()) {
    return;
  }

  const timestamp = new Date().toISOString();
  const serializedPayload =
    payload && Object.keys(payload).length > 0
      ? ` ${JSON.stringify(payload, (_key, value) => (typeof value === "bigint" ? Number(value) : value))}`
      : "";

  console.info(`[document-intelligence][${timestamp}] ${event}${serializedPayload}`);
}
