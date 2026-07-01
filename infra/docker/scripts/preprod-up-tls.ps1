. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "preprod-common.ps1")

Set-Location $script:RepoRoot

$tlsComposeFile = Join-Path $InfraDir "docker-compose.preprod.tls.yml"

if (-not (Test-Path $tlsComposeFile)) {
  throw "Fichier compose TLS introuvable : $tlsComposeFile"
}

Write-Host "[SIGEDA] Validation compose TLS..."
& docker compose --env-file $script:EnvFile -f $script:ComposeFile -f $tlsComposeFile config | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "La validation compose TLS a echoue."
}

Write-Host "[SIGEDA] Build et lancement TLS..."
& docker compose --env-file $script:EnvFile -f $script:ComposeFile -f $tlsComposeFile up -d --build
if ($LASTEXITCODE -ne 0) {
  throw "Le lancement TLS a echoue."
}

Write-Host "[SIGEDA] Etat des services..."
& docker compose --env-file $script:EnvFile -f $script:ComposeFile -f $tlsComposeFile ps
if ($LASTEXITCODE -ne 0) {
  throw "La verification des services TLS a echoue."
}
