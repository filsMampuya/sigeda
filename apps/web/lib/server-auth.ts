import { cookies } from "next/headers";

import { authCookieName, authIdCookieName, authRefreshCookieName } from "@/lib/auth";
import { refreshKeycloakToken } from "@/lib/keycloak";

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

function persistRefreshedSession(tokens: {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  id_token?: string;
}) {
  try {
    const cookieStore = cookies();

    cookieStore.set(authCookieName, tokens.access_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: tokens.expires_in ?? 5 * 60
    });

    if (tokens.refresh_token) {
      cookieStore.set(authRefreshCookieName, tokens.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: tokens.refresh_expires_in ?? 30 * 24 * 60 * 60
      });
    }

    if (tokens.id_token) {
      cookieStore.set(authIdCookieName, tokens.id_token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: tokens.expires_in ?? 5 * 60
      });
    }
  } catch {
    // Cookie writes are not allowed in every server context.
  }
}

export async function getValidServerAuthToken(forceRefresh = false) {
  const accessToken = cookies().get(authCookieName)?.value ?? null;

  if (!forceRefresh && isTokenUsable(accessToken)) {
    return accessToken;
  }

  const refreshToken = cookies().get(authRefreshCookieName)?.value ?? null;

  if (!refreshToken) {
    return null;
  }

  try {
    const refreshedSession = await refreshKeycloakToken(refreshToken);

    if (!refreshedSession.access_token) {
      return null;
    }

    persistRefreshedSession(refreshedSession);
    return refreshedSession.access_token;
  } catch {
    return null;
  }
}
