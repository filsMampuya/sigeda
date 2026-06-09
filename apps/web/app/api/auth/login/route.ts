import { NextResponse } from "next/server";

import { authStateCookieName } from "@/lib/auth";
import { buildKeycloakAuthorizeUrl, createAuthState } from "@/lib/keycloak";

function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto");

  if (forwardedProtocol) {
    return forwardedProtocol.split(",")[0]?.trim() === "https";
  }

  return new URL(request.url).protocol === "https:";
}

export function GET(request: Request) {
  const state = createAuthState();
  const response = NextResponse.redirect(buildKeycloakAuthorizeUrl(request.url, state));

  response.cookies.set(authStateCookieName, state, {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60
  });

  return response;
}
