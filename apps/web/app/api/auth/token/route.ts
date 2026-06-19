import { NextResponse } from "next/server";

import {
  applyServerSessionCookies,
  buildUnauthorizedSessionResponse,
  ensureServerAccessToken
} from "@/lib/server-session";

export async function GET(request: Request) {
  const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";
  const session = await ensureServerAccessToken(request, { forceRefresh });

  if (!session?.accessToken) {
    return buildUnauthorizedSessionResponse(request);
  }

  const response = NextResponse.json({ accessToken: session.accessToken });
  return applyServerSessionCookies(response, request, session.refreshedSession);
}
