# Modele `.env.preprod` pour serveur Windows SIGEDA

Usage :

- ce fichier est a preparer sur la machine serveur cible ;
- emplacement attendu du repo : `C:\sigeda\app\repo`
- emplacement du fichier : `C:\sigeda\app\repo\infra\docker\.env.preprod`

## 1. Modele de base

Copier d'abord :

```powershell
Copy-Item infra/docker/.env.preprod.windows.example infra/docker/.env.preprod
```

Puis remplacer le contenu par un parametrage reel du serveur.

## 2. Exemple pret a renseigner

```dotenv
SIGEDA_PREPROD_HOSTNAME=sigeda-preprod.local
SIGEDA_PUBLIC_BASE_URL=http://sigeda-preprod.local
SIGEDA_DATA_ROOT=C:/sigeda/data
SIGEDA_NGINX_HTTP_PORT=80
SIGEDA_NGINX_HTTPS_PORT=443
SIGEDA_NGINX_CONFIG_FILE=preprod.conf
SIGEDA_CERTS_DIR=C:/sigeda/certs
SIGEDA_PROMETHEUS_PORT=9090
SIGEDA_GRAFANA_PORT=3001
SIGEDA_GRAFANA_ADMIN_USER=admin
SIGEDA_GRAFANA_ADMIN_PASSWORD=REMPLACER_PAR_MOTDEPASSE_GRAFANA
SIGEDA_GRAFANA_ROOT_URL=http://localhost:3001

SIGEDA_POSTGRES_DB=sigeda
SIGEDA_POSTGRES_USER=sigeda
SIGEDA_POSTGRES_PASSWORD=REMPLACER_PAR_MOTDEPASSE_POSTGRES

SIGEDA_KEYCLOAK_DB=keycloak
SIGEDA_KEYCLOAK_DB_USER=keycloak
SIGEDA_KEYCLOAK_DB_PASSWORD=REMPLACER_PAR_MOTDEPASSE_DB_KEYCLOAK

SIGEDA_PGADMIN_EMAIL=admin@sigeda.preprod.local
SIGEDA_PGADMIN_PASSWORD=REMPLACER_PAR_MOTDEPASSE_PGADMIN
SIGEDA_PGADMIN_PORT=5050

SIGEDA_MINIO_ROOT_USER=sigeda
SIGEDA_MINIO_ROOT_PASSWORD=REMPLACER_PAR_MOTDEPASSE_MINIO
SIGEDA_MINIO_REGION=us-east-1
SIGEDA_MINIO_BUCKET=sigeda-documents
SIGEDA_MINIO_PUBLIC_ENDPOINT=http://minio:9000

SIGEDA_KEYCLOAK_ADMIN_USER=sigeda-admin
SIGEDA_KEYCLOAK_ADMIN_PASSWORD=REMPLACER_PAR_MOTDEPASSE_ADMIN_KEYCLOAK
SIGEDA_KEYCLOAK_REALM=sigeda
SIGEDA_KEYCLOAK_CLIENT_ID=sigeda-web
SIGEDA_KEYCLOAK_URL=http://sigeda-preprod.local/auth
SIGEDA_KEYCLOAK_ISSUER=http://sigeda-preprod.local/auth/realms/sigeda

SIGEDA_CORS_ORIGIN=http://sigeda-preprod.local
SIGEDA_HTTP_BODY_LIMIT=10mb
SIGEDA_MAX_DOCUMENT_UPLOAD_BYTES=26214400

SIGEDA_OPENSEARCH_SECURITY_DISABLED=true
SIGEDA_OPENSEARCH_ADMIN_PASSWORD=REMPLACER_PAR_MOTDEPASSE_OPENSEARCH
SIGEDA_OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m
SIGEDA_OPENSEARCH_INDEX_DOCUMENTS=documents

SIGEDA_DOCUMENT_AI_MODE=ocr
SIGEDA_DOCUMENT_AI_TIMEOUT_MS=180000
SIGEDA_DOCUMENT_AI_OLLAMA_KEEP_ALIVE=15m
SIGEDA_DOCUMENT_AI_OLLAMA_TEMPERATURE=0
SIGEDA_DOCUMENT_AI_OLLAMA_NUM_PREDICT=160
SIGEDA_DOCUMENT_AI_MAX_OCR_TEXT_CHARS=4000
SIGEDA_DOCUMENT_AI_VISION_MODEL=moondream
SIGEDA_DOCUMENT_AI_TEXT_MODEL=qwen2.5:0.5b
SIGEDA_DOCUMENT_AI_LOW_CONFIDENCE_THRESHOLD=0.70
SIGEDA_DOCUMENT_AI_DEBUG=false
SIGEDA_DOCUMENT_AI_TEMP_BUCKET_PREFIX=tmp/document-intelligence

SIGEDA_OCR_PROVIDER=tesseract-cli
SIGEDA_OCR_LANGUAGE=fra+eng
SIGEDA_OCR_IMAGE_COPY_WIDTH_PERCENT=41
SIGEDA_OCR_IMAGE_COPY_HEIGHT_PERCENT=29
SIGEDA_OCR_TIMEOUT_MS=60000
SIGEDA_OCR_TEMP_DIR=/tmp/sigeda-ocr
```

## 3. Valeurs a adapter obligatoirement

Tu dois obligatoirement remplacer :

- `SIGEDA_PREPROD_HOSTNAME`
- `SIGEDA_PUBLIC_BASE_URL`
- `SIGEDA_GRAFANA_ADMIN_PASSWORD`
- `SIGEDA_POSTGRES_PASSWORD`
- `SIGEDA_KEYCLOAK_DB_PASSWORD`
- `SIGEDA_PGADMIN_PASSWORD`
- `SIGEDA_MINIO_ROOT_PASSWORD`
- `SIGEDA_KEYCLOAK_ADMIN_PASSWORD`
- `SIGEDA_OPENSEARCH_ADMIN_PASSWORD`
- si le domaine change :
  - `SIGEDA_PGADMIN_EMAIL`
  - `SIGEDA_KEYCLOAK_URL`
  - `SIGEDA_KEYCLOAK_ISSUER`
  - `SIGEDA_CORS_ORIGIN`

## 4. Valeurs qui peuvent rester telles quelles au debut

Tu peux laisser au debut :

- `SIGEDA_DATA_ROOT=C:/sigeda/data`
- `SIGEDA_CERTS_DIR=C:/sigeda/certs`
- `SIGEDA_POSTGRES_DB=sigeda`
- `SIGEDA_POSTGRES_USER=sigeda`
- `SIGEDA_KEYCLOAK_DB=keycloak`
- `SIGEDA_KEYCLOAK_DB_USER=keycloak`
- `SIGEDA_MINIO_ROOT_USER=sigeda`
- `SIGEDA_MINIO_REGION=us-east-1`
- `SIGEDA_MINIO_BUCKET=sigeda-documents`
- `SIGEDA_KEYCLOAK_REALM=sigeda`
- `SIGEDA_KEYCLOAK_CLIENT_ID=sigeda-web`
- `SIGEDA_HTTP_BODY_LIMIT=10mb`
- `SIGEDA_MAX_DOCUMENT_UPLOAD_BYTES=26214400`
- `SIGEDA_DOCUMENT_AI_MODE=ocr`

## 5. Cas HTTP simple

Si tu n'actives pas encore TLS :

- garder `SIGEDA_PUBLIC_BASE_URL=http://...`
- garder `SIGEDA_KEYCLOAK_URL=http://.../auth`
- garder `SIGEDA_KEYCLOAK_ISSUER=http://.../auth/realms/sigeda`

## 6. Cas HTTPS

Si tu actives TLS :

- utiliser `https://...` pour :
  - `SIGEDA_PUBLIC_BASE_URL`
  - `SIGEDA_KEYCLOAK_URL`
  - `SIGEDA_KEYCLOAK_ISSUER`
  - `SIGEDA_CORS_ORIGIN`
- deposer les certificats dans :
  - `C:\sigeda\certs\fullchain.pem`
  - `C:\sigeda\certs\privkey.pem`
- utiliser ensuite le lancement TLS :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up-tls.ps1
```

## 7. Verification immediate apres edition

Depuis `C:\sigeda\app\repo` :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Invoke-SigedaPreprodPreflight.ps1 -RepoRoot "C:\sigeda\app\repo" -EnvFile "C:\sigeda\app\repo\infra\docker\.env.preprod"
```

Le preflight doit au minimum confirmer :

- fichier `.env.preprod` lisible ;
- variables critiques presentes ;
- `docker compose config` valide ;
- arborescence `C:\sigeda\...` bien creee.
