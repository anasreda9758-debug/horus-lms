# Registers a daily Windows Scheduled Task that runs the logical DB backup.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/install-backup-task.ps1 [-Time 03:00]
#   powershell -ExecutionPolicy Bypass -File scripts/install-backup-task.ps1 -Unregister
param(
  [string]$Time = "03:00",
  [switch]$Unregister
)
$ErrorActionPreference = "Stop"

$taskName = "LMS-DB-Backup"
$project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$node = (Get-Command node.exe -ErrorAction Stop).Source

if ($Unregister) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Output "Task '$taskName' removed."
  exit 0
}

$action = New-ScheduledTaskAction `
  -Execute $node `
  -Argument "scripts/backup.mjs backup" `
  -WorkingDirectory $project
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Description "Daily logical backup of the LMS Postgres database" -Force | Out-Null

$t = Get-ScheduledTask -TaskName $taskName
Write-Output "Task '$taskName' registered:"
Write-Output "  State    : $($t.State)"
Write-Output "  Trigger  : Daily at $Time"
Write-Output "  Command  : $node scripts/backup.mjs backup (cwd=$project)"
Write-Output "Run manually with: node scripts/backup.mjs backup"
