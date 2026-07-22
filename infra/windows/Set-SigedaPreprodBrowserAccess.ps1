param(
  [string]$HostName = "sigeda-preprod.hdm",
  [string]$ServerIp = "172.16.10.88",
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
  $lines = if (Test-Path $hostsPath) { Get-Content -Path $hostsPath } else { @() }

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
  $updated = @($filtered) + $newLine
  Set-Content -Path $hostsPath -Value $updated -Encoding ascii
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

$proxyRegistryPath = Get-ProxyRegistryPath
$currentSettings = Get-ItemProperty -Path $proxyRegistryPath
$existingEntries = Get-ProxyOverrideEntries -RawValue $currentSettings.ProxyOverride

$domainSuffix = if ($HostName.Contains(".")) { "*." + ($HostName.Split(".", 2)[1]) } else { "" }
$desiredEntries = @(
  $HostName,
  $domainSuffix,
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
