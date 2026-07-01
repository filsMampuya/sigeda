param(
  [string]$RepoRoot = "C:\sigeda\app\repo",
  [string]$EnvFile = "C:\sigeda\app\repo\infra\docker\.env.preprod",
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

function Read-EnvFile {
  param([string]$Path)

  $map = @{}
  Get-Content -Path $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $idx = $line.IndexOf("=")
    if ($idx -lt 1) {
      return
    }

    $name = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    $map[$name] = $value
  }
  return $map
}

function Add-Result {
  param(
    [System.Collections.Generic.List[object]]$Results,
    [string]$Check,
    [string]$Status,
    [string]$Details
  )

  $Results.Add([pscustomobject]@{
      Check   = $Check
      Status  = $Status
      Details = $Details
    })
}

function Test-CommandExists {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

if (-not (Test-Path $RepoRoot)) {
  throw "Depot introuvable : $RepoRoot"
}

if (-not (Test-Path $EnvFile)) {
  throw "Fichier d'environnement introuvable : $EnvFile"
}

$results = New-Object 'System.Collections.Generic.List[object]'
$envMap = Read-EnvFile -Path $EnvFile

$requiredVars = @(
  "SIGEDA_PREPROD_HOSTNAME",
  "SIGEDA_PUBLIC_BASE_URL",
  "SIGEDA_DATA_ROOT",
  "SIGEDA_CERTS_DIR",
  "SIGEDA_POSTGRES_PASSWORD",
  "SIGEDA_KEYCLOAK_DB_PASSWORD",
  "SIGEDA_KEYCLOAK_ADMIN_PASSWORD",
  "SIGEDA_MINIO_ROOT_PASSWORD",
  "SIGEDA_PGADMIN_PASSWORD"
)

Add-Result -Results $results -Check "Depot local" -Status ($(if (Test-Path $RepoRoot) { "OK" } else { "KO" })) -Details $RepoRoot
Add-Result -Results $results -Check "Fichier .env.preprod" -Status "OK" -Details $EnvFile
Add-Result -Results $results -Check "Docker CLI" -Status ($(if (Test-CommandExists docker) { "OK" } else { "KO" })) -Details "Commande docker"
Add-Result -Results $results -Check "Node.js" -Status ($(if (Test-CommandExists node) { "OK" } else { "KO" })) -Details "Commande node"
Add-Result -Results $results -Check "Git" -Status ($(if (Test-CommandExists git) { "OK" } else { "KO" })) -Details "Commande git"

foreach ($name in $requiredVars) {
  $value = if ($envMap.ContainsKey($name)) { $envMap[$name] } else { "" }
  $status = if ([string]::IsNullOrWhiteSpace($value)) { "KO" } else { "OK" }
  Add-Result -Results $results -Check "Variable $name" -Status $status -Details ($(if ($status -eq "OK") { "Renseignee" } else { "Absente ou vide" }))
}

$dataRoot = $envMap["SIGEDA_DATA_ROOT"]
$certsDir = $envMap["SIGEDA_CERTS_DIR"]
$nginxConfigFile = if ($envMap.ContainsKey("SIGEDA_NGINX_CONFIG_FILE")) { $envMap["SIGEDA_NGINX_CONFIG_FILE"] } else { "preprod.conf" }

foreach ($pathCheck in @(
    @{ Name = "SIGEDA_DATA_ROOT"; Path = $dataRoot },
    @{ Name = "SIGEDA_CERTS_DIR"; Path = $certsDir },
    @{ Name = "Repo docker-compose.preprod.yml"; Path = (Join-Path $RepoRoot "infra\docker\docker-compose.preprod.yml") },
    @{ Name = "Repo nginx config"; Path = (Join-Path $RepoRoot "infra\docker\nginx\$nginxConfigFile") }
  )) {
  $exists = Test-Path $pathCheck.Path
  Add-Result -Results $results -Check $pathCheck.Name -Status ($(if ($exists) { "OK" } else { "KO" })) -Details $pathCheck.Path
}

if (-not [string]::IsNullOrWhiteSpace($dataRoot)) {
  $driveName = ([System.IO.Path]::GetPathRoot($dataRoot)).TrimEnd('\').TrimEnd(':')
  $drive = Get-PSDrive -Name $driveName -ErrorAction SilentlyContinue
  if ($drive) {
    $freeGb = [math]::Round(($drive.Free / 1GB), 2)
    $status = if ($freeGb -ge 20) { "OK" } else { "WARN" }
    Add-Result -Results $results -Check "Espace disque libre" -Status $status -Details "$freeGb Go libres sur $($drive.Root)"
  } else {
    Add-Result -Results $results -Check "Espace disque libre" -Status "WARN" -Details "Impossible de determiner le disque pour $dataRoot"
  }
}

$dockerDesktop = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
Add-Result -Results $results -Check "Docker Desktop lance" -Status ($(if ($dockerDesktop) { "OK" } else { "WARN" })) -Details ($(if ($dockerDesktop) { "Processus detecte" } else { "Processus non detecte" }))

if (Test-CommandExists docker) {
  Push-Location $RepoRoot
  try {
    $composeOutput = docker compose --env-file $EnvFile -f (Join-Path $RepoRoot "infra\docker\docker-compose.preprod.yml") config 2>&1
    $composeExit = $LASTEXITCODE
    Add-Result -Results $results -Check "docker compose config preprod" -Status ($(if ($composeExit -eq 0) { "OK" } else { "KO" })) -Details ($(if ($composeExit -eq 0) { "Validation OK" } else { ($composeOutput | Out-String).Trim() }))
  } finally {
    Pop-Location
  }
}

$httpPort = if ($envMap.ContainsKey("SIGEDA_NGINX_HTTP_PORT")) { [int]$envMap["SIGEDA_NGINX_HTTP_PORT"] } else { 80 }
$httpsPort = if ($envMap.ContainsKey("SIGEDA_NGINX_HTTPS_PORT")) { [int]$envMap["SIGEDA_NGINX_HTTPS_PORT"] } else { 443 }

foreach ($portInfo in @(
    @{ Name = "Port HTTP"; Port = $httpPort },
    @{ Name = "Port HTTPS"; Port = $httpsPort }
  )) {
  $listeners = Get-NetTCPConnection -LocalPort $portInfo.Port -State Listen -ErrorAction SilentlyContinue
  $status = if ($listeners) { "WARN" } else { "OK" }
  $details = if ($listeners) { "Port deja occupe avant lancement" } else { "Libre avant lancement" }
  Add-Result -Results $results -Check $portInfo.Name -Status $status -Details $details
}

$okCount = ($results | Where-Object { $_.Status -eq "OK" }).Count
$warnCount = ($results | Where-Object { $_.Status -eq "WARN" }).Count
$koCount = ($results | Where-Object { $_.Status -eq "KO" }).Count
$globalStatus = if ($koCount -gt 0) { "NO-GO" } elseif ($warnCount -gt 0) { "GO AVEC RESERVES" } else { "GO" }

$lines = @()
$lines += "# Preflight preproduction SIGEDA"
$lines += ""
$lines += "Date : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$lines += "Machine : $env:COMPUTERNAME"
$lines += "Statut global : $globalStatus"
$lines += ""
$lines += "| Controle | Statut | Detail |"
$lines += "| --- | --- | --- |"
foreach ($result in $results) {
  $lines += "| $($result.Check) | $($result.Status) | $($result.Details -replace '\|', '/') |"
}
$lines += ""
$lines += "Resume :"
$lines += "- OK : $okCount"
$lines += "- WARN : $warnCount"
$lines += "- KO : $koCount"

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutputPath = Join-Path $RepoRoot "tmp\preprod-preflight-$timestamp.md"
}

$outputDir = Split-Path -Parent $OutputPath
if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

Set-Content -Path $OutputPath -Value ($lines -join [Environment]::NewLine) -Encoding UTF8

Write-Host "[SIGEDA] Preflight termine : $OutputPath"
Write-Host "[SIGEDA] Statut global : $globalStatus"
