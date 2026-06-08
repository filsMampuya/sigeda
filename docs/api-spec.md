# API Specification

## Auth

- `GET /api/auth/me`

## Documents

- `POST /api/documents`
- `GET /api/documents`
- `GET /api/documents/:id`
- `PUT /api/documents/:id`
- `DELETE /api/documents/:id`
- `POST /api/documents/:id/archive`
- `POST /api/documents/:id/validate`
- `POST /api/documents/:id/reject`
- `GET /api/documents/search`
- `GET /api/document-archives`
- `GET /api/archive-folders`
- `POST /api/archive-folders/:id/status`
  Body: `{ "status": "ACTIVE" | "CLOSED" }`

## Organisation

- `GET /api/directions`
- `POST /api/directions`
- `GET /api/services`
- `POST /api/services`
- `GET /api/bureaux`
- `POST /api/bureaux`

## Audit et dashboard

- `GET /api/audit-logs`
- `GET /api/dashboard/stats`
- `GET /api/physical-archives`
- `POST /api/physical-archives`
