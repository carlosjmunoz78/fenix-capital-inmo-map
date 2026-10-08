[CmdletBinding()]
param(
  [string]$TaskName = 'CEREBRO-LRN-001-PREPROD',
  [string]$CompanyId = 'fenix',
  [string]$Version = '0.4.0',
  [string]$DataRoot = (Join-Path $env:ProgramData 'CEREBRO')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Utf8NoBom([string]$Path,[string]$Text) {
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path,$Text,$encoding)
}
function Read-Json([string]$Path) { return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json }
function Assert-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Administrator rights required for physical acceptance.' }
}
function Invoke-NodeJson([string]$Node,[string[]]$Args) {
  $lines = & $Node @Args 2>&1
  $code = $LASTEXITCODE
  if ($code -ne 0) { throw "Node command failed ($code): $($lines -join [Environment]::NewLine)" }
  $text = ($lines -join [Environment]::NewLine).Trim()
  if (-not $text) { throw 'Node command returned no JSON.' }
  return ($text | ConvertFrom-Json)
}
function Wait-Heartbeat([string]$HeartbeatPath,[scriptblock]$Predicate,[int]$TimeoutSeconds,[string]$Label) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    if (Test-Path -LiteralPath $HeartbeatPath) {
      try {
        $hb = Read-Json $HeartbeatPath
        if (& $Predicate $hb) { return $hb }
      } catch {}
    }
    Start-Sleep -Milliseconds 750
  } while ((Get-Date) -lt $deadline)
  throw "Timeout waiting for heartbeat: $Label"
}
function Task-State([string]$Name) {
  $task = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
  if ($null -eq $task) { return 'MISSING' }
  return [string]$task.State
}
function Event-Low([string]$Id,[string]$Company) {
  return [ordered]@{
    event_id=$Id; event_type='SKILL_CANDIDATE_STATIC_LAB_GREEN'; candidate_id="candidate:$Id"; company_id=$Company;
    engine_id='FACT-001'; version='0.1.0'; reason='STATIC_LAB_GREEN'; evidence_ref=[ordered]@{source_ref="physical-acceptance:$Id"};
    payload=[ordered]@{domain='seo'; fixture=$true}; target_engine_bindings=@('SEO-001')
  }
}
function Event-High([string]$Id,[string]$Company) {
  return [ordered]@{
    event_id=$Id; event_type='SECURITY_ADVISORY'; candidate_id="candidate:$Id"; company_id=$Company;
    engine_id='FACT-001'; version='0.1.0'; severity='HIGH'; reason='SECURITY_HIGH'; evidence_ref=[ordered]@{source_ref="physical-acceptance:$Id"};
    payload=[ordered]@{domain='skills'; fixture=$true}
  }
}

Assert-Admin
$engineId = 'LRN-001'
$configPath = Join-Path $DataRoot (Join-Path 'config' (Join-Path $CompanyId (Join-Path $engineId 'host.json')))
if (-not (Test-Path -LiteralPath $configPath)) { throw "Installed host config missing: $configPath" }
$config = Read-Json $configPath
if ($config.company_id -ne $CompanyId -or $config.engine_id -ne $engineId -or $config.environment -ne 'PREPROD') { throw 'Installed host config identity/environment mismatch.' }
$hostRoot = Join-Path $DataRoot (Join-Path 'host-code' (Join-Path $CompanyId (Join-Path $engineId $Version)))
$hostScript = Join-Path $hostRoot 'cerebro\runtime\rsi-learning-host.mjs'
if (-not (Test-Path -LiteralPath $hostScript)) { throw "Installed host script missing: $hostScript" }
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$realEngineRoot = Join-Path $config.data_dir (Join-Path $CompanyId $engineId)
$realHeartbeat = Join-Path $realEngineRoot 'heartbeat.json'
$realKill = Join-Path $realEngineRoot 'KILL_SWITCH'
$pollMs = [int]$config.poll_interval_ms
$waitSeconds = [math]::Max(20,[math]::Ceiling(($pollMs / 1000.0) * 3.0))
$startedAt = (Get-Date).ToUniversalTime().ToString('o')
$results = [ordered]@{
  schema_version='1.0.0'; company_id=$CompanyId; engine_id=$engineId; environment='PREPROD'; version=$Version; started_at=$startedAt;
  scheduled_task=[ordered]@{}; real_kill_switch=[ordered]@{}; ephemeral_acceptance=[ordered]@{}; restart=[ordered]@{};
  reboot_auto_start_pending=$true; additional_cost_eur=0; prod_authorized=$false; trading_access=$false
}

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($null -eq $task) { throw "Scheduled Task missing: $TaskName" }
if ([string]$task.State -ne 'Running') { Start-ScheduledTask -TaskName $TaskName }
$initial = Wait-Heartbeat $realHeartbeat { param($hb) $hb.environment -eq 'PREPROD' -and $hb.engine_id -eq 'LRN-001' -and $hb.prod_authorized -eq $false -and $hb.prod_write_authorized -eq $false } $waitSeconds 'initial PREPROD heartbeat'
$results.scheduled_task = [ordered]@{status='PASS'; task_state=(Task-State $TaskName); heartbeat_status=$initial.status; heartbeat_at=$initial.cycle_finished_at}

$killExisted = Test-Path -LiteralPath $realKill
if ($killExisted) {
  $results.real_kill_switch = [ordered]@{status='SKIPPED_PREEXISTING_KILL'; preserved=$true}
} else {
  New-Item -ItemType File -Path $realKill -Force | Out-Null
  $killed = Wait-Heartbeat $realHeartbeat { param($hb) $hb.status -eq 'KILLED' -and $hb.kill_switch_enabled -eq $true } $waitSeconds 'real kill switch KILLED'
  Remove-Item -LiteralPath $realKill -Force
  $resumed = Wait-Heartbeat $realHeartbeat { param($hb) @('GREEN','PARTIAL_HELD') -contains $hb.status -and $hb.kill_switch_enabled -eq $false } $waitSeconds 'real kill switch release'
  $results.real_kill_switch = [ordered]@{status='PASS'; killed_at=$killed.cycle_finished_at; resumed_status=$resumed.status; resumed_at=$resumed.cycle_finished_at}
}

$acceptanceId = [Guid]::NewGuid().ToString('N')
$acceptCompany = 'cerebro-acceptance'
$acceptRoot = Join-Path $DataRoot (Join-Path 'acceptance' $acceptanceId)
$acceptData = Join-Path $acceptRoot 'state'
$acceptInbox = Join-Path $acceptRoot 'inbox'
$acceptBackup = Join-Path $acceptRoot 'backups'
$acceptConfigPath = Join-Path $acceptRoot 'host.json'
foreach($dir in @($acceptRoot,$acceptData,$acceptInbox,$acceptBackup)){New-Item -ItemType Directory -Path $dir -Force | Out-Null}
$acceptConfig = [ordered]@{
  company_id=$acceptCompany; engine_id='LRN-001'; environment='PREPROD'; version='acceptance-v1'; preprod_version='acceptance-v1';
  data_dir=$acceptData; inbox_dir=$acceptInbox; backup_dir=$acceptBackup; poll_interval_ms=5000;
  policy_pass=$true; security_pass=$true; local_persistence_enabled=$true
}
Write-Utf8NoBom $acceptConfigPath ($acceptConfig | ConvertTo-Json -Depth 5)
$lowId="evt-physical-low-$acceptanceId"
$lowPath=Join-Path $acceptInbox '001-low.json'
Write-Utf8NoBom $lowPath (([ordered]@{events=@((Event-Low $lowId $acceptCompany))}) | ConvertTo-Json -Depth 8)
$low = Invoke-NodeJson $nodePath @($hostScript,'once','--config',$acceptConfigPath)
if ($low.status -ne 'GREEN' -or $low.last_result.persisted_total -ne 1) { throw 'Ephemeral LOW fixture did not persist exactly once.' }
$lowAgain = Invoke-NodeJson $nodePath @($hostScript,'once','--config',$acceptConfigPath)
if ($lowAgain.last_result.processed_batches -ne 0 -or $lowAgain.last_result.skipped_receipts -lt 1) { throw 'Receipt idempotency failed for LOW fixture.' }
$highId="evt-physical-high-$acceptanceId"
$highPath=Join-Path $acceptInbox '002-high.json'
Write-Utf8NoBom $highPath (([ordered]@{events=@((Event-High $highId $acceptCompany))}) | ConvertTo-Json -Depth 8)
$high = Invoke-NodeJson $nodePath @($hostScript,'once','--config',$acceptConfigPath)
if ($high.status -ne 'PARTIAL_HELD' -or -not ($high.last_result.human_required -contains 'HIGH_RISK')) { throw 'Ephemeral HIGH fixture did not produce canonical HIGH_RISK hold.' }
$acceptEngineRoot = Join-Path $acceptData (Join-Path $acceptCompany 'LRN-001')
$acceptKill = Join-Path $acceptEngineRoot 'KILL_SWITCH'
New-Item -ItemType File -Path $acceptKill -Force | Out-Null
$killedEphemeral = Invoke-NodeJson $nodePath @($hostScript,'once','--config',$acceptConfigPath)
if ($killedEphemeral.status -ne 'KILLED') { throw 'Ephemeral kill switch failed.' }
$backup = Invoke-NodeJson $nodePath @($hostScript,'backup','--config',$acceptConfigPath)
if ($backup.status -ne 'BACKUP_GREEN') { throw 'Ephemeral backup failed.' }
$verified = Invoke-NodeJson $nodePath @($hostScript,'verify-backup','--config',$acceptConfigPath,'--manifest',$backup.manifest_file)
if ($verified.status -ne 'BACKUP_VERIFIED') { throw 'Ephemeral backup verification failed.' }
$restored = Invoke-NodeJson $nodePath @($hostScript,'restore','--config',$acceptConfigPath,'--manifest',$backup.manifest_file,'--confirm-restore')
if ($restored.status -ne 'RESTORE_GREEN' -or -not $restored.preservation_backup) { throw 'Ephemeral restore/preservation backup failed.' }
$results.ephemeral_acceptance = [ordered]@{
  status='PASS'; acceptance_id=$acceptanceId; isolated_company_id=$acceptCompany; low_persisted=1; low_idempotent=$true;
  high_human_required='HIGH_RISK'; kill_switch='PASS'; backup_status=$backup.status; verify_status=$verified.status; restore_status=$restored.status;
  preservation_backup=$restored.preservation_backup; artifacts_preserved_at=$acceptRoot
}

if (-not $killExisted) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  $stopDeadline=(Get-Date).AddSeconds(20)
  do { Start-Sleep -Milliseconds 500; $state=Task-State $TaskName } while ($state -eq 'Running' -and (Get-Date) -lt $stopDeadline)
  if ($state -eq 'Running') { throw 'Scheduled Task did not stop within timeout.' }
  Start-ScheduledTask -TaskName $TaskName
  $restarted = Wait-Heartbeat $realHeartbeat { param($hb) @('GREEN','PARTIAL_HELD') -contains $hb.status -and $hb.kill_switch_enabled -eq $false } $waitSeconds 'task restart heartbeat'
  $results.restart = [ordered]@{status='PASS'; task_state=(Task-State $TaskName); heartbeat_status=$restarted.status; heartbeat_at=$restarted.cycle_finished_at}
} else {
  $results.restart = [ordered]@{status='SKIPPED_PREEXISTING_KILL'; reason='Existing operator kill switch preserved'}
}

$results.completed_at=(Get-Date).ToUniversalTime().ToString('o')
$results.physical_acceptance = if ($results.scheduled_task.status -eq 'PASS' -and $results.ephemeral_acceptance.status -eq 'PASS' -and @('PASS','SKIPPED_PREEXISTING_KILL') -contains $results.real_kill_switch.status -and @('PASS','SKIPPED_PREEXISTING_KILL') -contains $results.restart.status) { 'PASS_REBOOT_PENDING' } else { 'FAIL' }
$evidencePath = Join-Path $acceptRoot 'physical-acceptance-result.json'
Write-Utf8NoBom $evidencePath ($results | ConvertTo-Json -Depth 8)
$results.evidence_path=$evidencePath
$results | ConvertTo-Json -Depth 8
