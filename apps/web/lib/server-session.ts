import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { authCookieName, authIdCookieName, authRefreshCookieName } from "@/lib/auth";
import { refreshKeycloakToken, type KeycloakTokenResponse } from "@/lib/keycloak";

function normalizeCookieValue(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readCookieValue(request: Request, name: string) {
  return normalizeCookieValue(
    request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? null
  );
}

function getRequestCookieValue(request: Request, name: string) {
  try {
    return normalizeCookieValue(cookies().get(name)?.value ?? null) ?? readCookieValue(request, name);
  } catch {
    return readCookieValue(request, name);
  }
}

function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto");

  if (forwardedProtocol) {
    return forwardedProtocol.split(",")[0]?.trim() === "https";
  }

  return new URL(request.url).protocol === "https:";
}

function getJwtExpiration(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: number };
    return payload.exp ?? null;
  } catch {
    return undefined;
  }
}

function isTokenUsable(token: string | null) {
  if (!token) {
    return false;
  }

  const expiration = getJwtExpiration(token);
  if (typeof expiration !== "number") {
    return false;
  }

  return expiration - Math.floor(Date.now() / 1000) > 60;
}

export async function ensureServerAccessToken(
  request: Request,
  options?: {
    forceRefresh?: boolean;
  }
) {
  const accessToken = getRequestCookieValue(request, authCookieName);
  const forceRefresh = options?.forceRefresh ?? false;

  if (!forceRefresh && isTokenUsable(accessToken)) {
    return {
      accessToken,
      refreshedSession: null
    };
  }

  const refreshToken = getRequestCookieValue(request, authRefreshCookieName);

  if (!refreshToken) {
    return null;
  }

  try {
    const refreshedSession = await refreshKeycloakToken(refreshToken);

    if (!refreshedSession.access_token) {
      return null;
    }

    return {
      accessToken: refreshedSession.access_token,
      refreshedSession
    };
  } catch {
    return null;
  }
}

export async function executeWithServerSessionRetry(
  request: Request,
  execute: (accessToken: string) => Promise<Response>
) {
  const session = await ensureServerAccessToken(request);

  if (!session?.accessToken) {
    return {
      response: null,
      refreshedSession: null,
      unauthorized: buildUnauthorizedSessionResponse(request)
    };
  }

  let response = await execute(session.accessToken);
  let refreshedSession = session.refreshedSession;

  if (response.status === 401) {
    const forcedSession = await ensureServerAccessToken(request, { forceRefresh: true });

    if (!forcedSession?.accessToken) {
      return {
        response: null,
        refreshedSession: null,
        unauthorized: buildUnauthorizedSessionResponse(request)
      };
    }

    response = await execute(forcedSession.accessToken);
    refreshedSession = forcedSession.refreshedSession;

    if (response.status === 401) {
      return {
        response: null,
        refreshedSession: null,
        unauthorized: buildUnauthorizedSessionResponse(request)
      };
    }
  }

  return {
    response,
    refreshedSession,
    unauthorized: null
  };
}

export function applyServerSessionCookies(
  response: NextResponse,
  request: Request,
  refreshedSession: KeycloakTokenResponse | null
) {
  if (!refreshedSession?.access_token) {
    return response;
  }

  const secure = isSecureRequest(request);

  response.cookies.set(authCookieName, refreshedSession.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: refreshedSession.expires_in ?? 5 * 60
  });

  if (refreshedSession.refresh_token) {
    response.cookies.set(authRefreshCookieName, refreshedSession.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: refreshedSession.refresh_expires_in ?? 30 * 24 * 60 * 60
    });
  }

  if (refreshedSession.id_token) {
    response.cookies.set(authIdCookieName, refreshedSession.id_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: refreshedSession.expires_in ?? 5 * 60
    });
  }

  return response;
}

export function buildUnauthorizedSessionResponse(
  request: Request,
  message = "Votre session a expire. Reconnectez-vous puis reessayez."
) {
  const response = NextResponse.json({ message }, { status: 401 });
  const secure = isSecureRequest(request);

  for (const cookieName of [authCookieName, authRefreshCookieName, authIdCookieName]) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });
  }

  return response;
}
