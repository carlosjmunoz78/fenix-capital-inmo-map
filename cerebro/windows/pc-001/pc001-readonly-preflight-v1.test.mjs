import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('./pc001-readonly-preflight-v1.ps1',import.meta.url),'utf8');
test('scope is PREPROD and read-only',()=>{
  assert.match(s,/environment = 'PREPROD'/);
  assert.match(s,/mode = 'READ_ONLY'/);
});
test('all four existing listeners are checked',()=>{
  assert.ok(s.includes('@(8765,8766,8767,8768)'));
});
test('existing gateway is reused',()=>{
  assert.ok(s.includes('cerebro-device-gateway-preprod/health'));
});
test('Windows wake capability is inspected, not certified',()=>{
  for(const term of ['powercfg.exe /a','powercfg.exe /devicequery','Get-NetAdapterPowerManagement','HOLD_PHYSICAL_EVIDENCE_REQUIRED']) assert.ok(s.includes(term));
});
test('no remote agent authentication or physical wake is claimed',()=>{
  for(const term of ['agent_authenticated=$false','relay_verified = $false','wake_physically_verified = $false','suspend_authorized = $false'])assert.ok(s.includes(term));
});
