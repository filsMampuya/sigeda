import { NextResponse } from "next/server";

import { authCookieName, authIdCookieName, authRefreshCookieName, authStateCookieName } from "@/lib/auth";
import { exchangeCodeForToken } from "@/lib/keycloak";
import { getRequestUrl } from "@/lib/request-url";

function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto");

  if (forwardedProtocol) {
    return forwardedProtocol.split(",")[0]?.trim() === "https";
  }

  return new URL(request.url).protocol === "https:";
}

function readCookieValue(request: Request, name: string) {
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

  if (!raw) {
    return null;
  }

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = readCookieValue(request, authStateCookieName);

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(getRequestUrl(request, "/login?error=keycloak_state"));
  }

  try {
    const token = await exchangeCodeForToken(request, code);
    const response = NextResponse.redirect(getRequestUrl(request, "/dashboard"));

    response.cookies.set(authCookieName, token.access_token, {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      maxAge: token.expires_in ?? 5 * 60
    });
    if (token.refresh_token) {
      response.cookies.set(authRefreshCookieName, token.refresh_token, {
        httpOnly: true,
        secure: isSecureRequest(request),
        sameSite: "lax",
        path: "/",
        maxAge: token.refresh_expires_in ?? 30 * 24 * 60 * 60
      });
    }
    if (token.id_token) {
      response.cookies.set(authIdCookieName, token.id_token, {
        httpOnly: true,
        secure: isSecureRequest(request),
        sameSite: "lax",
        path: "/",
        maxAge: token.expires_in ?? 5 * 60
      });
    }
    response.cookies.set(authStateCookieName, "", {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });

    return response;
  } catch {
    return NextResponse.redirect(getRequestUrl(request, "/login?error=keycloak_callback"));
  }
}
