# Audit de regression SIGEDA - 2026-06-17

## Reference analysee

- Base de comparaison stable retenue : `c98f7ce` (`feat: migrate web auth to keycloak`)
- Branche analysee : `annotation` a `ec51565` + ajustements locaux en cours

## Point de rupture probable

La regression n'est pas issue d'un changement unique, mais d'une accumulation de changements entre `c98f7ce` et `annotation` :

- ajout de la couche d'annotation documentaire ;
- ajout des routes Next.js proxy pour `classify`, `annotations`, `versions`, `finalize` ;
- refonte de la gestion de session web avec refresh Keycloak ;
- enrichissement massif du module `documents` NestJS ;
- reconfiguration des donnees de demonstration via `seed.ts`.

Le differentiel entre `c98f7ce` et `annotation` montre un saut important sur les zones critiques suivantes :

- `apps/api-nest/src/modules/documents/documents.service.ts`
- `apps/web/components/documents/document-create-form.tsx`
- `apps/web/components/documents/document-details-panel.tsx`
- `apps/web/components/documents/document-collaboration-panel.tsx`
- `apps/web/app/api/documents/[id]/*`
- `packages/database/prisma/seed.ts`

## Verification technique executee

### Compilation

- `npm run typecheck --workspace @sigeda/web` : OK
- `npm run build --workspace @sigeda/api-nest` : OK

### Stack docker

- rebuild `web` + `api-nest` : OK
- services HTTP accessibles :
  - `http://localhost:8088`
  - `http://localhost:4100/api/v1/health`
  - `http://localhost:8080`

### Tests automatises existants

- `npm run --workspace @sigeda/api-nest test:smoke` : OK
- `npm run --workspace @sigeda/api-nest test:functional` : OK

Ces deux scripts couvrent notamment :

- authentification Keycloak ;
- lecture des departments et users ;
- creation direction / service / bureau ;
- creation utilisateur ;
- creation classeur ;
- creation document ;
- creation archive documentaire automatique ;
- refus du classement physique manuel legacy ;
- audit minimal.

## Scenarios metier verifies manuellement via API et routes web

### Document existant

- Document teste : `D.601/n°0061`
- Emetteur : `Direction Commerciale`
- Destinataire : `Direction Generale`

### Resultats

- consultation du document par l'emetteur : OK
- annotation par l'emetteur (`manager.commercial@sigeda.local`) : OK (`201`)
- annotation par le destinataire (`dg.demo@sigeda.local`) : OK (`201`)
- tentative d'annotation hors perimetre (`agent.technique@sigeda.local`) : rejetee
- route web Next.js `/api/documents/[id]/annotations` avec cookies de session : OK
- route web Next.js `/api/documents/[id]/classify` avec cookies de session : OK
- classement destinataire genere bien une archive `ENTREE` complementaire : OK

Conclusion : le noyau metier d'annotation et de classement fonctionne cote API NestJS et sur les routes web Next.js de proxy.

## Fonctionnalites conformes

- authentification Keycloak cote API ;
- lecture du perimetre utilisateur (`/auth/me`) ;
- creation direction / service / bureau ;
- creation utilisateur avec rattachement bureau ;
- creation classeur annuel ;
- creation document ;
- creation automatique des archives documentaires ;
- consultation d'un document ;
- annotation documentaire cote API ;
- annotation documentaire via route web ;
- classement documentaire via route web ;
- controle de perimetre cote API ;
- telechargement securise via routes de pieces jointes ;
- smoke test et functional test de l'API.

## Fonctionnalites degradees ou a surveiller

### 1. Parcours navigateur continu

Symptome observe historiquement :

- l'utilisateur peut encore voir `L'annotation n'a pas pu etre enregistree.` dans le navigateur alors que l'API accepte le cas metier.

Causes probables :

- page navigateur non rechargee apres rebuild ;
- session web expiree ou cookies web non rafraichis ;
- ancien build web encore servi au moment d'un test precedent ;
- message d'erreur frontend trop generique lors des anciennes passes.

Correctifs deja appliques :

- prise en compte du `currentUser` dans `document-collaboration-panel` ;
- direction annotatrice par defaut recalculée selon le vrai participant ;
- blocage UI si la direction connectee n'est pas autorisee ;
- remontee du message backend au lieu du message generique ;
- validation explicite des routes web `/api/documents/[id]/annotations` et `/api/documents/[id]/classify` ;
- durcissement du bouton `Classer le document` avec un cycle `try/catch/finally` explicite ;
- rebuild du conteneur `web`.

### 2. Regression potentielle de session web

Symptome historique :

- messages du type `Votre session Keycloak a expire. Reconnectez-vous puis reessayez.`

Zone sensible :

- `apps/web/lib/server-session.ts`
- `apps/web/lib/server-auth.ts`
- `apps/web/app/api/auth/token/route.ts`
- routes proxy Next.js `/api/documents/*`

Etat actuel :

- la logique de refresh existe ;
- la validation navigateur complete reste a confirmer en navigation reelle continue.

## Fonctionnalites cassees confirmees pendant l'audit

Aucune fonctionnalite critique n'est actuellement confirmee comme cassee cote API apres la passe du 2026-06-17.

La regression residuelle confirmee se situe sur l'experience navigateur et non sur le coeur metier des endpoints testes.

## Impact metier

- risque de perte de confiance utilisateur si le navigateur affiche un echec alors que le backend est sain ;
- risque de blocage de demonstration si un compte garde une session web perimee ou un build stale ;
- risque de confusion entre regression metier et regression de couche web.

## Priorites de stabilisation

### Priorite 1

Valider a nouveau en navigateur avec hard refresh et session propre :

- creation document ;
- annotation par emetteur ;
- annotation par destinataire ;
- consultation des annotations.

### Priorite 2

Ajouter une recette web automatisee minimale sur :

- login ;
- ouverture document ;
- ajout annotation ;
- verification du message de succes ;
- verification du rapport d'annotations.

### Priorite 3

Durcir le reporting d'erreur frontend :

- afficher toujours le code ou message metier backend ;
- distinguer clairement `401`, `403`, `400`, `500`.

## Conclusion

L'audit ne montre pas une casse generale du socle demo apres les travaux `annotation`.

Le systeme est aujourd'hui :

- stable cote API ;
- stable sur les tests automatises disponibles ;
- stable sur les scenarios metiers critiques testes via API ;
- stable sur les routes web critiques testees (`annotation`, `classify`) ;
- encore a surveiller en navigation manuelle continue sur la couche session / rafraichissement / build stale.

La regression prioritaire restante n'est plus la logique metier d'annotation ni de classement, mais la surveillance du confort de navigation reelle pendant une demonstration longue.
