import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authCookieName, authIdCookieName, authRefreshCookieName } from "@/lib/auth";

const publicPaths = ["/login"];

function parseTokenExpiration(token: string | undefined) {
  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob((token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

function isTokenUsable(token: string | undefined) {
  const expiration = parseTokenExpiration(token);
  if (!expiration) {
    return Boolean(token);
  }

  return expiration - Math.floor(Date.now() / 1000) > 60;
}

function getKeycloakRuntimeConfig() {
  const internalUrl = process.env.KEYCLOAK_INTERNAL_URL ?? process.env.KEYCLOAK_URL ?? "http://keycloak:8080";
  const realm = process.env.KEYCLOAK_REALM ?? "sigeda";
  const clientId = process.env.KEYCLOAK_CLIENT_ID ?? "sigeda-web";

  return { internalUrl, realm, clientId };
}

async function tryRefreshSession(request: NextRequest) {
  const refreshToken = request.cookies.get(authRefreshCookieName)?.value;
  if (!refreshToken) {
    return null;
  }

  const { internalUrl, realm, clientId } = getKeycloakRuntimeConfig();
  const tokenUrl = new URL(`/realms/${realm}/protocol/openid-connect/token`, internalUrl);
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const refreshResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  if (!refreshResponse.ok) {
    return false;
  }

  const payload = (await refreshResponse.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_expires_in?: number;
    id_token?: string;
  };

  if (!payload.access_token) {
    return false;
  }

  return payload;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(authCookieName)?.value;
  const refreshToken = request.cookies.get(authRefreshCookieName)?.value;
  const hasSession = Boolean(accessToken || refreshToken);
  const isPublicPath = publicPaths.includes(pathname);

  if (!hasSession && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isPublicPath && !isTokenUsable(accessToken) && refreshToken) {
    const refreshed = await tryRefreshSession(request);

    if (refreshed === false) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      for (const cookieName of [authCookieName, authRefreshCookieName, authIdCookieName]) {
        response.cookies.set(cookieName, "", {
          httpOnly: true,
          secure: request.nextUrl.protocol === "https:",
          sameSite: "lax",
          path: "/",
          maxAge: 0
        });
      }
      return response;
    }

    if (refreshed) {
      const accessToken = refreshed.access_token;

      if (!accessToken) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        for (const cookieName of [authCookieName, authRefreshCookieName, authIdCookieName]) {
          response.cookies.set(cookieName, "", {
            httpOnly: true,
            secure: request.nextUrl.protocol === "https:",
            sameSite: "lax",
            path: "/",
            maxAge: 0
          });
        }
        return response;
      }

      const response = NextResponse.next();
      response.cookies.set(authCookieName, accessToken, {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: refreshed.expires_in ?? 5 * 60
      });

      if (refreshed.refresh_token) {
        response.cookies.set(authRefreshCookieName, refreshed.refresh_token, {
          httpOnly: true,
          secure: request.nextUrl.protocol === "https:",
          sameSite: "lax",
          path: "/",
          maxAge: refreshed.refresh_expires_in ?? 30 * 24 * 60 * 60
        });
      }

      if (refreshed.id_token) {
        response.cookies.set(authIdCookieName, refreshed.id_token, {
          httpOnly: true,
          secure: request.nextUrl.protocol === "https:",
          sameSite: "lax",
          path: "/",
          maxAge: refreshed.expires_in ?? 5 * 60
        });
      }

      return response;
    }
  }

  if (hasSession && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
