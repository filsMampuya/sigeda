# Modele Firestore

## Collections

- `users`
- `directions`
- `services`
- `bureaux`
- `documents`
- `physicalArchives`
- `auditLogs`
- `documentVersions`
- `documentAccessRequests`
- `notifications`

## Hierarchie

Chaque document reference obligatoirement `directionId`, `serviceId` et `bureauId`.
L'unicite logique d'un document ne repose jamais sur `reference` seule, mais sur la combinaison
`emitterDirectionId + year + referenceNumber` ou `emitterDirectionId + year + reference`.

## Principales entites

- `User`
- `Direction`
- `Service`
- `Bureau`
- `DocumentEntity`
- `DocumentArchive`
- `ArchiveFolder`
- `PhysicalArchive`
- `AuditLog`
