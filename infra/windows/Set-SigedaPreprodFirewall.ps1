param(
  [int]$HttpPort = 0,
  [int]$HttpsPort = 0,
  [int]$SshPort = 22,
  [string]$RulePrefix = "SIGEDA PREPROD",
  [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"

function Read-EnvFile {
  param([string]$Path)

  $map = @{}
  if (-not $Path -or -not (Test-Path $Path)) {
    return $map
  }

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

if (-not $EnvFile) {
  $repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
  $candidate = Join-Path $repoRoot "infra\docker\.env.preprod"
  if (Test-Path $candidate) {
    $EnvFile = $candidate
  }
}

$envMap = Read-EnvFile -Path $EnvFile
if ($HttpPort -le 0) {
  $HttpPort = if ($envMap.ContainsKey("SIGEDA_NGINX_HTTP_PORT")) { [int]$envMap["SIGEDA_NGINX_HTTP_PORT"] } else { 80 }
}
if ($HttpsPort -le 0) {
  $HttpsPort = if ($envMap.ContainsKey("SIGEDA_NGINX_HTTPS_PORT")) { [int]$envMap["SIGEDA_NGINX_HTTPS_PORT"] } else { 443 }
}

Write-Host "[SIGEDA] Configuration du pare-feu Windows Defender"

Get-NetFirewallRule -DisplayName "$RulePrefix*" -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue

New-NetFirewallRule -DisplayName "$RulePrefix HTTP" -Direction Inbound -Protocol TCP -LocalPort $HttpPort -Action Allow -Profile Any
New-NetFirewallRule -DisplayName "$RulePrefix HTTPS" -Direction Inbound -Protocol TCP -LocalPort $HttpsPort -Action Allow -Profile Any

Write-Host "[SIGEDA] Regles creees pour HTTP=$HttpPort HTTPS=$HttpsPort"
if ($EnvFile) {
  Write-Host "[SIGEDA] Fichier env lu : $EnvFile"
}
