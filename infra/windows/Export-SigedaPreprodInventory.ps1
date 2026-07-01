param(
  [string]$RepoRoot = "C:\sigeda\app\repo",
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

function Safe-Run {
  param([scriptblock]$Script)
  try {
    return & $Script
  } catch {
    return $null
  }
}

$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$computer = Get-CimInstance Win32_ComputerSystem
$memoryGb = [math]::Round(($computer.TotalPhysicalMemory / 1GB), 2)
$drives = Get-PSDrive -PSProvider FileSystem | Sort-Object Name
$dockerVersion = Safe-Run { docker version --format "{{.Server.Version}}" }
$composeVersion = Safe-Run { docker compose version --short }
$nodeVersion = Safe-Run { node --version }
$gitVersion = Safe-Run { git --version }

$lines = @()
$lines += "# Inventaire machine preproduction SIGEDA"
$lines += ""
$lines += "Date : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$lines += "Machine : $env:COMPUTERNAME"
$lines += ""
$lines += "## Systeme"
$lines += ""
$lines += "- Edition : $($os.Caption)"
$lines += "- Version : $($os.Version)"
$lines += "- Build : $($os.BuildNumber)"
$lines += "- Architecture : $($os.OSArchitecture)"
$lines += ""
$lines += "## Materiel"
$lines += ""
$lines += "- CPU : $($cpu.Name)"
$lines += "- Coeurs logiques : $($cpu.NumberOfLogicalProcessors)"
$lines += "- RAM totale : $memoryGb Go"
$lines += ""
$lines += "## Runtime"
$lines += ""
$lines += "- Docker Server : $dockerVersion"
$lines += "- Docker Compose : $composeVersion"
$lines += "- Node.js : $nodeVersion"
$lines += "- Git : $gitVersion"
$lines += ""
$lines += "## Stockage"
$lines += ""
$lines += "| Lecteur | Taille totale (Go) | Libre (Go) |"
$lines += "| --- | ---: | ---: |"
foreach ($drive in $drives) {
  $used = $drive.Used
  $free = $drive.Free
  $total = if (($used + $free) -gt 0) { [math]::Round((($used + $free) / 1GB), 2) } else { 0 }
  $freeGb = [math]::Round(($free / 1GB), 2)
  $lines += "| $($drive.Name) | $total | $freeGb |"
}
$lines += ""
$lines += "## Reseau"
$lines += ""
$lines += "- Nom d'hote : $env:COMPUTERNAME"
$lines += "- Domaine utilisateur : $env:USERDOMAIN"
$lines += ""
$lines += "## Depot"
$lines += ""
$lines += "- Racine repo : $RepoRoot"
$lines += "- Branche et commit : a completer au moment de l'export final"

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutputPath = Join-Path $RepoRoot "tmp\preprod-inventory-$timestamp.md"
}

$outputDir = Split-Path -Parent $OutputPath
if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

Set-Content -Path $OutputPath -Value ($lines -join [Environment]::NewLine) -Encoding UTF8
Write-Host "[SIGEDA] Inventaire exporte : $OutputPath"
