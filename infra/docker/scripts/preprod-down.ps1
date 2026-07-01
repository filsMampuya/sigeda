. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "preprod-common.ps1")

Set-Location $script:RepoRoot
Write-Host "[SIGEDA] Arret de la pile preproduction..."
Invoke-Compose down
