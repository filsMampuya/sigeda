# API Specification

Specification de transition pour l'API NestJS on-premise exposee sous `http://localhost:4100/api/v1`.

## Auth

- `GET /api/v1/auth/me`

## Documents

- `POST /api/v1/documents`
  - Cree un document.
  - Accepte `receiverDirectionIds`, `copyDirectionIds` et `signers`.
- `GET /api/v1/documents`
- `GET /api/v1/documents/:id`
- `GET /api/v1/document-archives`
- `GET /api/v1/folders`
- `POST /api/v1/folders`
- `POST /api/v1/folders/:id/status`
  - Body: `{ "status": "ACTIVE" | "ARCHIVED" }`
- `GET /api/v1/physical-archives`
- `POST /api/v1/physical-archives`

## Organisation

- `GET /api/v1/departments`
- `GET /api/v1/departments/hierarchy`
- `POST /api/v1/departments`
- `GET /api/v1/users`
- `POST /api/v1/users`

## Recherche, audit et dashboard

- `GET /api/v1/search/index-plan`
- `GET /api/v1/search/documents`
- `GET /api/v1/audit-logs`
- `GET /api/v1/dashboard/stats`
