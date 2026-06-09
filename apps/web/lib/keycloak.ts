import { randomBytes } from "node:crypto";

import { getKeycloakServerConfig } from "@/lib/env";

export function getKeycloakConfigOrThrow() {
  const config = getKeycloakServerConfig();

  if (!config.url || !config.internalUrl || !config.realm || !config.clientId) {
    throw new Error("Keycloak is not configured.");
  }

  return config as {
    url: string;
    internalUrl: string;
    realm: string;
    clientId: string;
  };
}

export function buildKeycloakAuthorizeUrl(requestUrl: string, state: string) {
  const config = getKeycloakConfigOrThrow();
  const redirectUri = new URL("/api/auth/callback", requestUrl).toString();
  const url = new URL(`/realms/${config.realm}/protocol/openid-connect/auth`, config.url);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);

  return url;
}

export function buildKeycloakLogoutUrl(requestUrl: string) {
  const config = getKeycloakConfigOrThrow();
  const redirectUri = new URL("/login", requestUrl).toString();
  const url = new URL(`/realms/${config.realm}/protocol/openid-connect/logout`, config.url);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("post_logout_redirect_uri", redirectUri);

  return url;
}

export async function exchangeCodeForToken(requestUrl: string, code: string) {
  const config = getKeycloakConfigOrThrow();
  const redirectUri = new URL("/api/auth/callback", requestUrl).toString();
  const tokenUrl = new URL(`/realms/${config.realm}/protocol/openid-connect/token`, config.internalUrl);
  const body = new URLSearchParams({
    client_id: config.clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  });
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Keycloak token exchange failed with status ${response.status}.`);
  }

  return (await response.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    id_token?: string;
  };
}

export function createAuthState() {
  return randomBytes(24).toString("base64url");
}
