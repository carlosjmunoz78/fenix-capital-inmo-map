import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateB17BrowserPhysicalGates} from '../runtime/universal-skill-b17-browser-physical-gates-v1.mjs';

const NOW='2026-10-18T00:10:00.000Z';
function attestation(overrides={}){
  return {
    environment:'PREPROD',device_id:'desktop-b17-test',profile_id:'Default',paired:true,online:true,
    kill_switch_enabled:true,cloud_transport_status:'ONLINE',chrome_running:true,
    attested_at:'2026-10-18T00:05:00.000Z',...overrides
  };
}
function action(overrides={}){
  return {
    environment:'PREPROD',route_class:'BROWSER_BRIDGE',operation_kind:'OBSERVE',success:true,
    bounded:true,fail_closed:true,kill_switch_observed:true,prod_mutation:false,public_mutation:false,
    trading_access:false,customer_data_used:false,incremental_cost_eur:0,
    observed_at:'2026-10-18T00:06:00.000Z',binding_status:'BROWSER_SESSION_BINDING_HEALTHY',...overrides
  };
}

test('B17 refuses config-only proof and keeps physical browser work BLOCKED_EXTERNAL',()=>{
  const r=evaluateB17BrowserPhysicalGates({}, {now:NOW});
  assert.equal(r.configuration_gate,'HECHO');
  assert.equal(r.no_duplicate_browser_provider,true);
  assert.equal(r.config_only_proof_forbidden,true);
  assert.equal(r.browser_binding_fresh,false);
  assert.equal(r.action_observation_valid,false);
  assert.equal(r.terminal_state,'BLOCKED_EXTERNAL');
  assert.equal(r.activation_state,'PHYSICAL_EVIDENCE_PENDING');
  assert.equal(r.physical_evidence_current,false);
  assert.equal(r.human_required,null);
  assert.ok(r.residuals.includes('FRESH_AUTHORIZED_BROWSER_BRIDGE_ATTESTATION'));
  assert.ok(r.residuals.includes('BOUNDED_BROWSER_BRIDGE_ACTION_OBSERVATION'));
});

test('fresh attestation alone is insufficient without a bounded physical action observation',()=>{
  const r=evaluateB17BrowserPhysicalGates({browser_attestation:attestation()}, {now:NOW});
  assert.equal(r.browser_binding_status,'BROWSER_SESSION_BINDING_HEALTHY');
  assert.equal(r.browser_binding_fresh,true);
  assert.equal(r.action_observation_valid,false);
  assert.equal(r.terminal_state,'BLOCKED_EXTERNAL');
  assert.equal(r.physical_evidence_current,false);
});

test('fresh attestation plus safe bounded PREPROD observation closes the physical gate without granting PROD',()=>{
  const r=evaluateB17BrowserPhysicalGates({browser_attestation:attestation(),action_observation:action()}, {now:NOW});
  assert.equal(r.browser_binding_fresh,true);
  assert.equal(r.action_observation_valid,true);
  assert.equal(r.terminal_state,'FULL_REAL');
  assert.equal(r.activation_state,'FULL_SAFE_PREPROD');
  assert.equal(r.physical_evidence_current,true);
  assert.deepEqual(r.residuals,[]);
  assert.equal(r.authority.prod_authorized,false);
  assert.equal(r.authority.prod_write_authorized,false);
  assert.equal(r.authority.public_deploy_authorized,false);
  assert.equal(r.authority.auto_merge_authorized,false);
  assert.equal(r.authority.arbitrary_shell_authorized,false);
  assert.equal(r.authority.customer_data_authorized,false);
  assert.equal(r.authority.trading_access,false);
  assert.equal(r.authority.additional_cost_eur,0);
});

test('stale browser attestation cannot be recycled as current physical proof',()=>{
  const r=evaluateB17BrowserPhysicalGates({
    browser_attestation:attestation({attested_at:'2026-10-17T23:00:00.000Z'}),
    action_observation:action()
  }, {now:NOW});
  assert.equal(r.browser_binding_fresh,false);
  assert.equal(r.terminal_state,'BLOCKED_EXTERNAL');
  assert.equal(r.physical_evidence_current,false);
});

test('unsafe or non-PREPROD action evidence is rejected instead of producing a false FULL',()=>{
  const cases=[
    action({environment:'PROD'}),
    action({prod_mutation:true}),
    action({public_mutation:true}),
    action({trading_access:true}),
    action({customer_data_used:true}),
    action({incremental_cost_eur:1}),
    action({bounded:false}),
    action({fail_closed:false}),
    action({operation_kind:'ROUTINE_MUTATION'})
  ];
  for(const observation of cases){
    const r=evaluateB17BrowserPhysicalGates({browser_attestation:attestation(),action_observation:observation},{now:NOW});
    assert.equal(r.action_observation_valid,false);
    assert.equal(r.terminal_state,'BLOCKED_EXTERNAL');
    assert.equal(r.human_required,null);
  }
});

test('unexpected evidence fields are rejected so raw secrets cannot become accepted physical proof',()=>{
  const r=evaluateB17BrowserPhysicalGates({
    browser_attestation:attestation(),
    action_observation:{...action(),access_token:'forbidden'}
  },{now:NOW});
  assert.equal(r.action_observation_status,'UNSUPPORTED_OR_SENSITIVE_ACTION_EVIDENCE_FIELDS');
  assert.equal(r.action_observation_valid,false);
  assert.equal(r.terminal_state,'BLOCKED_EXTERNAL');
});
