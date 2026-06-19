export async function getClientAuthToken(forceRefresh = false) {
  const response = await fetch(`/api/auth/token${forceRefresh ? "?refresh=1" : ""}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Votre session Keycloak a expire. Reconnectez-vous puis reessayez.");
  }

  const body = (await response.json()) as { accessToken?: string };

  if (!body.accessToken) {
    throw new Error("Token Keycloak introuvable.");
  }

  return body.accessToken;
}
