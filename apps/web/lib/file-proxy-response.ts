import { NextResponse } from "next/server";

import { getServerOnPremiseApiBaseUrl } from "@/lib/env";
import { applyServerSessionCookies, executeWithServerSessionRetry } from "@/lib/server-session";

export async function proxyBackendFileResponse(
  request: Request,
  backendPath: string
) {
  const execution = await executeWithServerSessionRetry(request, (accessToken) =>
    fetch(`${getServerOnPremiseApiBaseUrl()}${backendPath}`, {
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
  const nextResponse = new NextResponse(response.body, {
    status: response.status
  });

  const contentType = response.headers.get("content-type");
  const contentDisposition = response.headers.get("content-disposition");
  const contentLength = response.headers.get("content-length");
  const cacheControl = response.headers.get("cache-control");

  if (contentType) {
    nextResponse.headers.set("Content-Type", contentType);
  }

  if (contentDisposition) {
    nextResponse.headers.set("Content-Disposition", contentDisposition);
  }

  if (contentLength) {
    nextResponse.headers.set("Content-Length", contentLength);
  }

  if (cacheControl) {
    nextResponse.headers.set("Cache-Control", cacheControl);
  } else {
    nextResponse.headers.set("Cache-Control", "no-store");
  }

  return applyServerSessionCookies(nextResponse, request, execution.refreshedSession);
}
