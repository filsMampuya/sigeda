param(
  [string]$HostName = "sigeda-preprod.hdm",
  [string]$ServerIp = "",
  [switch]$SkipHostsFile,
  [switch]$CloseBrowsers,
  [switch]$FlushDns
)

$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-ProxyRegistryPath {
  return "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
}

function Resolve-ServerIp {
  param([string]$Candidate)

  if (-not [string]::IsNullOrWhiteSpace($Candidate)) {
    return $Candidate.Trim()
  }

  $detectedIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -and
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.InterfaceAlias -notmatch "Loopback|vEthernet|WSL|Docker|VirtualBox|VMware"
    } |
    Sort-Object -Property InterfaceMetric, SkipAsSource, PrefixOrigin |
    Select-Object -First 1 -ExpandProperty IPAddress

  if (-not $detectedIp) {
    throw "Impossible de determiner automatiquement l'adresse IPv4 du serveur. Relancez le script avec -ServerIp <adresse-ip>."
  }

  return $detectedIp
}

function Get-ProxyOverrideEntries {
  param([string]$RawValue)

  $entries = @()
  if (-not [string]::IsNullOrWhiteSpace($RawValue)) {
    $entries += $RawValue -split ";"
  }

  return @(
    $entries |
      Where-Object { $_ -and $_.Trim() } |
      ForEach-Object { $_.Trim() } |
      Select-Object -Unique
  )
}

function Set-HostsMapping {
  param(
    [string]$TargetHost,
    [string]$TargetIp
  )

  $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
  $lines = if (Test-Path $hostsPath) {
    [System.IO.File]::ReadAllLines($hostsPath)
  } else {
    @()
  }

  $filtered = foreach ($line in $lines) {
    if ($line -match "^\s*#") {
      $line
      continue
    }

    if ($line -match "(^|\s)$([regex]::Escape($TargetHost))(\s|$)") {
      continue
    }

    $line
  }

  $newLine = "$TargetIp $TargetHost"
  $updated = [string[]](@($filtered) + $newLine)

  if (Test-Path $hostsPath) {
    $item = Get-Item -LiteralPath $hostsPath -Force
    if ($item.Attributes -band [System.IO.FileAttributes]::ReadOnly) {
      $item.Attributes = $item.Attributes -bxor [System.IO.FileAttributes]::ReadOnly
    }
  }

  $encoding = [System.Text.ASCIIEncoding]::new()
  [System.IO.File]::WriteAllLines($hostsPath, $updated, $encoding)
}

function Update-InternetSettings {
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class WinInetNative {
  [DllImport("wininet.dll", SetLastError = true)]
  public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
}
"@

  $internetOptionSettingsChanged = 39
  $internetOptionRefresh = 37

  [void][WinInetNative]::InternetSetOption([IntPtr]::Zero, $internetOptionSettingsChanged, [IntPtr]::Zero, 0)
  [void][WinInetNative]::InternetSetOption([IntPtr]::Zero, $internetOptionRefresh, [IntPtr]::Zero, 0)
}

if (-not $SkipHostsFile -and -not (Test-IsAdministrator)) {
  throw "Ce script doit etre lance en administrateur pour modifier le fichier hosts."
}

$ServerIp = Resolve-ServerIp -Candidate $ServerIp
$proxyRegistryPath = Get-ProxyRegistryPath
$currentSettings = Get-ItemProperty -Path $proxyRegistryPath
$existingEntries = Get-ProxyOverrideEntries -RawValue $currentSettings.ProxyOverride

$desiredEntries = @(
  $HostName,
  $ServerIp,
  "127.0.0.1",
  "localhost",
  "<local>"
) | Where-Object { $_ -and $_.Trim() }

$mergedEntries = @(
  $existingEntries + $desiredEntries |
    Where-Object { $_ -and $_.Trim() } |
    ForEach-Object { $_.Trim() } |
    Select-Object -Unique
)

Set-ItemProperty -Path $proxyRegistryPath -Name ProxyOverride -Value ($mergedEntries -join ";")

$noProxyEntries = @($HostName, $ServerIp, "127.0.0.1", "localhost")
$existingNoProxy = [Environment]::GetEnvironmentVariable("NO_PROXY", "User")
if (-not [string]::IsNullOrWhiteSpace($existingNoProxy)) {
  $noProxyEntries += $existingNoProxy -split ","
}
$normalizedNoProxy = @(
  $noProxyEntries |
    Where-Object { $_ -and $_.Trim() } |
    ForEach-Object { $_.Trim() } |
    Select-Object -Unique
) -join ","
[Environment]::SetEnvironmentVariable("NO_PROXY", $normalizedNoProxy, "User")
[Environment]::SetEnvironmentVariable("no_proxy", $normalizedNoProxy, "User")

if (-not $SkipHostsFile) {
  Set-HostsMapping -TargetHost $HostName -TargetIp $ServerIp
}

if ($CloseBrowsers) {
  foreach ($processName in @("chrome", "msedge", "firefox", "opera")) {
    Get-Process -Name $processName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  }
}

if ($FlushDns) {
  ipconfig /flushdns | Out-Null
}

Update-InternetSettings

$finalSettings = Get-ItemProperty -Path $proxyRegistryPath

Write-Host ""
Write-Host "Configuration navigateur SIGEDA preproduction appliquee." -ForegroundColor Green
Write-Host "HostName      : $HostName"
Write-Host "ServerIp      : $ServerIp"
Write-Host "ProxyEnable   : $($finalSettings.ProxyEnable)"
Write-Host "ProxyServer   : $($finalSettings.ProxyServer)"
Write-Host "ProxyOverride : $($finalSettings.ProxyOverride)"
Write-Host "NO_PROXY      : $normalizedNoProxy"
if (-not $SkipHostsFile) {
  Write-Host "Hosts         : $env:SystemRoot\System32\drivers\etc\hosts"
}
Write-Host ""
Write-Host "Redemarrer Chrome, Edge, Firefox ou Opera avant de retester."
