. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "preprod-common.ps1")

$publicBaseUrl = Require-EnvVar "SIGEDA_PUBLIC_BASE_URL"

Write-Host "[SIGEDA] Validation compose..."
Invoke-Compose config | Out-Null

Write-Host "[SIGEDA] Etat des conteneurs..."
Invoke-Compose ps

Write-Host "[SIGEDA] Test health backend via Nginx..."
$null = Invoke-WebRequest -UseBasicParsing "$publicBaseUrl/health"

Write-Host "[SIGEDA] Test health API..."
$null = Invoke-WebRequest -UseBasicParsing "$publicBaseUrl/api/v1/health"

Write-Host "[SIGEDA] Test page login..."
$null = Invoke-WebRequest -UseBasicParsing "$publicBaseUrl/login"

Write-Host "[SIGEDA] Healthcheck preproduction OK."
