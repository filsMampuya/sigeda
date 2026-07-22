param(
  [string]$HostName = "sigeda-preprod.hdm",
  [string]$ServerIp = "172.16.10.88"
)

$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-RegistryKey {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    New-Item -Path $Path -Force | Out-Null
  }
}

function Set-StringPolicy {
  param(
    [string]$Path,
    [string]$Name,
    [string]$Value
  )
  New-ItemProperty -Path $Path -Name $Name -PropertyType String -Value $Value -Force | Out-Null
}

function Set-DwordPolicy {
  param(
    [string]$Path,
    [string]$Name,
    [int]$Value
  )
  New-ItemProperty -Path $Path -Name $Name -PropertyType DWord -Value $Value -Force | Out-Null
}

if (-not (Test-IsAdministrator)) {
  throw "Ce script doit etre lance en administrateur."
}

$bypassList = @(
  $HostName,
  "*." + ($HostName.Split(".", 2)[1]),
  $ServerIp,
  "127.0.0.1",
  "localhost",
  "<local>"
) | Select-Object -Unique

$chromePolicyPath = "HKLM:\Software\Policies\Google\Chrome"
$edgePolicyPath = "HKLM:\Software\Policies\Microsoft\Edge"

foreach ($policyPath in @($chromePolicyPath, $edgePolicyPath)) {
  Ensure-RegistryKey -Path $policyPath

  Set-StringPolicy -Path $policyPath -Name "DnsOverHttpsMode" -Value "off"
  Set-DwordPolicy -Path $policyPath -Name "BuiltInDnsClientEnabled" -Value 0
  Set-DwordPolicy -Path $policyPath -Name "QuicAllowed" -Value 0
  Set-StringPolicy -Path $policyPath -Name "ProxyMode" -Value "system"
  Set-StringPolicy -Path $policyPath -Name "ProxyBypassList" -Value ($bypassList -join ";")
}

Write-Host ""
Write-Host "Politiques Chromium SIGEDA preproduction appliquees." -ForegroundColor Green
Write-Host "Chrome policy path : $chromePolicyPath"
Write-Host "Edge policy path   : $edgePolicyPath"
Write-Host "Bypass list        : $($bypassList -join ';')"
Write-Host ""
Write-Host "Fermez completement Chrome et Edge puis relancez-les."
