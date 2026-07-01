param(
  [string]$TaskPrefix = "SIGEDA Preprod",
  [string]$RepoRoot = "C:\sigeda\app\repo",
  [string]$EnvFile = "C:\sigeda\app\repo\infra\docker\.env.preprod",
  [string]$PowerShellPath = "powershell.exe",
  [string]$ExecutionTimeZoneNote = "Heure locale Windows",
  [string]$BackupTime = "22:30",
  [int]$HealthcheckIntervalMinutes = 15,
  [int]$BackupRetentionDays = 7
)

$ErrorActionPreference = "Stop"

function New-SigedaTaskAction {
  param([string]$ScriptPath, [string]$ExtraArgs = "")

  $arguments = "-NoProfile -ExecutionPolicy Bypass -Command `"& { `$env:SIGEDA_PREPROD_ENV_FILE='$EnvFile'; & '$ScriptPath' $ExtraArgs }`""
  return New-ScheduledTaskAction -Execute $PowerShellPath -Argument $arguments
}

function Remove-TaskIfExists {
  param([string]$TaskName)

  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($task) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  }
}

$backupScript = Join-Path $RepoRoot "infra\docker\scripts\preprod-backup.ps1"
$pruneScript = Join-Path $RepoRoot "infra\docker\scripts\preprod-backup-prune.ps1"
$healthScript = Join-Path $RepoRoot "infra\docker\scripts\preprod-healthcheck.ps1"

foreach ($path in @($backupScript, $pruneScript, $healthScript, $EnvFile)) {
  if (-not (Test-Path $path)) {
    throw "Fichier requis introuvable : $path"
  }
}

$backupTaskName = "$TaskPrefix Backup"
$pruneTaskName = "$TaskPrefix Backup Prune"
$healthTaskName = "$TaskPrefix Healthcheck"

Remove-TaskIfExists -TaskName $backupTaskName
Remove-TaskIfExists -TaskName $pruneTaskName
Remove-TaskIfExists -TaskName $healthTaskName

$backupAction = New-SigedaTaskAction -ScriptPath $backupScript
$pruneAction = New-SigedaTaskAction -ScriptPath $pruneScript -ExtraArgs "-RetentionDays $BackupRetentionDays"
$healthAction = New-SigedaTaskAction -ScriptPath $healthScript

$backupTrigger = New-ScheduledTaskTrigger -Daily -At $BackupTime
$pruneTrigger = New-ScheduledTaskTrigger -Daily -At "23:30"
$healthTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $HealthcheckIntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 1)

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $backupTaskName -Action $backupAction -Trigger $backupTrigger -Principal $principal -Settings $settings -Description "Sauvegarde quotidienne SIGEDA preproduction ($ExecutionTimeZoneNote)."
Register-ScheduledTask -TaskName $pruneTaskName -Action $pruneAction -Trigger $pruneTrigger -Principal $principal -Settings $settings -Description "Purge quotidienne des sauvegardes SIGEDA preproduction."
Register-ScheduledTask -TaskName $healthTaskName -Action $healthAction -Trigger $healthTrigger -Principal $principal -Settings $settings -Description "Healthcheck periodique SIGEDA preproduction."

Write-Host "[SIGEDA] Taches planifiees enregistrees :"
Write-Host " - $backupTaskName"
Write-Host " - $pruneTaskName"
Write-Host " - $healthTaskName"
