type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type Department = {
  id: string;
  code: string;
  name: string;
  type: "DIRECTION_GENERALE" | "DIRECTION" | "SERVICE" | "BUREAU";
};

type User = {
  id: string;
  email: string;
  matricule: string;
};

const apiBaseUrl = process.env.SIGEDA_ON_PREMISE_API_URL ?? "http://localhost:4100/api/v1";
const keycloakUrl = process.env.KEYCLOAK_URL ?? "http://localhost:8080";
const realm = process.env.KEYCLOAK_REALM ?? "sigeda";
const clientId = process.env.KEYCLOAK_CLIENT_ID ?? "sigeda-web";
const username = process.env.KEYCLOAK_TEST_USERNAME ?? "admin@sigeda.local";
const password = process.env.KEYCLOAK_TEST_PASSWORD ?? "SigedaAdmin1!";

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }

  return body ? (JSON.parse(body) as T) : ({} as T);
}

async function getAccessToken() {
  const params = new URLSearchParams({
    grant_type: "password",
    client_id: clientId,
    username,
    password
  });

  const response = await fetch(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  const token = await readJson<TokenResponse>(response);

  if (!token.access_token) {
    throw new Error(token.error_description ?? token.error ?? "Keycloak did not return an access token.");
  }

  return token.access_token;
}

async function api<T>(path: string, token: string, init?: RequestInit) {
  return readJson<T>(
    await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`
      }
    })
  );
}

async function main() {
  console.log(`SIGEDA smoke test: ${apiBaseUrl}`);

  const token = await getAccessToken();
  console.log("Keycloak token: ok");

  const health = await readJson(await fetch(`${apiBaseUrl}/health`));
  console.log("GET /health:", health);

  const departments = await api<Department[]>("/departments", token);
  const users = await api<User[]>("/users", token);
  const hierarchy = await api<unknown>("/departments/hierarchy", token);
  await api<unknown[]>("/documents", token);
  await api<unknown[]>("/folders", token);
  await api<unknown[]>("/document-archives", token);
  await api<unknown>("/attachments/storage-plan", token);
  await api<unknown>("/search/index-plan", token);

  console.log(`Seed departments: ${departments.length}`);
  console.log(`Seed users: ${users.length}`);
  console.log("Hierarchy:", Array.isArray(hierarchy) ? `${hierarchy.length} root node(s)` : "ok");

  const direction = departments.find((item) => item.code === "DIR_FIN" && item.type === "DIRECTION");
  const bureau = departments.find((item) => item.code === "B_CADRE" && item.type === "BUREAU");
  const admin = users.find((item) => item.email === username) ?? users[0];

  if (!direction || !bureau || !admin) {
    throw new Error("Pilot seed is incomplete. Run npm.cmd run db:seed before the smoke test.");
  }

  const year = new Date().getFullYear();
  const referenceNumber = Math.floor(Date.now() / 1000);
  const folder = await api<unknown>("/folders", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      year,
      bureauId: bureau.id,
      partnerDirectionId: direction.id
    })
  });

  const document = await api<unknown>("/documents", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reference: `SMOKE-${year}-${referenceNumber}`,
      referenceNumber,
      year,
      title: "Document pilote smoke test",
      subject: "Validation Keycloak PostgreSQL",
      summary: "Document cree par le smoke test on-premise.",
      type: "COURRIER",
      emitterDirectionId: direction.id,
      receiverDirectionIds: [direction.id],
      copyDirectionIds: [],
      bureauId: bureau.id,
      authorId: admin.id
    })
  });

  console.log("POST /folders: ok", folder);
  console.log("POST /documents: ok", document);
  console.log("Smoke test completed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
