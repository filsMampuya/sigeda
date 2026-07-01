param(
  [int]$HttpPort = 80,
  [int]$HttpsPort = 443,
  [int]$SshPort = 22,
  [string]$RulePrefix = "SIGEDA PREPROD"
)

$ErrorActionPreference = "Stop"

Write-Host "[SIGEDA] Configuration du pare-feu Windows Defender"

Get-NetFirewallRule -DisplayName "$RulePrefix*" -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue

New-NetFirewallRule -DisplayName "$RulePrefix HTTP" -Direction Inbound -Protocol TCP -LocalPort $HttpPort -Action Allow
New-NetFirewallRule -DisplayName "$RulePrefix HTTPS" -Direction Inbound -Protocol TCP -LocalPort $HttpsPort -Action Allow

Write-Host "[SIGEDA] Regles creees pour HTTP=$HttpPort HTTPS=$HttpsPort"
