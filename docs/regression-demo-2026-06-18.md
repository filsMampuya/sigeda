# Rapport de regression SIGEDA

Date : `2026-06-18`

## Perimetre verifie

| Fonctionnalite | Statut | Impact | Regression detectee | Correctif applique |
| --- | --- | --- | --- | --- |
| Authentification active | OK | Acces application | Risque de rupture de session pendant les appels web | Centralisation du controle de session dans les routes API Next et maintien du point `/api/auth/token` |
| Creation direction | OK | Administration | Aucune | Validation de creation et consultation reexecutee |
| Creation service | OK | Administration | Aucune | Validation de creation et consultation reexecutee |
| Creation bureau | OK | Administration | Aucune | Validation de creation et consultation reexecutee |
| Creation document avec fichier | OK | Coeur metier | Echecs anterieurs sur creation et verrouillage UI | Parcours consolide et verification backend/frontend |
| Consultation document | OK | Coeur metier | Ambiguite sur la lecture rapide | Colonne `Direction emettrice` clarifiee et ajout de `Directions destinataires` |
| Classement vers un bureau choisi | OK | Archivage | Selection service/bureau partiellement incoherente | Bureau effectif par defaut, filtrage par service, envoi du `bureauId` au backend |
| Creation annotation avec fichier | OK | Collaboration | Echecs anterieurs a l'enregistrement | Controle d'acces et parcours d'annotation revalide |
| Visibilite annotation cote emetteur | OK | Traçabilite | Risque de non-lecture par la direction emettrice | Verification de visibilite et filtrage serveur confirme |
| Ouverture fichier document | OK | Consultation | Message `serveur injoignable` via URL signee | Remplacement par proxy binaire via routes Next + backend streaming |
| Telechargement fichier document | OK | Consultation | Telechargement instable | Proxy binaire local et telechargement blob navigateur |
| Ouverture fichier annotation | OK | Consultation | Message `serveur injoignable` via URL signee | Route de streaming dediee pour annotations |
| Telechargement fichier annotation | OK | Consultation | Telechargement instable | Route de streaming dediee pour annotations |

## Jeu de recette

Les donnees temporaires de recette ont ete purgees apres verification :

- documents temporaires : `0`
- directions/services/bureaux temporaires : `0`

## Synthese

La passe de recette executee couvre les flux critiques de demonstration :

1. creation d'une direction, d'un service et d'un bureau ;
2. creation d'un document avec fichier ;
3. consultation par la direction destinataire ;
4. classement dans un bureau cible ;
5. creation d'une annotation avec fichier ;
6. consultation et telechargement du fichier principal ;
7. consultation et telechargement du fichier d'annotation.

## Reserve restante

- le mecanisme de refresh de session par token seul a ete renforce dans l'architecture, mais la recette automatisee ci-dessus a ete validee en session active complete. Une verification navigateur sur expiration reelle de session reste recommandee avant la demonstration finale longue duree.
