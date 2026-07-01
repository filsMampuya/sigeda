. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "preprod-common.ps1")

Set-Location $script:RepoRoot

$monitoringComposeFile = Join-Path $InfraDir "docker-compose.preprod.monitoring.yml"

if (-not (Test-Path $monitoringComposeFile)) {
  throw "Fichier compose monitoring introuvable : $monitoringComposeFile"
}

Write-Host "[SIGEDA] Validation compose monitoring..."
& docker compose --env-file $script:EnvFile -f $script:ComposeFile -f $monitoringComposeFile config | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "La validation compose monitoring a echoue."
}

Write-Host "[SIGEDA] Lancement de la supervision locale..."
& docker compose --env-file $script:EnvFile -f $script:ComposeFile -f $monitoringComposeFile up -d prometheus grafana node-exporter cadvisor
if ($LASTEXITCODE -ne 0) {
  throw "Le lancement de la supervision a echoue."
}

Write-Host "[SIGEDA] Etat des services monitoring..."
& docker compose --env-file $script:EnvFile -f $script:ComposeFile -f $monitoringComposeFile ps
if ($LASTEXITCODE -ne 0) {
  throw "La verification des services monitoring a echoue."
}
