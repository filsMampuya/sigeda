. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "preprod-common.ps1")

param(
  [Parameter(Mandatory = $true)]
  [string]$BackupSqlPath
)

if (-not (Test-Path $BackupSqlPath)) {
  throw "Dump SQL introuvable : $BackupSqlPath"
}

Write-Host "[SIGEDA] Restauration PostgreSQL SIGEDA depuis $BackupSqlPath"
Write-Host "[SIGEDA] Cette operation ecrase la base cible. Utiliser uniquement sur environnement maitrise."

Invoke-Compose exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";"'
Invoke-Compose exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$POSTGRES_DB\";"'

Get-Content -Raw -Path $BackupSqlPath | & docker compose --env-file $script:EnvFile -f $script:ComposeFile exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
if ($LASTEXITCODE -ne 0) { throw "Echec de la restauration PostgreSQL." }

Write-Host "[SIGEDA] Restauration PostgreSQL terminee."
