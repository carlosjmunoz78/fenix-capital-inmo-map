import test from 'node:test';
import assert from 'node:assert/strict';
import { decidePcRecoveryStart } from './legacy-start-policy-v1.mjs';
for (const mode of ['', '--agent', '--install', '--resume', 'run', '--agent --open-pairing']) {
  test('legacy Agent cannot launch in mode ' + JSON.stringify(mode), () => {
    assert.deepEqual(decidePcRecoveryStart({key:'CEREBRODeviceAgent',
      binaryName:'CEREBRO-Device-Agent.exe', mode, port:8766,
      verifiedHash:true, backedUp:true, processInventoryHealthy:true,
      universalLauncherAudited:true, sourceVersionContractVerified:true}),
      {allowed:false,reason:'LEGACY_INSTALLER_PATH_QUARANTINED_WINERROR32'});
  });
}
test('unknown universal VBS is denied', () => {
  assert.equal(decidePcRecoveryStart({key:'CEREBRODeviceAgentUniversalV023', port:8766,
    verifiedHash:true, backedUp:true, processInventoryHealthy:true})
    .reason, 'UNIVERSAL_LAUNCHER_NOT_AUDITED');
});
test('duplicate denied', () => assert.equal(decidePcRecoveryStart({port:8766,
  verifiedHash:true, backedUp:true, processInventoryHealthy:true,
  processAlreadyExists:true, universalLauncherAudited:true,
  sourceVersionContractVerified:true}).reason,'PROCESS_PRESENT_NO_DUPLICATE'));
test('preflight pass still needs physical acceptance', () => assert.equal(
  decidePcRecoveryStart({port:8766,verifiedHash:true,backedUp:true,
    processInventoryHealthy:true,universalLauncherAudited:true,
    sourceVersionContractVerified:true}).reason, 'PHYSICAL_ACCEPTANCE_REQUIRED'));
test('PROD denied', () => assert.equal(decidePcRecoveryStart({prodAuthorized:true}).reason,'PROD_DENIED'));
