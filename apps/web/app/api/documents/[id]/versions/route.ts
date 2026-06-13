import { NextResponse } from "next/server";

import { getServerAuthToken } from "@/lib/auth";
import { getServerOnPremiseApiBaseUrl } from "@/lib/env";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteContext) {
  const authToken = getServerAuthToken();

  if (!authToken) {
    return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  const response = await fetch(`${getServerOnPremiseApiBaseUrl()}/documents/${params.id}/versions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json"
    }
  });
}
