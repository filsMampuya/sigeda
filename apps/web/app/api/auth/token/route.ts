import { NextResponse } from "next/server";

import { authCookieName } from "@/lib/auth";

export function GET(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${authCookieName}=`))
    ?.split("=")[1];

  if (!token) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  return NextResponse.json({ accessToken: token });
}
