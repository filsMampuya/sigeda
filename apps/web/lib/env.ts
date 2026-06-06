const defaultApiUrl = "http://127.0.0.1:4000";

export function getServerApiBaseUrl() {
  return process.env.SIGEDA_API_URL ?? process.env.NEXT_PUBLIC_SIGEDA_API_URL ?? defaultApiUrl;
}

export function getPublicApiBaseUrl() {
  return process.env.NEXT_PUBLIC_SIGEDA_API_URL ?? defaultApiUrl;
}
