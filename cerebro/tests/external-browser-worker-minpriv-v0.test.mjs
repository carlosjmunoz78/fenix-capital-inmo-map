import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXTERNAL_BROWSER_WORKER_ACTIONS,
  EXTERNAL_BROWSER_WORKER_FORBIDDEN_ACTIONS,
  externalBrowserWorkerManifest,
  planExternalBrowserWorkerOperation
} from '../runtime/external-browser-worker-minpriv-v0.mjs';

const NOW='2026-11-01T14:30:00.000Z';
function context(overrides={}){
  return {
    company_id:'fenix',engine_id:'COMP-001',environment:'PREPROD',version:'0.1.0',
    binding:{identity_ref:'identity:fenix:carlos',account_ref:'account:github:carlos',session_ref:'session:browser:preprod',browser_profile_ref:'browser:office:default'},
    browser_attestation:{environment:'PREPROD',device_id:'desktop-test',profile_id:'Default',paired:true,online:true,kill_switch_enabled:true,cloud_transport_status:'ONLINE',chrome_running:true,attested_at:NOW},
    binding_evidence_ref:'evidence://browser-binding/preprod/test',
    ...overrides
  };
}

test('manifest is PREPROD-only, zero-cost, fail-closed and does not replace the existing GitHub worker',()=>{
  const manifest=externalBrowserWorkerManifest();
  assert.equal(manifest.environment,'PREPROD');
  assert.equal(manifest.additional_cost_eur,0);
  assert.equal(manifest.prod_authorized,false);
  assert.equal(manifest.prod_write_authorized,false);
  assert.equal(manifest.enqueue_authorized,false);
  assert.equal(manifest.admin_authorized,false);
  assert.equal(manifest.trading_access,false);
  assert.equal(manifest.existing_github_worker_replaced,false);
  assert.equal(manifest.physical_operation_status,'POR_AUDITAR_REAL_PROFILE_SESSION_BINDING');
  assert.equal(manifest.next_gate,'REAL_PROFILE_SESSION_BINDING_VERIFIER');
  assert.deepEqual(manifest.allowed_actions,[
    'CLAIM_BROWSER_JOB','RENEW_BROWSER_JOB_LEASE','ACK_BROWSER_JOB','FAIL_BROWSER_JOB'
  ]);
});

test('PROD and LAB are denied because this candidate is PREPROD-only',()=>{
  for(const environment of ['PROD','LAB']){
    const result=planExternalBrowserWorkerOperation(context({environment,action:'CLAIM_BROWSER_JOB'}),{now:NOW});
    assert.equal(result.decision,'HOLD');
    assert.ok(result.blockers.includes('preprod_only'));
    assert.equal(result.execution_authorized,false);
  }
});

test('enqueue, queue administration, profile registration and PROD writes are explicitly forbidden',()=>{
  for(const action of EXTERNAL_BROWSER_WORKER_FORBIDDEN_ACTIONS){
    const result=planExternalBrowserWorkerOperation(context({action}),{now:NOW});
    assert.equal(result.decision,'DENY_FORBIDDEN_ACTION');
    assert.equal(result.policy_eligible,false);
    assert.equal(result.execution_authorized,false);
  }
});

test('only claim, renew, ack and fail are policy-eligible',()=>{
  for(const action of EXTERNAL_BROWSER_WORKER_ACTIONS){
    const result=planExternalBrowserWorkerOperation(context({action}),{now:NOW});
    assert.equal(result.decision,'READY_FOR_VERIFIED_BINDING_EXECUTOR');
    assert.equal(result.policy_eligible,true);
    assert.equal(result.execution_authorized,false);
    assert.equal(result.authority_scope,'CLAIM_RENEW_ACK_FAIL_ONLY');
    assert.equal(result.next_gate,'REAL_PROFILE_SESSION_BINDING_VERIFIER');
    assert.equal(result.prod_authorized,false);
    assert.equal(result.enqueue_authorized,false);
    assert.equal(result.admin_authorized,false);
  }
});

test('unknown operations stay outside the minimum privilege scope',()=>{
  const result=planExternalBrowserWorkerOperation(context({action:'DELETE_ALL_JOBS'}),{now:NOW});
  assert.equal(result.decision,'HOLD_ACTION_OUTSIDE_MINIMUM_SCOPE');
  assert.equal(result.policy_eligible,false);
  assert.equal(result.execution_authorized,false);
});

test('real identity/account/session/profile references are mandatory',()=>{
  const result=planExternalBrowserWorkerOperation(context({action:'CLAIM_BROWSER_JOB',binding:{identity_ref:'identity:fenix:carlos'}}),{now:NOW});
  assert.equal(result.decision,'HOLD_REAL_PROFILE_SESSION_BINDING_REQUIRED');
  assert.deepEqual(result.missing_binding_refs,['account_ref','session_ref','browser_profile_ref']);
  assert.equal(result.execution_authorized,false);
});

test('missing or stale browser attestation never grants policy eligibility',()=>{
  const missing=planExternalBrowserWorkerOperation(context({action:'CLAIM_BROWSER_JOB',browser_attestation:null}),{now:NOW});
  assert.equal(missing.decision,'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT');
  assert.equal(missing.policy_eligible,false);

  const stale=planExternalBrowserWorkerOperation(context({action:'CLAIM_BROWSER_JOB',browser_attestation:{environment:'PREPROD',device_id:'desktop-test',profile_id:'Default',paired:true,online:true,kill_switch_enabled:true,cloud_transport_status:'ONLINE',chrome_running:true,attested_at:'2026-10-01T00:00:00.000Z'}}),{now:NOW});
  assert.equal(stale.decision,'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT');
  assert.equal(stale.policy_eligible,false);
  assert.equal(stale.execution_authorized,false);
});

test('binding evidence reference is required even with a healthy attestation',()=>{
  const result=planExternalBrowserWorkerOperation(context({action:'ACK_BROWSER_JOB',binding_evidence_ref:''}),{now:NOW});
  assert.equal(result.decision,'HOLD_BINDING_EVIDENCE_REQUIRED');
  assert.equal(result.policy_eligible,false);
  assert.equal(result.execution_authorized,false);
});

test('raw secret material is rejected and never persisted into a plan',()=>{
  const result=planExternalBrowserWorkerOperation(context({action:'CLAIM_BROWSER_JOB',access_token:'eyJaaaaaaaaaaaa.bbbbbbbbbbbb.cccccc'}),{now:NOW});
  assert.equal(result.decision,'DENY_SECRET_MATERIAL');
  assert.equal(result.contains_secret_values,false);
  assert.equal(result.execution_authorized,false);
});

test('eligible plans expose only hashed binding references and stable plan ids',()=>{
  const input=context({action:'FAIL_BROWSER_JOB'});
  const first=planExternalBrowserWorkerOperation(input,{now:NOW});
  const second=planExternalBrowserWorkerOperation(input,{now:NOW});
  assert.equal(first.decision,'READY_FOR_VERIFIED_BINDING_EXECUTOR');
  assert.equal(first.plan_id,second.plan_id);
  assert.equal(first.policy_eligible,true);
  assert.equal(first.execution_authorized,false);
  assert.equal(first.identity_ref_hash.length,64);
  assert.equal(first.account_ref_hash.length,64);
  assert.equal(first.session_ref_hash.length,64);
  assert.equal(first.browser_profile_ref_hash.length,64);
  assert.equal(JSON.stringify(first).includes('identity:fenix:carlos'),false);
  assert.equal(JSON.stringify(first).includes('session:browser:preprod'),false);
});
