import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const policy=JSON.parse(fs.readFileSync(new URL('../registry/browser1-access-policy.v1.json',import.meta.url),'utf8'));

test('Browser 1 is a transversal tool and never a new authority source',()=>{
  assert.equal(policy.capability_id,'BROWSER-1');
  assert.equal(policy.transversal_tool,true);
  assert.equal(policy.logical_engine,false);
  assert.equal(policy.authority_model.browser_never_grants_new_authority,true);
  assert.equal(policy.authority_model.origin_engine_authority_required,true);
  assert.equal(policy.authority_model.prod_mutation_requires_origin_engine_prod_authority,true);
});

test('Browser 1 initial limits match the serial V1 runtime',()=>{
  assert.deepEqual(policy.initial_limits,{
    max_active_sessions:1,
    max_registered_sessions:64,
    max_tabs_per_session:8,
    max_actions_per_job:50,
    default_action_timeout_ms:30000,
    execution_model:'SINGLE_ACTIVE_SESSION_SERIAL'
  });
});

test('same-company account isolation is explicit and plaintext secrets are forbidden',()=>{
  assert.equal(policy.session_scope.multiple_accounts_same_company_supported,true);
  assert.deepEqual(policy.session_scope.keys,['company_id','identity_id','account_id','environment','browser_profile_id']);
  assert.equal(policy.session_scope.cross_company_denied,true);
  assert.equal(policy.session_scope.cross_environment_denied,true);
  assert.equal(policy.session_scope.encrypted_session_material_required_for_authenticated_use,true);
  assert.equal(policy.session_scope.plaintext_secret_material_forbidden,true);
});

test('orchestrator and viewer are intentionally outside Browser 1 V1',()=>{
  assert.equal(policy.deferred_to_next_steps.orchestrator_pool,false);
  assert.equal(policy.deferred_to_next_steps.parallel_active_sessions,false);
  assert.equal(policy.deferred_to_next_steps.live_viewer,false);
  assert.equal(policy.deferred_to_next_steps.human_takeover_ui,false);
  assert.equal(policy.cost.additional_cost_eur,0);
});

test('bypass classes remain forbidden',()=>{
  assert.equal(policy.authority_model.captcha_bypass_forbidden,true);
  assert.equal(policy.authority_model.mfa_bypass_forbidden,true);
  assert.equal(policy.authority_model.anti_abuse_bypass_forbidden,true);
});
