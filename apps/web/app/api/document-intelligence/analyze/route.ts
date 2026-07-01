import { NextResponse } from "next/server";

import { getServerOnPremiseApiBaseUrl } from "@/lib/env";
import { applyServerSessionCookies, executeWithServerSessionRetry } from "@/lib/server-session";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const payload = await request.formData();
  const mode = String(payload.get("mode") ?? "auto");
  const file = payload.get("file");
  const fileInfo =
    file instanceof File
      ? {
          name: file.name,
          type: file.type,
          size: file.size
        }
      : null;

  debugLog("analyze.proxy.received", {
    mode,
    file: fileInfo
  });

  const execution = await executeWithServerSessionRetry(request, (accessToken) =>
    fetch(`${getServerOnPremiseApiBaseUrl()}/document-intelligence/analyze`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: payload,
      cache: "no-store"
    })
  );

  if (execution.unauthorized || !execution.response) {
    debugLog("analyze.proxy.unauthorized", {
      durationMs: Date.now() - startedAt
    });
    return execution.unauthorized;
  }

  const response = execution.response;
  const text = await response.text();
  debugLog("analyze.proxy.completed", {
    status: response.status,
    durationMs: Date.now() - startedAt
  });
  const nextResponse = new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "x-sigeda-di-proxy-ms": String(Date.now() - startedAt)
    }
  });

  return applyServerSessionCookies(nextResponse, request, execution.refreshedSession);
}

function debugLog(event: string, payload?: Record<string, unknown>) {
  if ((process.env.DOCUMENT_AI_DEBUG ?? "").trim().toLowerCase() !== "true") {
    return;
  }

  const timestamp = new Date().toISOString();
  const suffix = payload ? ` ${JSON.stringify(payload)}` : "";
  console.info(`[document-intelligence-web][${timestamp}] ${event}${suffix}`);
}
