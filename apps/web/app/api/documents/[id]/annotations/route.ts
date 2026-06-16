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

  const contentType = request.headers.get("content-type") ?? "";
  let response: Response;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    response = await fetch(`${getServerOnPremiseApiBaseUrl()}/documents/${params.id}/annotations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      body: formData,
      cache: "no-store"
    });
  } else {
    const payload = await request.json().catch(() => null);
    response = await fetch(`${getServerOnPremiseApiBaseUrl()}/documents/${params.id}/annotations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
  }

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json"
    }
  });
}
