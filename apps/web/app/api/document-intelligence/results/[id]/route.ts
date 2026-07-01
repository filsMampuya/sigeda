import { NextResponse } from "next/server";

import { getServerOnPremiseApiBaseUrl } from "@/lib/env";
import { applyServerSessionCookies, executeWithServerSessionRetry } from "@/lib/server-session";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: RouteContext) {
  const startedAt = Date.now();
  const execution = await executeWithServerSessionRetry(request, (accessToken) =>
    fetch(`${getServerOnPremiseApiBaseUrl()}/document-intelligence/results/${params.id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    })
  );

  if (execution.unauthorized || !execution.response) {
    debugLog("result.proxy.unauthorized", {
      jobId: params.id,
      durationMs: Date.now() - startedAt
    });
    return execution.unauthorized;
  }

  const response = execution.response;
  const text = await response.text();
  debugLog("result.proxy.completed", {
    jobId: params.id,
    status: response.status,
    durationMs: Date.now() - startedAt
  });
  const nextResponse = new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json"
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
