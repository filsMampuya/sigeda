// Lien pour basculer en remote ou en local

// const defaultApiUrl = "https://us-central1-sigeda-c80ea.cloudfunctions.net/server";
const defaultApiUrl = "http://127.0.0.1:4000";


export function getServerApiBaseUrl() {
  return process.env.SIGEDA_API_URL ?? process.env.NEXT_PUBLIC_SIGEDA_API_URL ?? defaultApiUrl;
}

export function getPublicApiBaseUrl() {
  return process.env.NEXT_PUBLIC_SIGEDA_API_URL ?? defaultApiUrl;
}

export function getServerOnPremiseApiBaseUrl() {
  return process.env.SIGEDA_ON_PREMISE_API_URL ?? `${getServerApiBaseUrl()}/api/v1`;
}

export function getPublicOnPremiseApiBaseUrl() {
  return process.env.NEXT_PUBLIC_SIGEDA_ON_PREMISE_API_URL ?? `${getPublicApiBaseUrl()}/api/v1`;
}

export function getKeycloakPublicConfig() {
  return {
    url: process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? null,
    realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? null,
    clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? null
  };
}

export function getKeycloakServerConfig() {
  const publicConfig = getKeycloakPublicConfig();

  return {
    url: process.env.KEYCLOAK_URL ?? publicConfig.url,
    internalUrl: process.env.KEYCLOAK_INTERNAL_URL ?? process.env.KEYCLOAK_URL ?? publicConfig.url,
    realm: process.env.KEYCLOAK_REALM ?? publicConfig.realm,
    clientId: process.env.KEYCLOAK_CLIENT_ID ?? publicConfig.clientId
  };
}
