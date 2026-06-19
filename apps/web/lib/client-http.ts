import { getClientAuthToken } from "@/lib/client-auth-token";

export class ClientHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code:
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "VALIDATION"
      | "NOT_FOUND"
      | "CONFLICT"
      | "NETWORK"
      | "SERVER"
      | "UNKNOWN"
  ) {
    super(message);
    this.name = "ClientHttpError";
  }
}

function mapStatusToCode(status: number): ClientHttpError["code"] {
  if (status === 401) {
    return "UNAUTHORIZED";
  }

  if (status === 403) {
    return "FORBIDDEN";
  }

  if (status === 400 || status === 422) {
    return "VALIDATION";
  }

  if (status === 404) {
    return "NOT_FOUND";
  }

  if (status === 409) {
    return "CONFLICT";
  }

  if (status >= 500) {
    return "SERVER";
  }

  return "UNKNOWN";
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string | string[] };

    if (Array.isArray(payload.message)) {
      return payload.message.join(" ");
    }

    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }
  } catch {
    // noop
  }

  return null;
}

function getFallbackMessage(status: number) {
  switch (status) {
    case 401:
      return "Votre session a expire. Reconnectez-vous puis reessayez.";
    case 403:
      return "Vous n'etes pas autorise a effectuer cette action.";
    case 404:
      return "La ressource demandee est introuvable.";
    case 409:
      return "Cette operation entre en conflit avec l'etat actuel des donnees.";
    default:
      if (status >= 500) {
        return "Une erreur serveur est survenue. Reessayez dans un instant.";
      }

      return "La requete a echoue.";
  }
}

export async function authorizedRequest(input: RequestInfo | URL, init?: RequestInit) {
  async function execute(forceRefresh = false) {
    const token = await getClientAuthToken(forceRefresh);
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);

    return fetch(input, {
      ...init,
      headers
    });
  }

  try {
    let response = await execute(false);

    if (response.status === 401) {
      response = await execute(true);
    }

    if (!response.ok) {
      throw new ClientHttpError(
        (await readErrorMessage(response)) ?? getFallbackMessage(response.status),
        response.status,
        mapStatusToCode(response.status)
      );
    }

    return response;
  } catch (error) {
    if (error instanceof ClientHttpError) {
      throw error;
    }

    if (error instanceof Error) {
      const message = error.message.trim();

      if (message.length > 0 && message !== "Failed to fetch") {
        throw new ClientHttpError(
          message,
          message.includes("session") || message.includes("Keycloak") ? 401 : 0,
          message.includes("session") || message.includes("Keycloak") ? "UNAUTHORIZED" : "NETWORK"
        );
      }
    }

    throw new ClientHttpError(
      "Le serveur est injoignable pour le moment. Verifiez votre connexion puis reessayez.",
      0,
      "NETWORK"
    );
  }
}

export function getDisplayableErrorMessage(error: unknown) {
  if (error instanceof ClientHttpError || error instanceof Error) {
    return error.message;
  }

  return "Une erreur inattendue est survenue.";
}
