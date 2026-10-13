import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTHORIZED_EXECUTION_DEVICE_SOURCES,
  EXECUTION_ROUTE_ORDER,
  DEVICE_ROUTE_ORDER,
  authorizedExecutionDeviceProfile,
  classifyAuthChallenge,
  planAuthorizedExecution,
  planDeviceExecution,
  sourceDisposition
} from '../runtime/authorized-execution-device-profile-v1.mjs';
import {HUMAN_REQUIRED_CODES} from '../runtime/continuous-improvement-contract.mjs';

const CANONICAL_HUMAN_REQUIRED=[
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
];

function healthyBrowserAttestation(){
  return {
    environment:'PREPROD',device_id:'desktop-test',profile_id:'Default',paired:true,online:true,
    kill_switch_enabled:true,cloud_transport_status:'ONLINE',chrome_running:true,
    attested_at:'2026-10-14T00:00:00.000Z'
  };
}

test('items 38-50 are represented without creating thirteen new engines',()=>{
  const profile=authorizedExecutionDeviceProfile();
  assert.equal(profile.schema_version,'1.0.0');
  assert.equal(profile.state_type,'CEREBRO_AUTHORIZED_EXECUTION_DEVICE_PROFILE_V1');
  assert.equal(profile.company_id,'fenix');
  assert.equal(profile.environment,'PREPROD');
  assert.equal(profile.new_engine_required,false);
  assert.deepEqual(AUTHORIZED_EXECUTION_DEVICE_SOURCES.map(x=>x.item),[38,39,40,41,42,43,44,45,46,47,48,49,50]);
  assert.deepEqual(profile.supporting_engines,['IAM-001','ROUTE-001','AUTO-001','QA-001','LRN-001']);
  assert.equal(profile.additional_cost_eur,0);
  assert.equal(profile.prod_authorized,false);
  assert.equal(profile.prod_write_authorized,false);
  assert.equal(profile.trading_access,false);
  assert.equal(profile.external_code_execution,false);
});

test('top-level human exception vocabulary remains the exact canonical eight',()=>{
  assert.deepEqual([...HUMAN_REQUIRED_CODES],CANONICAL_HUMAN_REQUIRED);
  assert.deepEqual(authorizedExecutionDeviceProfile().human_required_codes,CANONICAL_HUMAN_REQUIRED);
});

test('execution ladder is API then MCP then script then browser then computer-use then vision',()=>{
  assert.deepEqual(EXECUTION_ROUTE_ORDER,[
    'OFFICIAL_API','AUTHORIZED_MCP','LOCAL_SCRIPT','BROWSER_BRIDGE','COMPUTER_USE','VISION_FALLBACK'
  ]);
  assert.deepEqual(DEVICE_ROUTE_ORDER,[
    'ANDROID_INTENT_API','ACCESSIBILITY_SEMANTIC','DEVICE_BRIDGE','DETERMINISTIC_REPLAY','VISION_FALLBACK'
  ]);
});

test('authorized execution selects the first zero-cost available route deterministically',()=>{
  const result=planAuthorizedExecution({
    company_id:'fenix',engine_id:'AUTO-001',environment:'PREPROD',version:'1.0.0',
    routes:[
      {route_class:'LOCAL_SCRIPT',available:true,incremental_cost_eur:0},
      {route_class:'AUTHORIZED_MCP',available:true,incremental_cost_eur:0},
      {route_class:'OFFICIAL_API',available:false,incremental_cost_eur:0}
    ]
  },{now:'2026-10-14T00:05:00.000Z'});
  assert.equal(result.decision,'ROUTE');
  assert.equal(result.selected_route_class,'AUTHORIZED_MCP');
  assert.deepEqual(result.fallback_chain,['LOCAL_SCRIPT']);
  assert.equal(result.additional_cost_eur,0);
  assert.equal(result.execution_authorized,false);
  assert.equal(result.prod_write_authorized,false);
  assert.equal(result.trading_access,false);
});

test('browser route requires a fresh LAB/PREPROD binding and never becomes implicit PROD authority',()=>{
  const held=planAuthorizedExecution({
    company_id:'fenix',engine_id:'AUTO-001',environment:'PREPROD',version:'1.0.0',
    routes:[{route_class:'BROWSER_BRIDGE',available:true,incremental_cost_eur:0}]
  },{now:'2026-10-14T00:05:00.000Z'});
  assert.equal(held.decision,'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT');
  assert.equal(held.human_required,null);

  const routed=planAuthorizedExecution({
    company_id:'fenix',engine_id:'AUTO-001',environment:'PREPROD',version:'1.0.0',
    browser_attestation:healthyBrowserAttestation(),
    routes:[{route_class:'BROWSER_BRIDGE',available:true,incremental_cost_eur:0}]
  },{now:'2026-10-14T00:05:00.000Z'});
  assert.equal(routed.decision,'ROUTE');
  assert.equal(routed.selected_route_class,'BROWSER_BRIDGE');
  assert.equal(routed.browser_binding_status,'BROWSER_SESSION_BINDING_HEALTHY');
  assert.equal(routed.execution_authorized,false);
  assert.equal(routed.prod_authorized,false);
});

test('routine MFA, login and CAPTCHA challenges are action-required, never invented HUMAN_REQUIRED reasons',()=>{
  for(const kind of ['MFA_REQUIRED','LOGIN_REQUIRED','CAPTCHA_REQUIRED']){
    const result=classifyAuthChallenge({kind});
    assert.equal(result.decision,'ACTION_REQUIRED');
    assert.equal(result.human_required,null);
    assert.equal(result.bypass_allowed,false);
  }
});

test('canonical high-risk and money-limit cases use only valid top-level exceptions',()=>{
  const high=planAuthorizedExecution({
    company_id:'fenix',engine_id:'AUTO-001',environment:'PREPROD',version:'1.0.0',risk:'HIGH',routes:[]
  });
  assert.equal(high.decision,'HUMAN_REQUIRED');
  assert.equal(high.human_required,'HIGH_RISK');

  const paid=planAuthorizedExecution({
    company_id:'fenix',engine_id:'AUTO-001',environment:'PREPROD',version:'1.0.0',
    routes:[{route_class:'OFFICIAL_API',available:true,incremental_cost_eur:0.01}]
  });
  assert.equal(paid.decision,'HUMAN_REQUIRED');
  assert.equal(paid.human_required,'MONEY_LIMIT');
});

test('device execution stays LAB/PREPROD, deterministic-first, cost-zero and non-Trading',()=>{
  const result=planDeviceExecution({
    company_id:'fenix',engine_id:'AUTO-001',environment:'LAB',version:'1.0.0',
    device_platform:'ANDROID',
    routes:[
      {route_class:'VISION_FALLBACK',available:true,incremental_cost_eur:0},
      {route_class:'DETERMINISTIC_REPLAY',available:true,incremental_cost_eur:0},
      {route_class:'ACCESSIBILITY_SEMANTIC',available:true,incremental_cost_eur:0}
    ]
  });
  assert.equal(result.decision,'ROUTE');
  assert.equal(result.selected_route_class,'ACCESSIBILITY_SEMANTIC');
  assert.deepEqual(result.fallback_chain,['DETERMINISTIC_REPLAY','VISION_FALLBACK']);
  assert.equal(result.prod_authorized,false);
  assert.equal(result.trading_access,false);
  assert.equal(result.additional_cost_eur,0);

  const prod=planDeviceExecution({
    company_id:'fenix',engine_id:'AUTO-001',environment:'PROD',version:'1.0.0',device_platform:'ANDROID',routes:[]
  });
  assert.equal(prod.decision,'HOLD');
  assert.ok(prod.blockers.includes('prod_context_not_allowed'));
});

test('external candidates are benchmark/pattern sources only and Camoufox is never an evasion dependency',()=>{
  assert.deepEqual(sourceDisposition(44),AUTHORIZED_EXECUTION_DEVICE_SOURCES.find(x=>x.item===44));
  const camoufox=sourceDisposition(45);
  assert.equal(camoufox.source,'daijro/camoufox');
  assert.equal(camoufox.execution,'DISABLED');
  assert.equal(camoufox.anti_abuse_evasion_allowed,false);
  assert.equal(camoufox.captcha_bypass_allowed,false);
  assert.equal(camoufox.mfa_bypass_allowed,false);
  assert.equal(sourceDisposition(999).decision,'HOLD_UNKNOWN_SOURCE');
});
