import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const load=(rel)=>JSON.parse(fs.readFileSync(new URL(rel,import.meta.url),'utf8'));
const base=load('../registry/compet-real-targets.v0.json');
const acceptance=load('../registry/compet-real-targets-acceptance.v1.json');

test('acceptance is additive over preserved V0 rather than rewriting it',()=>{
  assert.equal(base.status,'REAL_TARGETS_BASELINE_FROZEN_CONTINUOUS_PREPROD');
  assert.equal(base.scheduler.soak_complete,false);
  assert.equal(acceptance.base_registry_ref,'cerebro/registry/compet-real-targets.v0.json');
  assert.equal(acceptance.base_registry_policy,'PRESERVE_IMMUTABLE_EXISTING_V0_CONTRACT');
  assert.equal(acceptance.status,'REAL_TARGETS_CONTINUOUS_PREPROD_ACCEPTANCE_GREEN');
  assert.equal(acceptance.resilience.base_runtime_modified,false);
});

test('three genuine scheduled green runs certify acceptance with no manual substitution',()=>{
  const s=acceptance.scheduled_acceptance;
  assert.equal(s.required_runs,3);
  assert.equal(s.verified_scheduled_green_runs,3);
  assert.equal(s.missing_scheduled_green_runs,0);
  assert.equal(s.qualifying_run_ids.length,3);
  assert.equal(new Set(s.qualifying_run_ids).size,3);
  assert.equal(s.manual_or_dispatch_substitution,false);
  assert.equal(s.distinct_run_ids_verified,true);
  assert.equal(acceptance.remaining_gate,null);
});

test('resilience is wrapper-only bounded transient retry',()=>{
  assert.equal(acceptance.resilience.wrapper_ref,'cerebro/runtime/compet-real-targets-resilient-v1.mjs');
  assert.equal(acceptance.resilience.base_runtime_ref,'cerebro/runtime/compet-real-targets-v0.mjs');
  assert.equal(acceptance.resilience.transient_retry_only,true);
  assert.equal(acceptance.resilience.max_attempts,3);
  assert.equal(acceptance.resilience.non_transient_fail_closed,true);
  assert.equal(acceptance.resilience.provider_write_on_retry,false);
});

test('acceptance grants no PROD, provider, CRM, customer-data, install, spend or Trading authority',()=>{
  const a=acceptance.authority;
  for(const key of ['prod_authorized','prod_write_authorized','provider_write_authorized','crm_write_authorized','customer_data_authorized','external_dependency_install_authorized','trading_access','automatic_paid_fallback'])assert.equal(a[key],false,key);
  assert.equal(a.additional_cost_eur,0);
  assert.equal(acceptance.additional_cost_eur,0);
});
