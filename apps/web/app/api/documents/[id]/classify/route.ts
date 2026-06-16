import { NextResponse } from "next/server";

import { getServerAuthToken } from "@/lib/auth";
import { getServerOnPremiseApiBaseUrl } from "@/lib/env";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(_request: Request, { params }: RouteContext) {
  const authToken = getServerAuthToken();

  if (!authToken) {
    return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  }

  const response = await fetch(`${getServerOnPremiseApiBaseUrl()}/documents/${params.id}/classify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`
    },
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
