# Modele de donnees SIGEDA

Mise a jour : `2026-06-16`

Ce document pointe vers le modele de donnees de reference de la branche `annotation`.

## Source de reference

- Schema Prisma :
  `packages/database/prisma/schema.prisma`
- Documentation de migration detaillee :
  [migration/data-model-postgresql.md](./migration/data-model-postgresql.md)
- Documentation de comprehension :
  [comprehension/vue-fonctionnelle.md](./comprehension/vue-fonctionnelle.md)
  et
  [comprehension/vue-technique.md](./comprehension/vue-technique.md)

## Tables principales

- `departments`
- `users`
- `roles`
- `documents`
- `document_recipients`
- `document_signers`
- `attachments`
- `document_versions`
- `document_annotations`
- `document_transmissions`
- `folders`
- `document_archives`
- `audit_logs`

## Regles structurantes

- le modele `Department` couvre `DIRECTION_GENERALE`, `DIRECTION`, `SERVICE` et `BUREAU` ;
- un document a une seule direction emettrice ;
- les destinataires et les copies sont modelises via `document_recipients.kind` ;
- une annotation est rattachee au document ;
- un classement concret est porte par `document_archives` ;
- un classeur annuel est porte par `folders`.

## Schema logique simplifie

```txt
Department -> User
Department -> Document (emitter)
Document -> DocumentRecipient
Document -> DocumentSigner
Document -> Attachment
Document -> DocumentVersion
Document -> DocumentAnnotation
Document -> DocumentTransmission
Document -> DocumentArchive
Folder -> DocumentArchive
```
