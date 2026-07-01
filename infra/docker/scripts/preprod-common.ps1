Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InfraDir = Resolve-Path (Join-Path $ScriptDir "..")
$RepoRoot = Resolve-Path (Join-Path $InfraDir "../..")

$script:EnvFile = if ($env:SIGEDA_PREPROD_ENV_FILE) { $env:SIGEDA_PREPROD_ENV_FILE } else { Join-Path $InfraDir ".env.preprod" }
$script:ComposeFile = if ($env:SIGEDA_PREPROD_COMPOSE_FILE) { $env:SIGEDA_PREPROD_COMPOSE_FILE } else { Join-Path $InfraDir "docker-compose.preprod.yml" }

if (-not (Test-Path $script:EnvFile)) {
  throw "Fichier d'environnement introuvable : $script:EnvFile"
}

if (-not (Test-Path $script:ComposeFile)) {
  throw "Fichier compose introuvable : $script:ComposeFile"
}

function Import-PreprodEnvFile {
  param([string]$Path)

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
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

Import-PreprodEnvFile -Path $script:EnvFile

function Require-EnvVar {
  param([string]$Name)
  $value = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Variable obligatoire manquante : $Name"
  }
  return $value
}

function Invoke-Compose {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & docker compose --env-file $script:EnvFile -f $script:ComposeFile @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "La commande docker compose a echoue."
  }
}

function Get-BackupRoot {
  $dataRoot = Require-EnvVar "SIGEDA_DATA_ROOT"
  return (Join-Path $dataRoot "backups")
}

function Get-TimestampNow {
  return Get-Date -Format "yyyyMMdd-HHmmss"
}

Set-Variable -Scope Script -Name RepoRoot -Value $RepoRoot
