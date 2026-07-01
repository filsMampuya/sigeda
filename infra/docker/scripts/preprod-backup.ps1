. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "preprod-common.ps1")

$postgresDb = Require-EnvVar "SIGEDA_POSTGRES_DB" | Out-Null
$dataRoot = Require-EnvVar "SIGEDA_DATA_ROOT"
$backupRoot = Get-BackupRoot
$stamp = Get-TimestampNow
$targetDir = Join-Path $backupRoot $stamp

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

Write-Host "[SIGEDA] Sauvegarde PostgreSQL..."
$sigedaDump = Join-Path $targetDir "sigeda-postgres.sql"
& docker compose --env-file $script:EnvFile -f $script:ComposeFile exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | Set-Content -Path $sigedaDump -Encoding UTF8
if ($LASTEXITCODE -ne 0) { throw "Echec de la sauvegarde PostgreSQL SIGEDA." }

Write-Host "[SIGEDA] Sauvegarde PostgreSQL Keycloak..."
$keycloakDump = Join-Path $targetDir "keycloak-postgres.sql"
& docker compose --env-file $script:EnvFile -f $script:ComposeFile exec -T postgres-keycloak sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | Set-Content -Path $keycloakDump -Encoding UTF8
if ($LASTEXITCODE -ne 0) { throw "Echec de la sauvegarde PostgreSQL Keycloak." }

Write-Host "[SIGEDA] Archivage MinIO..."
$minioArchive = Join-Path $targetDir "minio-data.tar.gz"
tar -czf $minioArchive -C $dataRoot minio
if ($LASTEXITCODE -ne 0) { throw "Echec de l'archivage MinIO." }

Write-Host "[SIGEDA] Archivage configuration preproduction..."
$configArchive = Join-Path $targetDir "preprod-config.tar.gz"
tar -czf $configArchive `
  -C $script:RepoRoot `
  infra/docker/docker-compose.preprod.yml `
  infra/docker/docker-compose.preprod.tls.yml `
  infra/docker/nginx/preprod.conf `
  infra/docker/nginx/preprod-tls.conf `
  infra/docker/keycloak/sigeda-realm.json `
  docs/plan-deploiement-preproduction-sigeda.md `
  docs/checklist-deploiement-preproduction-sigeda.md `
  docs/automatisation-et-hardening-preproduction-sigeda.md `
  docs/supervision-preproduction-sigeda.md `
  docs/tls-preproduction-sigeda.md
if ($LASTEXITCODE -ne 0) { throw "Echec de l'archivage de configuration." }

Copy-Item $script:EnvFile (Join-Path $targetDir ".env.preprod.snapshot") -Force

$manifest = @"
timestamp=$stamp
compose_file=$script:ComposeFile
env_file=$script:EnvFile
postgres_dump=sigeda-postgres.sql
keycloak_dump=keycloak-postgres.sql
minio_archive=minio-data.tar.gz
config_archive=preprod-config.tar.gz
"@

Set-Content -Path (Join-Path $targetDir "manifest.txt") -Value $manifest -Encoding UTF8

Write-Host "[SIGEDA] Sauvegarde terminee : $targetDir"
