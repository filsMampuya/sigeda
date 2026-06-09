import { NextResponse } from "next/server";

import { authCookieName, authStateCookieName } from "@/lib/auth";
import { buildKeycloakLogoutUrl } from "@/lib/keycloak";

function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto");

  if (forwardedProtocol) {
    return forwardedProtocol.split(",")[0]?.trim() === "https";
  }

  return new URL(request.url).protocol === "https:";
}

export function GET(request: Request) {
  const response = NextResponse.redirect(buildKeycloakLogoutUrl(request.url));

  for (const name of [authCookieName, authStateCookieName]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });
  }

  return response;
}
