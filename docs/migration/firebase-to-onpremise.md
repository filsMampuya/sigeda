# Migration Firebase vers on-premise

## Mapping technique

| Firebase actuel | Cible on-premise |
| --- | --- |
| Firebase Auth | Keycloak / AD / LDAP |
| Firestore | PostgreSQL |
| Firebase Storage | MinIO |
| Cloud Functions | API NestJS |
| Firestore Rules | RBAC backend + policies applicatives |
| Firebase Hosting | Nginx / Docker / plateforme interne |
| Recherche Firestore | OpenSearch |

## Strategie progressive

1. Conserver Express/Firebase pendant la construction de l'API NestJS.
2. Construire PostgreSQL avec un seed pilote.
3. Migrer les modules fonctionnels vers NestJS.
4. Migrer les fichiers vers MinIO avec checksum SHA-256.
5. Exporter Firestore puis importer dans PostgreSQL lors d'une phase dediee.
6. Basculer le frontend page par page vers `/api/v1`.
7. Eteindre Firebase seulement apres validation metier, securite et donnees.

## Migration donnees future

La premiere phase ne migre pas Firestore. Elle prepare le socle cible. La migration reelle devra prevoir :

- export des collections `departements`, `users`, `documents`, `archiveFolders`, `documentArchives`, `auditLogs`;
- normalisation des types departement vers `DIRECTION_GENERALE`, `DIRECTION`, `SERVICE`, `BUREAU`;
- preservation des UUID;
- controle des doublons documentaires par `emitter_direction_id + year + reference_number`;
- rapport d'anomalies avant import definitif.

## Migration fichiers future

Les fichiers Firebase Storage et locaux seront copies vers MinIO dans une etape dediee :

- lecture source;
- calcul checksum SHA-256;
- upload MinIO;
- creation `attachments`;
- comparaison checksum;
- journal d'audit migration.
