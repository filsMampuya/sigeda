type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type Department = {
  id: string;
  code: string;
  designation: string;
  type: "DIRECTION_GENERALE" | "DIRECTION" | "SERVICE" | "BUREAU";
  parentId?: string | null;
  directionId?: string | null;
  serviceId?: string | null;
};

type UserRecord = {
  id: string;
  email: string;
  matricule: string;
};

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type UserCreationResponse = {
  user: UserRecord;
  defaultPassword: string;
  mustChangePassword: boolean;
};

type PhysicalArchiveItem = {
  id: string;
  documentArchiveId: string;
  documentId: string;
  partnerDirectionId?: string;
  site: string;
  batiment: string;
  salle: string;
  rayon: string;
  etagere: string;
  classeur: string;
  dossier: string;
  boiteArchive: string;
};

const apiBaseUrl = process.env.SIGEDA_ON_PREMISE_API_URL ?? "http://localhost:4100/api/v1";
const keycloakUrl = process.env.KEYCLOAK_URL ?? "http://localhost:8080";
const realm = process.env.KEYCLOAK_REALM ?? "sigeda";
const clientId = process.env.KEYCLOAK_CLIENT_ID ?? "sigeda-web";
const adminUsername = process.env.KEYCLOAK_TEST_USERNAME ?? "admin@sigeda.local";
const adminPassword = process.env.KEYCLOAK_TEST_PASSWORD ?? "SigedaAdmin1!";
const keycloakAdminUsername = process.env.KEYCLOAK_ADMIN_USERNAME ?? "admin";
const keycloakAdminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }

  return body ? (JSON.parse(body) as T) : ({} as T);
}

async function readText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function getPasswordGrantToken(username: string, password: string) {
  const params = new URLSearchParams({
    grant_type: "password",
    client_id: clientId,
    username,
    password
  });

  for (let attempt = 1; attempt <= 5; attempt += 1) {
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
      attempt < 5;

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

async function ensureUserCanLogin(email: string, password: string) {
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
      value: password,
      temporary: false
    })
  });

  if (!resetResponse.ok) {
    throw new Error(`Keycloak reset-password failed: ${await readText(resetResponse)}`);
  }

  const updateResponse = await fetch(`${keycloakUrl}/admin/realms/${realm}/users/${user.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requiredActions: []
    })
  });

  if (!updateResponse.ok) {
    throw new Error(`Keycloak user update failed: ${await readText(updateResponse)}`);
  }

  return user.id;
}

async function main() {
  const now = Math.floor(Date.now() / 1000);
  console.log(`SIGEDA functional test: ${apiBaseUrl}`);

  const adminToken = await getPasswordGrantToken(adminUsername, adminPassword);
  console.log("Admin authentication: ok");

  const departments = await api<Department[]>("/departments", adminToken);
  const users = await api<PaginatedResult<UserRecord>>("/users?page=1&pageSize=50", adminToken);
  console.log("Scoped users:", { total: users.total, page: users.page, pageSize: users.pageSize });

  const dg = departments.find((item) => item.code === "DG" && item.type === "DIRECTION_GENERALE");
  if (!dg) {
    throw new Error("Direction generale DG introuvable. Verifiez le seed PostgreSQL.");
  }

  const direction = await api<Department>("/departments", adminToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: `DIRT${now}`,
      designation: `Direction recette ${now}`,
      type: "DIRECTION",
      parentId: dg.id
    })
  });

  const delegatedDirection = await api<Department>("/departments", adminToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: `DIRX${now}`,
      designation: `Direction deleguee ${now}`,
      type: "DIRECTION",
      parentId: dg.id
    })
  });

  const service = await api<Department>("/departments", adminToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: `SVT${now}`,
      designation: `Service recette ${now}`,
      type: "SERVICE",
      parentId: direction.id
    })
  });

  const bureau = await api<Department>("/departments", adminToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: `BURT${now}`,
      designation: `Bureau recette ${now}`,
      type: "BUREAU",
      directionId: direction.id,
      serviceId: service.id
    })
  });

  const directBureau = await api<Department>("/departments", adminToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: `BDIR${now}`,
      designation: `Bureau direct ${now}`,
      type: "BUREAU",
      directionId: direction.id
    })
  });

  const createdUser = await api<UserCreationResponse>("/users", adminToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      matricule: `AGT-${now}`,
      email: `agent.recette.${now}@sigeda.local`,
      nom: "Agent",
      prenom: `Recette${now}`,
      roleCode: "AGENT",
      bureauCode: bureau.code
    })
  });

  const directUser = await api<UserCreationResponse>("/users", adminToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      matricule: `DRT-${now}`,
      email: `direct.recette.${now}@sigeda.local`,
      nom: "Direct",
      prenom: `Bureau${now}`,
      roleCode: "AGENT",
      bureauCode: directBureau.code
    })
  });

  const keycloakUserId = await ensureUserCanLogin(createdUser.user.email, createdUser.defaultPassword);
  const userToken = await getPasswordGrantToken(createdUser.user.email, createdUser.defaultPassword);
  const userMe = await api<{
    user: {
      id: string;
      email: string;
      directionId?: string | null;
      serviceId?: string | null;
      bureauId?: string | null;
    };
  }>("/auth/me", userToken);

  const year = new Date().getFullYear() + 3;
  const folder = await api<{ id: string; year: number; status: string }>("/folders", userToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      year,
      partnerDirectionId: dg.id
    })
  });

  const delegatedFolder = await api<{ id: string; year: number; status: string }>("/folders", userToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      year,
      partnerDirectionId: delegatedDirection.id
    })
  });

  const document = await api<{
    id: string;
    reference: string;
    emitterDirectionId?: string;
    signers?: Array<{ userId?: string; signingOrder?: number; fullName: string }>;
  }>("/documents", userToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reference: `RECETTE-${year}-${now}`,
      year,
      title: `Document recette ${now}`,
      subject: "Verification complete de la stack on-premise",
      summary: "Recette automatisee du provisionnement, du classement et de la tracabilite.",
      type: "COURRIER",
      emitterDirectionId: direction.id,
      receiverDirectionIds: [dg.id],
      copyDirectionIds: [],
      signers: [{ userId: createdUser.user.id, signingOrder: 1 }]
    })
  });

  const delegatedDocument = await api<{
    id: string;
    reference: string;
    emitterDirectionId?: string;
  }>("/documents", userToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reference: `DELEG-${year}-${now}`,
      year,
      title: `Document delegue ${now}`,
      subject: "Verification du changement de direction emettrice",
      summary: "Le document doit utiliser la direction emettrice selectionnee et non la direction de rattachement.",
      type: "NOTE",
      emitterDirectionId: delegatedDirection.id,
      receiverDirectionIds: [direction.id],
      copyDirectionIds: [],
      signerName: "Validation deleguee"
    })
  });

  const documentArchives = await api<{ items: Array<{ id: string; documentId: string }> }>("/document-archives", userToken);
  const physicalArchivesBefore = await api<{ items: PhysicalArchiveItem[] }>("/physical-archives", userToken);
  const auditLogs = await api<Array<{ action: string; entityId: string }>>("/audit-logs", adminToken);

  const matchingDocumentArchives = documentArchives.items.filter((item) => item.documentId === document.id);
  const matchingPhysicalArchive = physicalArchivesBefore.items.find((item) => item.documentId === document.id);
  const matchingDelegatedArchives = documentArchives.items.filter((item) => item.documentId === delegatedDocument.id);

  if (!matchingDocumentArchives.length) {
    throw new Error("Le document cree n'a genere aucune archive documentaire.");
  }

  if (!matchingDelegatedArchives.length) {
    throw new Error("Le document cree avec direction emettrice remplacee n'a genere aucune archive documentaire.");
  }

  if (!matchingPhysicalArchive) {
    throw new Error("Le document cree n'a genere aucune archive physique.");
  }

  if (delegatedDocument.emitterDirectionId !== delegatedDirection.id) {
    throw new Error("La direction emettrice selectionnee n'a pas ete conservee lors de la creation du document delegue.");
  }

  await apiExpectStatus("/physical-archives", userToken, 410, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentArchiveId: matchingPhysicalArchive.documentArchiveId,
      documentId: document.id,
      partnerDirectionId: matchingPhysicalArchive.partnerDirectionId,
      site: "Site principal",
      batiment: "Batiment A",
      salle: "Salle 01",
      rayon: "R1",
      etagere: "E2",
      classeur: `CL-${now}`,
      dossier: "DOS-RECETTE",
      boiteArchive: "BA-01"
    })
  });

  const hasAudit = auditLogs.some((log) => log.entityId === document.id && log.action === "CREATE_DOCUMENT");
  if (!hasAudit) {
    throw new Error("La trace CREATE_DOCUMENT est absente du journal d'audit.");
  }

  console.log("Created direction:", direction);
  console.log("Created delegated direction:", delegatedDirection);
  console.log("Created service:", service);
  console.log("Created bureau:", bureau);
  console.log("Created direct bureau:", directBureau);
  console.log("Created user:", {
    ...createdUser.user,
    defaultPassword: createdUser.defaultPassword,
    keycloakUserId
  });
  console.log("Created direct bureau user:", {
    ...directUser.user,
    defaultPassword: directUser.defaultPassword
  });
  console.log("User scope:", userMe.user);
  console.log("Created folder:", folder);
  console.log("Created delegated folder:", delegatedFolder);
  console.log("Created document:", {
    id: document.id,
    reference: document.reference,
    emitterDirectionId: document.emitterDirectionId,
    signers: document.signers ?? []
  });
  console.log("Created delegated document:", {
    id: delegatedDocument.id,
    reference: delegatedDocument.reference,
    emitterDirectionId: delegatedDocument.emitterDirectionId
  });
  console.log("Document archives:", matchingDocumentArchives.length);
  console.log("Delegated document archives:", matchingDelegatedArchives.length);
  console.log("POST /physical-archives: rejected as expected");
  console.log("Audit logged:", hasAudit);
  console.log("Functional test completed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

function wait(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
