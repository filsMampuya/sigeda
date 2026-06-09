export async function getClientAuthToken() {
  const response = await fetch("/api/auth/token", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Votre session Keycloak a expire. Reconnectez-vous.");
  }

  const body = (await response.json()) as { accessToken?: string };

  if (!body.accessToken) {
    throw new Error("Token Keycloak introuvable.");
  }

  return body.accessToken;
}
