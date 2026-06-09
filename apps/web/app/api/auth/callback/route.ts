import { NextResponse } from "next/server";

import { authCookieName, authStateCookieName } from "@/lib/auth";
import { exchangeCodeForToken } from "@/lib/keycloak";

function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto");

  if (forwardedProtocol) {
    return forwardedProtocol.split(",")[0]?.trim() === "https";
  }

  return new URL(request.url).protocol === "https:";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${authStateCookieName}=`))
    ?.split("=")[1];

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/login?error=keycloak_state", request.url));
  }

  try {
    const token = await exchangeCodeForToken(request.url, code);
    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    response.cookies.set(authCookieName, token.access_token, {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      maxAge: token.expires_in ?? 5 * 60
    });
    response.cookies.set(authStateCookieName, "", {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=keycloak_callback", request.url));
  }
}
