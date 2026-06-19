import { NextResponse } from "next/server";

import { getServerOnPremiseApiBaseUrl } from "@/lib/env";
import {
  applyServerSessionCookies,
  buildUnauthorizedSessionResponse,
  ensureServerAccessToken
} from "@/lib/server-session";

export async function GET(request: Request) {
  const session = await ensureServerAccessToken(request);

  if (!session?.accessToken) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    let response = await fetch(`${getServerOnPremiseApiBaseUrl()}/auth/me`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`
      },
      cache: "no-store"
    });

    let refreshedSession = session.refreshedSession;

    if (response.status === 401) {
      const forcedSession = await ensureServerAccessToken(request, { forceRefresh: true });

      if (!forcedSession?.accessToken) {
        return buildUnauthorizedSessionResponse(request);
      }

      response = await fetch(`${getServerOnPremiseApiBaseUrl()}/auth/me`, {
        headers: {
          Authorization: `Bearer ${forcedSession.accessToken}`
        },
        cache: "no-store"
      });
      refreshedSession = forcedSession.refreshedSession;
    }

    if (!response.ok) {
      if (response.status === 401) {
        return buildUnauthorizedSessionResponse(request);
      }

      return NextResponse.json({ user: null }, { status: response.status });
    }

    const payload = (await response.json()) as unknown;
    const nextResponse = NextResponse.json(payload, { status: 200 });
    return applyServerSessionCookies(nextResponse, request, refreshedSession);
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
