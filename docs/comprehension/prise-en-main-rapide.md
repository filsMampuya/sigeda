# Guide de prise en main rapide SIGEDA

Mise a jour : `2026-06-16`

## Objectif

Comprendre SIGEDA en moins de 30 minutes.

## 1. Ce qu'il faut retenir en 5 minutes

- SIGEDA gere des documents institutionnels sensibles de l'Hotel des Monnaies.
- Le document est l'objet central.
- Le classement genere des archives documentaires.
- Les classeurs annuels sont lies a un bureau et a une direction partenaire.
- Les annotations sont rattachees au document, pas a l'archive documentaire.
- Le perimetre de donnees depend du role et de la structure de l'utilisateur.

## 2. Les 5 ecrans a visiter en premier

1. `Dashboard`
   Pour comprendre les volumes et les indicateurs.
2. `Documents`
   Pour voir le coeur metier.
3. `Archives documentaires`
   Pour comprendre le classement.
4. `Classeurs annuels`
   Pour comprendre l'organisation physique simplifiee.
5. `Audit`
   Pour verifier la tracabilite.

## 3. Les 5 concepts a memoriser

- `Direction emettrice`
- `Direction destinataire`
- `Direction en copie`
- `Classeur annuel`
- `Archive documentaire`

## 4. Les 3 regles metier les plus importantes

### Regle 1

Le mouvement `ENTREE` ou `SORTIE` n'est jamais saisi manuellement.

### Regle 2

Le classement d'un document recu doit retrouver automatiquement le bon classeur actif du bureau utilisateur.

### Regle 3

Une annotation appartient au document.

## 5. Les points techniques a connaitre

- Frontend : `apps/web`
- API cible : `apps/api-nest`
- Schema base : `packages/database/prisma/schema.prisma`
- Types partages : `packages/shared/src/types/index.ts`
- Stack locale : Docker Compose

## 6. Les documents a lire ensuite

- [Vue fonctionnelle](./vue-fonctionnelle.md)
- [Regles de gestion](./regles-de-gestion.md)
- [Parcours et permissions](./parcours-et-permissions.md)
- [Vue technique](./vue-technique.md)
- [Doctrine annotation document](../doctrine-annotation-document.md)

## 7. Comment lancer localement

Depuis la racine :

```bash
npm install
docker compose -f infra/docker/docker-compose.yml up -d
```

Services utiles :

- web : `http://localhost:8088`
- api : `http://localhost:4100/api/v1/health`
- keycloak : `http://localhost:8080`
- minio console : `http://localhost:9001`
- opensearch : `http://localhost:9200`

## 8. Comment lire le code sans se perdre

Ordre recommande :

1. `packages/shared`
2. `packages/database/prisma/schema.prisma`
3. `apps/api-nest/src/modules/documents`
4. `apps/api-nest/src/modules/document-archives`
5. `apps/api-nest/src/modules/folders`
6. `apps/web/app/documents`
7. `apps/web/app/archives-documentaires`

## 9. Ce qui est stabilise sur la branche annotation

- architecture on-premise ;
- connexion Keycloak ;
- PostgreSQL + Prisma ;
- MinIO pour le stockage ;
- classement documentaire automatique ;
- doctrine d'annotation rattachee au document.
