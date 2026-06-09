# Modele PostgreSQL SIGEDA

## Tables principales

- `departments`
- `users`
- `roles`
- `permissions`
- `role_permissions`
- `documents`
- `document_recipients`
- `folders`
- `document_archives`
- `attachments`
- `document_versions`
- `audit_logs`

## Departments

`departments` remplace les collections organisationnelles separees. Le champ `type` vaut :

- `DIRECTION_GENERALE`
- `DIRECTION`
- `SERVICE`
- `BUREAU`

La hierarchie est portee par `parent_id`.

## Documents

Un document possede une direction emettrice unique et des destinataires multiples :

- `emitter_direction_id`
- `document_recipients` avec `RECEIVER` ou `COPY`

La reference est unique uniquement par direction et par annee :

```txt
emitter_direction_id + year + reference_number
```

## Folders

Un classeur est annuel et rattache a un bureau :

- `year`
- `bureau_id`
- `owner_direction_id`
- `partner_direction_id`
- `status`

`ENTREE` et `SORTIE` ne sont pas des champs du classeur. Ils sont portes par `document_archives`.

## Document archives

`document_archives` lie le document, le bureau, le classeur et le mouvement calcule :

- `document_id`
- `bureau_id`
- `folder_id`
- `movement_type`
- `archived_at`
- `archived_by`
