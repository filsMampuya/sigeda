import { NextResponse } from "next/server";

import { authCookieName } from "@/lib/auth";

type SessionBody = {
  idToken?: string;
};

function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto");

  if (forwardedProtocol) {
    return forwardedProtocol.split(",")[0]?.trim() === "https";
  }

  return new URL(request.url).protocol === "https:";
}

export async function POST(request: Request) {
  const body = (await request.json()) as SessionBody;

  if (!body.idToken) {
    return NextResponse.json({ message: "Missing idToken." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName, body.idToken, {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60
  });

  return response;
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName, "", {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return response;
}
