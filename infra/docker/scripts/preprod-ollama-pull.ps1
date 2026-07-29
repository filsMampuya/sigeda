param()

. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "preprod-common.ps1")

Set-Location $script:RepoRoot

Write-Host "[SIGEDA] Verification du service Ollama..."
Invoke-Compose up -d ollama

Write-Host "[SIGEDA] Lancement manuel du bootstrap des modeles Ollama..."
Invoke-Compose --profile ai-bootstrap up ollama-pull

Write-Host "[SIGEDA] Etat des services Ollama..."
Invoke-Compose ps ollama ollama-pull
