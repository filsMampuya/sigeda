import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authCookieName } from "@/lib/auth";

const publicPaths = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/session") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(authCookieName)?.value);
  const isPublicPath = publicPaths.includes(pathname);

  if (!hasSession && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
