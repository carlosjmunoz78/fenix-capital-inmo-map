[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path,
  [string]$CompanyId = 'fenix',
  [string]$Version = '0.4.0',
  [string]$TaskName = 'CEREBRO-LRN-001-PREPROD',
  [string]$DataRoot = (Join-Path $env:ProgramData 'CEREBRO'),
  [ValidateRange(5000,3600000)][int]$PollIntervalMs = 60000,
  [switch]$PolicyPass,
  [switch]$SecurityPass,
  [switch]$EnableLocalPersistence,
  [switch]$ForceReinstall
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Administrator rights are required to install the AtStartup SYSTEM scheduled task.'
  }
}

function Resolve-Node {
  $node = Get-Command node.exe -ErrorAction Stop
  if (-not (Test-Path -LiteralPath $node.Source)) { throw 'node.exe path is not accessible.' }
  return $node.Source
}

function Timestamp { return (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ') }

Assert-Admin
if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'cerebro\runtime\rsi-learning-host.mjs'))) {
  throw 'RepoRoot does not contain cerebro/runtime/rsi-learning-host.mjs.'
}
if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'cerebro\host\windows\Start-CerebroLrn001Host.ps1'))) {
  throw 'RepoRoot does not contain the Windows LRN launcher.'
}

$nodePath = Resolve-Node
$engineId = 'LRN-001'
$environment = 'PREPROD'
$hostRoot = Join-Path $DataRoot (Join-Path 'host-code' (Join-Path $CompanyId (Join-Path $engineId $Version)))
$runtimeRoot = Join-Path $hostRoot 'cerebro\runtime'
$skillsRoot = Join-Path $hostRoot 'cerebro\skills'
$configRoot = Join-Path $DataRoot (Join-Path 'config' (Join-Path $CompanyId $engineId))
$configBackupRoot = Join-Path $DataRoot (Join-Path 'config-backups' (Join-Path $CompanyId $engineId))
$installBackupRoot = Join-Path $DataRoot (Join-Path 'install-backups' (Join-Path $CompanyId $engineId))
$stateRoot = Join-Path $DataRoot 'state'
$inboxRoot = Join-Path $DataRoot (Join-Path 'inbox' (Join-Path $CompanyId $engineId))
$backupRoot = Join-Path $DataRoot (Join-Path 'backups' (Join-Path $CompanyId $engineId))
$logRoot = Join-Path $DataRoot (Join-Path 'logs' (Join-Path $CompanyId $engineId))
$configPath = Join-Path $configRoot 'host.json'
$launcherPath = Join-Path $hostRoot 'Start-CerebroLrn001Host.ps1'
$hostScript = Join-Path $runtimeRoot 'rsi-learning-host.mjs'
$manifestPath = Join-Path $hostRoot 'deployment-manifest.json'
$preservationSnapshot = $null

if (Test-Path -LiteralPath $hostRoot) {
  if (-not $ForceReinstall) { throw 'Host code already exists. Use -ForceReinstall only after reviewing the existing deployment; it will be snapshotted first.' }
  New-Item -ItemType Directory -Path $installBackupRoot -Force | Out-Null
  $preservationSnapshot = Join-Path $installBackupRoot ("{0}-{1}" -f $Version,(Timestamp))
  Copy-Item -LiteralPath $hostRoot -Destination $preservationSnapshot -Recurse -Force
  Remove-Item -LiteralPath $hostRoot -Recurse -Force
}

foreach ($dir in @($runtimeRoot,$skillsRoot,$configRoot,$configBackupRoot,$stateRoot,$inboxRoot,$backupRoot,$logRoot)) {
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

Copy-Item -Path (Join-Path $RepoRoot 'cerebro\runtime\*') -Destination $runtimeRoot -Recurse -Force
Copy-Item -Path (Join-Path $RepoRoot 'cerebro\skills\*') -Destination $skillsRoot -Recurse -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot 'cerebro\host\windows\Start-CerebroLrn001Host.ps1') -Destination $launcherPath -Force

$files = Get-ChildItem -LiteralPath (Join-Path $hostRoot 'cerebro') -Recurse -File | Sort-Object FullName
$fileManifest = @()
foreach ($file in $files) {
  $relative = $file.FullName.Substring($hostRoot.Length).TrimStart('\')
  $fileManifest += [ordered]@{ path = $relative; sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant(); bytes = $file.Length }
}
$deploymentManifest = [ordered]@{
  schema_version = '1.0.0'
  company_id = $CompanyId
  engine_id = $engineId
  environment = $environment
  version = $Version
  installed_at = (Get-Date).ToUniversalTime().ToString('o')
  source_host_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $RepoRoot 'cerebro\runtime\rsi-learning-host.mjs')).Hash.ToLowerInvariant()
  files = $fileManifest
  preservation_snapshot = $preservationSnapshot
  additional_cost_eur = 0
  prod_authorized = $false
  trading_access = $false
}
$deploymentManifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

if (Test-Path -LiteralPath $configPath) {
  $configBackup = Join-Path $configBackupRoot ("host-{0}.json" -f (Timestamp))
  Copy-Item -LiteralPath $configPath -Destination $configBackup -Force
}
$config = [ordered]@{
  company_id = $CompanyId
  engine_id = $engineId
  environment = $environment
  version = $Version
  preprod_version = $Version
  data_dir = $stateRoot
  inbox_dir = $inboxRoot
  backup_dir = $backupRoot
  poll_interval_ms = $PollIntervalMs
  policy_pass = [bool]$PolicyPass
  security_pass = [bool]$SecurityPass
  local_persistence_enabled = [bool]$EnableLocalPersistence
}
$config | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $configPath -Encoding UTF8

$arguments = @(
  '-NoProfile',
  '-NonInteractive',
  '-File', ('"{0}"' -f $launcherPath),
  '-NodePath', ('"{0}"' -f $nodePath),
  '-HostScript', ('"{0}"' -f $hostScript),
  '-ConfigPath', ('"{0}"' -f $configPath),
  '-LogRoot', ('"{0}"' -f $logRoot)
) -join ' '
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments -WorkingDirectory $hostRoot
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'CEREBRO LRN-001 PREPROD zero-cost local learning host. No PROD authority.' -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 2

[ordered]@{
  status = 'INSTALLED_PENDING_HEARTBEAT_VERIFICATION'
  task_name = $TaskName
  company_id = $CompanyId
  engine_id = $engineId
  environment = $environment
  version = $Version
  config_path = $configPath
  deployment_manifest = $manifestPath
  preservation_snapshot = $preservationSnapshot
  node_path = $nodePath
  policy_pass = [bool]$PolicyPass
  security_pass = [bool]$SecurityPass
  local_persistence_enabled = [bool]$EnableLocalPersistence
  additional_cost_eur = 0
  prod_authorized = $false
} | ConvertTo-Json -Depth 4
