import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {foundationManifest,executeFoundation} from '../runtime/l7/foundation-engines-v1.mjs';
import {authorizedExecutionDeviceProfile} from '../runtime/authorized-execution-device-profile-v1.mjs';

const labCtx={company_id:'fenix',principal_company_id:'fenix',environment:'LAB',version:'v1'};
const labProv=JSON.parse(fs.readFileSync('cerebro/evidence/lab-trd-paper-closure/2026-11-03/PROVENANCE.json','utf8'));
const hci=JSON.parse(fs.readFileSync('cerebro/evidence/hci001-physical-acceptance/2026-11-03/CURRENT_CHANNEL.json','utf8'));

test('LAB-TRD remains a physically isolated LAB foundation',()=>{
  const manifest=foundationManifest('LAB-TRD');
  const result=executeFoundation('LAB-TRD',labCtx);
  assert.equal(manifest.prod_writes,false);
  assert.equal(manifest.trading_access,false);
  assert.equal(manifest.additional_cost_eur,0);
  assert.equal(manifest.promotion_authorized,false);
  assert.equal(result.status,'ISOLATED_LAB_FOUNDATION');
  assert.equal(result.trading_execution,false);
  assert.equal(result.credential_access,false);
  assert.equal(result.shared_prod_resources,false);
  assert.equal(result.network_execution,false);
});

test('LAB-TRD sanitized paper provenance proves paper connectivity without REAL authority',()=>{
  assert.equal(labProv.engine_id,'LAB-TRD');
  assert.equal(labProv.source_probe.status,'GREEN');
  assert.equal(labProv.source_probe.mode,'ALPACA_PAPER_ONLY');
  assert.equal(labProv.source_probe.paper_only,true);
  assert.equal(labProv.source_probe.live_endpoint_blocked,true);
  assert.equal(labProv.source_probe.account_status,'ACTIVE');
  assert.equal(labProv.source_probe.real_money_execution,false);
  assert.equal(labProv.source_probe.prod_write,false);
  assert.equal(labProv.source_probe.secrets_in_repo,false);
  assert.equal(labProv.real_authorized,false);
});

test('HCI-001 platform evidence is preserved without inventing current-channel control',()=>{
  const profile=authorizedExecutionDeviceProfile();
  assert.equal(hci.engine_id,'HCI-001');
  assert.equal(hci.platform_evidence.preprod_physical_e2e,'GREEN');
  assert.equal(hci.platform_evidence.prod_browser_gateway_health,'GREEN');
  assert.equal(hci.platform_evidence.rollback_preserved,true);
  assert.equal(hci.current_chat_probe.new_tab_navigation,'PASS');
  assert.equal(hci.current_chat_probe.semantic_accessibility_read,'PASS');
  assert.equal(hci.current_chat_probe.input_or_click_tool_exposed_in_current_chat,false);
  assert.equal(hci.current_chat_probe.close_tab,'PERMISSION_DISABLED');
  assert.equal(hci.human_required,null);
  assert.equal(profile.prod_authorized,false);
  assert.equal(profile.prod_write_authorized,false);
  assert.equal(profile.trading_access,false);
  assert.equal(profile.additional_cost_eur,0);
});

test('final two closure never promotes REAL trading or writes PROD',()=>{
  assert.equal(labProv.real_authorized,false);
  assert.equal(hci.prod_write_authorized,false);
  assert.equal(hci.trading_access,false);
  assert.equal(labProv.additional_cost_eur,0);
  assert.equal(hci.additional_cost_eur,0);
});
