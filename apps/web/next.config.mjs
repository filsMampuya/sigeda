function collectAllowedServerActionOrigins() {
  const candidates = [
    process.env.SIGEDA_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_SIGEDA_API_URL,
    process.env.NEXT_PUBLIC_SIGEDA_ON_PREMISE_API_URL,
    process.env.KEYCLOAK_URL,
    process.env.NEXT_PUBLIC_KEYCLOAK_URL
  ].filter(Boolean);

  const hosts = new Set([
    "localhost:3000",
    "localhost:8088",
    "127.0.0.1:3000",
    "127.0.0.1:3443",
    "sigeda-preprod.local:3443",
    "sigeda-preprod.hdm:3443",
    "172.16.10.27:3443"
  ]);

  for (const candidate of candidates) {
    try {
      hosts.add(new URL(candidate).host);
    } catch {
      // Ignore malformed or unset URLs in local environments.
    }
  }

  return Array.from(hosts);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Reverse-proxy and TLS deployments submit forms with the public host,
      // so Next.js must trust these origins for server actions.
      allowedOrigins: collectAllowedServerActionOrigins()
    }
  }
};

export default nextConfig;
