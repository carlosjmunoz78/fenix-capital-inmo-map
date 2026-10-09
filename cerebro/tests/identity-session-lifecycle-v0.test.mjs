import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLifecycleState,evaluateBrowserAttestation,evaluateCredentialLifecycle,IAM001_LIFECYCLE_CONTRACT,lifecycleUseDecision} from '../governance/identity-session-lifecycle.mjs';

const now='2026-10-09T07:00:00Z';
const exp=Math.floor(Date.parse('2026-10-09T08:00:00Z')/1000);
function observations(overrides={}){
  return {observed_at:now,credential_refs:{
    'credref:prod-supabase-publishable-key':{present:true},'credref:prod-supabase-legacy-anon-jwt':{present:true},'credref:cerebro-e2e-user-jwt':{present:true,exp_unix:exp},'credref:notion-token':{present:true},'credref:cerebro-gemini-api-key':{present:true},'credref:cerebro-mail-username':{present:true},'credref:cerebro-mail-password':{present:true},'credref:cerebro-owner-email':{present:true},...overrides}};
}

test('credential lifecycle reports only metadata and healthy valid E2E expiry',()=>{
  const r=evaluateCredentialLifecycle(observations(),{now});
  assert.equal(r.credential_health['credref:github-actions-token'].status,'HEALTHY_PROVIDER_MANAGED');
  assert.equal(r.credential_health['credref:cerebro-e2e-user-jwt'].status,'HEALTHY_VALID_UNTIL');
  assert.equal(r.credential_health['credref:cerebro-e2e-user-jwt'].ttl_seconds,3600);
  assert.equal(r.credential_health['credref:cerebro-e2e-user-jwt'].secret_value_observed,false);
  assert.deepEqual(r.holds,[]);
  assert.equal(r.human_required,null);
});

test('expired missing and malformed metadata HOLD only the affected registered consumers',()=>{
  const expired=evaluateCredentialLifecycle(observations({'credref:cerebro-e2e-user-jwt':{present:true,exp_unix:1}}),{now});
  assert.equal(expired.credential_health['credref:cerebro-e2e-user-jwt'].status,'HOLD_EXPIRED');
  assert.equal(lifecycleUseDecision({credential_ref_id:'credref:cerebro-e2e-user-jwt',state:{credential_health:expired.credential_health}}).ok,false);
  const missing=evaluateCredentialLifecycle(observations({'credref:notion-token':{present:false}}),{now});
  assert.equal(missing.credential_health['credref:notion-token'].status,'HOLD_MISSING_REFERENCE');
  assert.equal(missing.credential_health['credref:prod-supabase-publishable-key'].usable,true);
  const bad=evaluateCredentialLifecycle(observations({'credref:cerebro-e2e-user-jwt':{present:true,exp_unix:null}}),{now});
  assert.equal(bad.credential_health['credref:cerebro-e2e-user-jwt'].status,'HOLD_INVALID_EXPIRY_METADATA');
});

test('near expiry remains usable for the current call but explicitly requires rotation',()=>{
  const near=Math.floor(Date.parse('2026-10-09T07:10:00Z')/1000);
  const r=evaluateCredentialLifecycle(observations({'credref:cerebro-e2e-user-jwt':{present:true,exp_unix:near}}),{now});
  assert.equal(r.credential_health['credref:cerebro-e2e-user-jwt'].status,'DEGRADED_NEAR_EXPIRY');
  assert.equal(lifecycleUseDecision({credential_ref_id:'credref:cerebro-e2e-user-jwt',state:{credential_health:r.credential_health}}).decision,'ALLOW_CURRENT_USE_ROTATION_DUE');
});

test('fresh browser attestation can prove LAB/PREPROD binding without persisting raw device/profile ids',()=>{
  const b=evaluateBrowserAttestation({environment:'PREPROD',device_id:'desktop-local-123',profile_id:'Default',paired:true,online:true,kill_switch_enabled:true,cloud_transport_status:'ONLINE',chrome_running:true,attested_at:'2026-10-09T06:59:00Z'},{now});
  assert.equal(b.status,'BROWSER_SESSION_BINDING_HEALTHY');
  assert.equal(b.device_id_hash.length,64);assert.equal(b.profile_id_hash.length,64);
  assert.equal('device_id' in b,false);assert.equal('profile_id' in b,false);
  assert.equal(b.prod_authorized,false);assert.equal(b.trading_access,false);
});

test('browser attestation fails closed when stale, offline, kill switch absent or environment is PROD',()=>{
  assert.equal(evaluateBrowserAttestation({environment:'PREPROD',device_id:'d',profile_id:'p',paired:true,online:true,kill_switch_enabled:true,cloud_transport_status:'ONLINE',chrome_running:true,attested_at:'2026-10-09T06:00:00Z'},{now}).status,'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT');
  assert.equal(evaluateBrowserAttestation({environment:'PREPROD',device_id:'d',profile_id:'p',paired:true,online:false,kill_switch_enabled:true,cloud_transport_status:'ONLINE',chrome_running:true,attested_at:'2026-10-09T06:59:00Z'},{now}).status,'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT');
  assert.equal(evaluateBrowserAttestation({environment:'PREPROD',device_id:'d',profile_id:'p',paired:true,online:true,kill_switch_enabled:false,cloud_transport_status:'ONLINE',chrome_running:true,attested_at:'2026-10-09T06:59:00Z'},{now}).status,'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT');
  assert.equal(evaluateBrowserAttestation({environment:'PROD',device_id:'d',profile_id:'p',paired:true,online:true,kill_switch_enabled:true,cloud_transport_status:'ONLINE',chrome_running:true,attested_at:'2026-10-09T06:59:00Z'},{now}).status,'HOLD_BROWSER_ENVIRONMENT_DENIED');
});

test('kill switch disables a credential reference independently of health',()=>{
  const r=evaluateCredentialLifecycle(observations(),{now});
  const state={credential_health:r.credential_health,disabled_credential_refs:['credref:cerebro-gemini-api-key']};
  assert.equal(lifecycleUseDecision({credential_ref_id:'credref:cerebro-gemini-api-key',state}).decision,'DENY_KILL_SWITCH_DISABLED');
  assert.equal(lifecycleUseDecision({credential_ref_id:'credref:notion-token',state}).ok,true);
});

test('raw JWT/secret fields are rejected and no lifecycle failure is silently promoted to HUMAN_REQUIRED',()=>{
  assert.throws(()=>evaluateCredentialLifecycle({...observations(),access_token:'eyJAAAAAAAAAAAA.BBBBBBBBBBBB.CCCCCCCCCC'},{now}),/raw credential material forbidden/);
  const r=evaluateCredentialLifecycle(observations({'credref:notion-token':{present:false}}),{now});
  assert.equal(r.human_required,null);
  assert.equal(IAM001_LIFECYCLE_CONTRACT.human_notification,false);
  assert.equal(IAM001_LIFECYCLE_CONTRACT.captcha_bypass,false);
  assert.equal(IAM001_LIFECYCLE_CONTRACT.mfa_bypass,false);
});

test('persistent state preserves kill switches and remains authority safe',()=>{
  const state=buildLifecycleState({previous_state:{disabled_credential_refs:['credref:notion-token'],disabled_connector_ids:['connector:notion-private-doc-read'],disabled_identity_ids:[]},observations:observations(),now,source_run_id:123});
  assert.deepEqual(state.disabled_credential_refs,['credref:notion-token']);
  assert.equal(state.browser_session_binding.status,'HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT');
  assert.equal(state.prod_authorized,false);assert.equal(state.prod_write_authorized,false);assert.equal(state.trading_access,false);assert.equal(state.multicompany_continuation,false);assert.equal(state.additional_cost_eur,0);
});
