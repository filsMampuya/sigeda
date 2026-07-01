import { NextResponse } from "next/server";

import { getServerOnPremiseApiBaseUrl } from "@/lib/env";
import { applyServerSessionCookies, executeWithServerSessionRetry } from "@/lib/server-session";

export async function GET(request: Request) {
  const execution = await executeWithServerSessionRetry(request, (accessToken) =>
    fetch(`${getServerOnPremiseApiBaseUrl()}/document-intelligence/readiness`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    })
  );

  if (execution.unauthorized || !execution.response) {
    return execution.unauthorized;
  }

  const response = execution.response;
  const text = await response.text();
  const nextResponse = new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json"
    }
  });

  return applyServerSessionCookies(nextResponse, request, execution.refreshedSession);
}
