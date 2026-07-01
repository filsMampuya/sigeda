# Supervision preproduction SIGEDA

Mise a jour : `2026-07-01`
Objectif : activer une supervision technique legere sur le serveur de preproduction sans exposer les interfaces de monitoring au reseau utilisateur.

References :

- [plan-deploiement-preproduction-sigeda.md](./plan-deploiement-preproduction-sigeda.md)
- [automatisation-et-hardening-preproduction-sigeda.md](./automatisation-et-hardening-preproduction-sigeda.md)
- [checklist-deploiement-preproduction-sigeda.md](./checklist-deploiement-preproduction-sigeda.md)

## 1. Composants

Le lot de supervision ajoute :

- `Prometheus`
- `Grafana`
- `Node Exporter`
- `cAdvisor`

Fichiers associes :

- [docker-compose.preprod.monitoring.yml](../infra/docker/docker-compose.preprod.monitoring.yml)
- [prometheus.preprod.yml](../infra/monitoring/prometheus/prometheus.preprod.yml)
- [prometheus.yml datasource Grafana](../infra/monitoring/grafana/provisioning/datasources/prometheus.yml)

## 2. Principe

La supervision est volontairement reservee a l'administration serveur.

Les interfaces :

- Prometheus
- Grafana

ne sont publiees que sur `127.0.0.1`, donc non exposees au LAN utilisateur par defaut.

## 3. Variables a ajouter dans `.env.preprod`

Ajouter :

```bash
SIGEDA_PROMETHEUS_PORT=9090
SIGEDA_GRAFANA_PORT=3001
SIGEDA_GRAFANA_ADMIN_USER=admin
SIGEDA_GRAFANA_ADMIN_PASSWORD=ChangeMe_Grafana_Preprod_2026!
SIGEDA_GRAFANA_ROOT_URL=http://localhost:3001
```

## 4. Lancement

Depuis le serveur :

```bash
docker compose \
  --env-file infra/docker/.env.preprod \
  -f infra/docker/docker-compose.preprod.yml \
  -f infra/docker/docker-compose.preprod.monitoring.yml \
  up -d prometheus grafana node-exporter cadvisor
```

## 5. Verifications

Etat des services :

```bash
docker compose \
  --env-file infra/docker/.env.preprod \
  -f infra/docker/docker-compose.preprod.yml \
  -f infra/docker/docker-compose.preprod.monitoring.yml \
  ps
```

Interfaces locales :

- Prometheus : `http://127.0.0.1:${SIGEDA_PROMETHEUS_PORT}`
- Grafana : `http://127.0.0.1:${SIGEDA_GRAFANA_PORT}`

## 6. Cibles scrutees

Prometheus collecte :

- `prometheus` lui-meme ;
- `node-exporter` ;
- `cadvisor` ;
- `api-nest` via `/api/v1/health` ;
- `web` via `/login` ;
- `keycloak` via `/auth/health/ready`.

## 7. Lecture utile pour la preproduction

Les indicateurs les plus utiles avant ouverture large sont :

- CPU serveur ;
- RAM serveur ;
- espace disque ;
- consommation des conteneurs ;
- etat de sante de l'API ;
- etat de sante du frontend ;
- etat de sante de Keycloak.

## 8. Limites

Ce lot n'ajoute pas encore :

- metriques Prometheus natives de NestJS ;
- dashboards Grafana preconstruits SIGEDA ;
- alerting mail ou SMS ;
- dashboards PostgreSQL specialises ;
- supervision applicative metier fine.

Il donne cependant un niveau suffisant pour une premiere preproduction surveillee proprement.
