[CmdletBinding()]
param(
  [string]$TaskName = 'CEREBRO-LRN-001-PREPROD',
  [string]$CompanyId = 'fenix',
  [string]$Version = '0.4.0',
  [string]$DataRoot = (Join-Path $env:ProgramData 'CEREBRO'),
  [switch]$RemoveRuntimeCode
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($null -ne $task) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$hostRoot = Join-Path $DataRoot (Join-Path 'host-code' (Join-Path $CompanyId (Join-Path 'LRN-001' $Version)))
if ($RemoveRuntimeCode -and (Test-Path -LiteralPath $hostRoot)) {
  Remove-Item -LiteralPath $hostRoot -Recurse -Force
}

[ordered]@{
  status = 'UNINSTALLED_TASK'
  task_name = $TaskName
  runtime_code_removed = [bool]$RemoveRuntimeCode
  state_preserved = $true
  backups_preserved = $true
  inbox_preserved = $true
  config_preserved = $true
  prod_authorized = $false
} | ConvertTo-Json -Depth 3
