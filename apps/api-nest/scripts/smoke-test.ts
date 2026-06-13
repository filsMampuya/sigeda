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

type UserCreationResponse = {
  user: User;
  defaultPassword: string;
  mustChangePassword: boolean;
};

async function apiExpectStatus(path: string, token: string, expectedStatus: number, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status !== expectedStatus) {
    throw new Error(`Expected ${expectedStatus} for ${path}, got ${response.status}: ${await readText(response)}`);
  }
}

const apiBaseUrl = process.env.SIGEDA_ON_PREMISE_API_URL ?? "http://localhost:4100/api/v1";
const keycloakUrl = process.env.KEYCLOAK_URL ?? "http://localhost:8080";
const realm = process.env.KEYCLOAK_REALM ?? "sigeda";
const clientId = process.env.KEYCLOAK_CLIENT_ID ?? "sigeda-web";
const username = process.env.KEYCLOAK_TEST_USERNAME ?? "admin@sigeda.local";
const password = process.env.KEYCLOAK_TEST_PASSWORD ?? "SigedaAdmin1!";
const keycloakAdminUsername = process.env.KEYCLOAK_ADMIN_USERNAME ?? "admin";
const keycloakAdminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }

  return body ? (JSON.parse(body) as T) : ({} as T);
}

async function getAccessToken() {
  return getPasswordGrantToken(username, password);
}

async function getPasswordGrantToken(nextUsername: string, nextPassword: string, retries = 5) {
  const params = new URLSearchParams({
    grant_type: "password",
    client_id: clientId,
    username: nextUsername,
    password: nextPassword
  });

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const response = await fetch(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    const token = await response.json().catch(() => ({} as TokenResponse));

    if (response.ok && token.access_token) {
      return token.access_token;
    }

    const shouldRetry =
      response.status === 401 &&
      (token.error === "invalid_grant" || token.error_description?.toLowerCase().includes("invalid user credentials")) &&
      attempt < retries;

    if (!shouldRetry) {
      throw new Error(token.error_description ?? token.error ?? "Keycloak did not return an access token.");
    }

    await wait(1500 * attempt);
  }
  throw new Error("Keycloak did not return an access token.");
}

async function getKeycloakAdminToken() {
  const params = new URLSearchParams({
    grant_type: "password",
    client_id: "admin-cli",
    username: keycloakAdminUsername,
    password: keycloakAdminPassword
  });

  const response = await fetch(`${keycloakUrl}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  const token = await readJson<TokenResponse>(response);

  if (!token.access_token) {
    throw new Error(token.error_description ?? token.error ?? "Keycloak admin did not return an access token.");
  }

  return token.access_token;
}

async function readText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function ensureUserCanLogin(email: string, nextPassword: string) {
  const token = await getKeycloakAdminToken();
  const searchResponse = await fetch(
    `${keycloakUrl}/admin/realms/${realm}/users?username=${encodeURIComponent(email)}&exact=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  const users = await readJson<Array<{ id: string }>>(searchResponse);
  const user = users[0];

  if (!user) {
    throw new Error(`Keycloak user not found for ${email}.`);
  }

  const resetResponse = await fetch(`${keycloakUrl}/admin/realms/${realm}/users/${user.id}/reset-password`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: "password",
      value: nextPassword,
      temporary: false
    })
  });

  if (!resetResponse.ok) {
    throw new Error(`Keycloak reset-password failed: ${await readText(resetResponse)}`);
  }

  return user.id;
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
  await api<unknown>("/document-archives", token);
  await api<unknown>("/physical-archives", token);
  await api<unknown[]>("/audit-logs", token);
  await api<unknown>("/attachments/storage-plan", token);
  await api<unknown>("/search/index-plan", token);

  console.log(`Seed departments: ${departments.length}`);
  console.log(`Seed users: ${users.length}`);
  console.log("Hierarchy:", Array.isArray(hierarchy) ? `${hierarchy.length} root node(s)` : "ok");

  const emitterDirection = departments.find((item) => item.code === "DIR_FIN" && item.type === "DIRECTION");
  const receiverDirection = departments.find((item) => item.code === "DG" && item.type === "DIRECTION_GENERALE");
  const bureau = departments.find((item) => item.code === "B_CADRE" && item.type === "BUREAU");
  const admin = users.find((item) => item.email === username) ?? users[0];

  if (!emitterDirection || !receiverDirection || !bureau || !admin) {
    throw new Error("Pilot seed is incomplete. Run npm.cmd run db:seed before the smoke test.");
  }

  const year = new Date().getFullYear() + 2;
  const referenceNumber = Math.floor(Date.now() / 1000);
  const smokeUser = await api<UserCreationResponse>("/users", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      matricule: `SMK-${referenceNumber}`,
      email: `smoke.${referenceNumber}@sigeda.local`,
      nom: "Smoke",
      prenom: `Test${referenceNumber}`,
      roleCode: "AGENT",
      bureauCode: bureau.code
    })
  });
  const smokePassword = smokeUser.defaultPassword;
  await ensureUserCanLogin(smokeUser.user.email, smokePassword);
  const smokeToken = await getAccessTokenFor(smokeUser.user.email, smokePassword);

  const folder = await api<unknown>("/folders", smokeToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      year,
      partnerDirectionId: receiverDirection.id
    })
  });

  const document = await api<{
    id: string;
    reference: string;
    signers?: Array<{ userId?: string; signingOrder?: number; fullName: string }>;
  }>("/documents", smokeToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reference: `SMOKE-${year}-${referenceNumber}`,
      year,
      title: "Document pilote smoke test",
      subject: "Validation Keycloak PostgreSQL",
      summary: "Document cree par le smoke test on-premise avec signataires multiples.",
      type: "COURRIER",
      emitterDirectionId: emitterDirection.id,
      receiverDirectionIds: [receiverDirection.id],
      copyDirectionIds: [],
      signers: [{ userId: smokeUser.user.id, signingOrder: 1 }]
    })
  });

  const documentArchives = await api<{
    items: Array<{ documentId: string }>;
  }>("/document-archives", smokeToken);
  const physicalArchives = await api<{
    items: Array<{ documentId: string; documentArchiveId: string; partnerDirectionId?: string }>;
  }>("/physical-archives", smokeToken);
  const auditLogs = await api<
    Array<{
      action: string;
      entityId: string;
    }>
  >("/audit-logs", token);

  const archiveCount = documentArchives.items.filter((item) => item.documentId === document.id).length;
  const physicalArchiveCount = physicalArchives.items.filter((item) => item.documentId === document.id).length;
  const hasAudit = auditLogs.some((log) => log.entityId === document.id && log.action === "CREATE_DOCUMENT");

  if ((document.signers?.length ?? 0) < 1) {
    throw new Error("POST /documents did not persist the signer.");
  }

  if (archiveCount < 1) {
    throw new Error("POST /documents did not generate document archives.");
  }

  if (physicalArchiveCount < 1) {
    throw new Error("POST /documents did not generate physical archives.");
  }

  if (!hasAudit) {
    throw new Error("POST /documents did not generate a CREATE_DOCUMENT audit log.");
  }

  const createdPhysicalArchive = physicalArchives.items.find((item) => item.documentId === document.id);
  if (!createdPhysicalArchive) {
    throw new Error("Le classement automatique physique n'a pas ete genere.");
  }

  await apiExpectStatus("/physical-archives", smokeToken, 410, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentArchiveId: createdPhysicalArchive.documentArchiveId,
      documentId: document.id,
      partnerDirectionId: createdPhysicalArchive.partnerDirectionId,
      site: "Site principal",
      batiment: "Batiment A",
      salle: "Salle 01",
      rayon: "R1",
      etagere: "E2",
      classeur: `CL-${referenceNumber}`,
      dossier: "DOS-SMOKE",
      boiteArchive: "BA-01"
    })
  });

  console.log("POST /folders: ok", folder);
  console.log("POST /documents: ok", {
    id: document.id,
    reference: document.reference,
    signers: document.signers?.map((signer) => ({
      userId: signer.userId,
      signingOrder: signer.signingOrder,
      fullName: signer.fullName
    }))
  });
  console.log("GET /document-archives: ok", { matches: archiveCount });
  console.log("GET /physical-archives: ok", { matches: physicalArchiveCount });
  console.log("POST /physical-archives: rejected as expected");
  console.log("GET /audit-logs: ok", { createDocumentAudit: hasAudit });
  console.log("Smoke test completed.");
}

async function getAccessTokenFor(nextUsername: string, nextPassword: string) {
  return getPasswordGrantToken(nextUsername, nextPassword);
}

function wait(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
