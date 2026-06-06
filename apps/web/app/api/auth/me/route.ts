import { NextResponse } from "next/server";

import { getServerAuthToken } from "@/lib/auth";
import { getServerApiBaseUrl } from "@/lib/env";

export async function GET() {
  const authToken = getServerAuthToken();

  if (!authToken) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const response = await fetch(`${getServerApiBaseUrl()}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json({ user: null }, { status: response.status });
    }

    const payload = (await response.json()) as unknown;

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
