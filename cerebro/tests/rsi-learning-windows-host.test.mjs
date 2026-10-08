import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const installer=fs.readFileSync(new URL('../host/windows/Install-CerebroLrn001Host.ps1',import.meta.url),'utf8');
const launcher=fs.readFileSync(new URL('../host/windows/Start-CerebroLrn001Host.ps1',import.meta.url),'utf8');
const uninstaller=fs.readFileSync(new URL('../host/windows/Uninstall-CerebroLrn001Host.ps1',import.meta.url),'utf8');
const health=fs.readFileSync(new URL('../host/windows/Get-CerebroLrn001Health.ps1',import.meta.url),'utf8');
const oneClick=fs.readFileSync(new URL('../host/windows/INSTALL_CEREBRO_LRN001_PREPROD.cmd',import.meta.url),'utf8');
const acceptance=fs.readFileSync(new URL('../host/windows/Test-CerebroLrn001Host.ps1',import.meta.url),'utf8');
const acceptanceClick=fs.readFileSync(new URL('../host/windows/TEST_CEREBRO_LRN001_PREPROD.cmd',import.meta.url),'utf8');

test('Windows binding uses native AtStartup SYSTEM scheduling and immutable copied host code',()=>{
  assert.match(installer,/New-ScheduledTaskTrigger -AtStartup/);
  assert.match(installer,/UserId 'SYSTEM'/);
  assert.match(installer,/LogonType ServiceAccount/);
  assert.match(installer,/RestartCount 3/);
  assert.match(installer,/MultipleInstances IgnoreNew/);
  assert.match(installer,/host-code/);
  assert.match(installer,/deployment-manifest\.json/);
  assert.match(installer,/source_host_sha256/);
  assert.match(installer,/UTF8Encoding\(\$false\)/);
  assert.match(installer,/additional_cost_eur = 0/);
  assert.match(installer,/prod_authorized = \$false/);
});

test('Windows binding schedules autonomous outbox-aware host with zero credentials and dedicated PREPROD state branch',()=>{
  assert.match(installer,/rsi-learning-auto-host\.mjs/);
  assert.match(installer,/rsi-outbox-client\.mjs/);
  assert.match(installer,/cerebro-rsi-learning-outbox-v0/);
  assert.match(installer,/credentials_required = \$false/);
  assert.match(installer,/remote_outbox_enabled = \$true/);
  assert.doesNotMatch(installer,/GITHUB_TOKEN|API_KEY|Authorization:/i);
});

test('reinstall is preservation-first and cannot overwrite host code silently',()=>{
  assert.match(installer,/ForceReinstall/);
  assert.match(installer,/preservationSnapshot/);
  assert.match(installer,/Copy-Item -LiteralPath \$hostRoot -Destination \$preservationSnapshot/);
  assert.match(installer,/throw 'Host code already exists/);
  assert.match(installer,/configBackup/);
});

test('launcher runs only local Node host daemon and appends local logs',()=>{
  assert.match(launcher,/& \$NodePath \$HostScript daemon --config \$ConfigPath/);
  assert.match(launcher,/\*>> \$logFile/);
  assert.doesNotMatch(launcher,/Invoke-WebRequest|Invoke-RestMethod|curl|wget/i);
});

test('one-click launcher elevates only the local PREPROD installer with explicit safe gates and propagates exit status',()=>{
  assert.match(oneClick,/Start-Process powershell\.exe -Verb RunAs/);
  assert.match(oneClick,/-PassThru/);
  assert.match(oneClick,/exit \$p\.ExitCode/);
  assert.match(oneClick,/Install-CerebroLrn001Host\.ps1/);
  assert.match(oneClick,/-PolicyPass/);
  assert.match(oneClick,/-SecurityPass/);
  assert.match(oneClick,/-EnableLocalPersistence/);
  assert.doesNotMatch(oneClick,/\bPROD\b|Trading|Invoke-WebRequest|curl|wget/i);
});

test('uninstaller removes scheduled execution but preserves state backup inbox and config by default',()=>{
  assert.match(uninstaller,/Unregister-ScheduledTask/);
  assert.match(uninstaller,/state_preserved = \$true/);
  assert.match(uninstaller,/backups_preserved = \$true/);
  assert.match(uninstaller,/inbox_preserved = \$true/);
  assert.match(uninstaller,/config_preserved = \$true/);
  assert.match(uninstaller,/RemoveRuntimeCode/);
});

test('physical health is fail-closed until task heartbeat and PREPROD safety all verify',()=>{
  assert.match(health,/physical_host_confirmed = \(\$status -eq 'GREEN'\)/);
  assert.match(health,/task\.State -eq 'Running'/);
  assert.match(health,/heartbeat\.environment -eq 'PREPROD'/);
  assert.match(health,/heartbeat\.prod_authorized -eq \$false/);
  assert.match(health,/heartbeat\.prod_write_authorized -eq \$false/);
  assert.match(health,/heartbeat_fresh/);
});

test('physical acceptance uses isolated fixture company, preserves operator kill switch and never auto-reboots',()=>{
  assert.match(acceptance,/acceptCompany = 'cerebro-acceptance'/);
  assert.match(acceptance,/fixture=\$true/);
  assert.match(acceptance,/SKIPPED_PREEXISTING_KILL/);
  assert.match(acceptance,/preservation_backup/);
  assert.match(acceptance,/reboot_auto_start_pending=\$true/);
  assert.doesNotMatch(acceptance,/Restart-Computer|shutdown\.exe|Stop-Computer/i);
  assert.match(acceptanceClick,/Test-CerebroLrn001Host\.ps1/);
  assert.match(acceptanceClick,/-PassThru/);
  assert.match(acceptanceClick,/exit \$p\.ExitCode/);
});
