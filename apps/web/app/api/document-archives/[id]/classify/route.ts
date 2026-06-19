import { NextResponse } from "next/server";

import { getServerOnPremiseApiBaseUrl } from "@/lib/env";
import {
  applyServerSessionCookies,
  executeWithServerSessionRetry
} from "@/lib/server-session";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteContext) {
  const execution = await executeWithServerSessionRetry(request, (accessToken) =>
    fetch(`${getServerOnPremiseApiBaseUrl()}/document-archives/${params.id}/classify`, {
      method: "POST",
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
