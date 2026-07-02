param(
  [switch]$WithPgAdmin
)

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "preprod-common.ps1")

Set-Location $script:RepoRoot

Write-Host "[SIGEDA] Verification du fichier compose..."
Invoke-Compose config | Out-Null

Write-Host "[SIGEDA] Build et lancement de la pile preproduction..."
Invoke-Compose up -d --build

if ($WithPgAdmin) {
  Write-Host "[SIGEDA] Activation de pgAdmin..."
  Invoke-Compose --profile admin up -d pgadmin
}

Write-Host "[SIGEDA] Etat des services..."
Invoke-Compose ps
