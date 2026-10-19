import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UNIVERSAL_DEVICE_HUMAN_REQUIRED,
  authorizeUniversalDeviceEnvelopeV2,
  buildSanitizedUniversalDeviceReceiptV2,
  claimUniversalDeviceEnvelopeV2,
  resolveCanonicalDeviceIdentity,
  validateUniversalDeviceEnvelopeV2,
  wrapLegacyTransportProfile
} from '../runtime/universal-device-command-envelope-v2.mjs';

const NOW='2026-10-19T12:00:00.000Z';
const IDENTITY={canonical_device_id:'desktop-4c008d88919f',device_aliases:['desktop-74ca87506edbd7a5']};
function envelope(overrides={}){
  return {
    request_id:'req-001',idempotency_key:'idem-001',issued_at:'2026-10-19T11:59:00.000Z',expires_at:'2026-10-19T12:09:00.000Z',
    device_id:'desktop-4c008d88919f',company_id:'fenix',venture_id:'capital',engine_id:'AUTO-001',environment:'PREPROD',version:'2.0.0',capability:'DEVICE_EXECUTE',action:'SYNTHETIC_TEST',credential_refs:['vault://fenix/preprod/test'],
    policy:{policy_id:'UDV2-PREPROD',allowed_company_ids:['fenix','aion'],allowed_venture_ids:['capital','operator'],allowed_engine_ids:['AUTO-001'],allowed_environments:['PREPROD'],allowed_versions:['2.0.0'],allowed_capabilities:['DEVICE_EXECUTE'],allowed_actions:['SYNTHETIC_TEST'],prod_allowed:false,trading_allowed:false,state_changing:true},
    ...overrides
  };
}

test('canonical human exception vocabulary remains exact',()=>{
  assert.deepEqual(UNIVERSAL_DEVICE_HUMAN_REQUIRED,['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
});

test('valid PREPROD envelope authorizes dynamic scope independent of legacy profile tenant metadata',()=>{
  const legacy={profile_id:'Default',company_id:'fenix',venture_id:'legacy',environment:'LAB',device_id:'desktop-4c008d88919f',gateway_url:'http://localhost',credential_ref:'vault://transport',active:true};
  const e=envelope({company_id:'aion',venture_id:'operator'});
  const result=authorizeUniversalDeviceEnvelopeV2(e,{now:NOW,identity:IDENTITY,legacy_profile:legacy});
  assert.equal(result.decision,'AUTHORIZED_PREPROD');
  assert.equal(result.scope.company_id,'aion');
  assert.equal(result.scope.venture_id,'operator');
  assert.equal(result.scope.environment,'PREPROD');
  assert.equal(result.scope.version,'2.0.0');
  assert.equal(wrapLegacyTransportProfile(legacy).tenant_authority,false);
});

test('device alias resolves to canonical without rewriting the presented identity',()=>{
  const resolved=resolveCanonicalDeviceIdentity('desktop-74ca87506edbd7a5',IDENTITY);
  assert.equal(resolved.canonical_device_id,'desktop-4c008d88919f');
  assert.equal(resolved.matched_by,'ALIAS');
  const result=authorizeUniversalDeviceEnvelopeV2(envelope({device_id:'desktop-74ca87506edbd7a5'}),{now:NOW,identity:IDENTITY});
  assert.equal(result.canonical_device_id,'desktop-4c008d88919f');
  assert.equal(result.identity_match,'ALIAS');
});

test('unknown device identity fails closed as HOLD rather than throwing',()=>{
  const result=authorizeUniversalDeviceEnvelopeV2(envelope({device_id:'desktop-not-authorized'}),{now:NOW,identity:IDENTITY});
  assert.equal(result.decision,'HOLD');
  assert.deepEqual(result.blockers,['device_scope_denied']);
});

test('PROD and unknown environment fail closed',()=>{
  assert.ok(validateUniversalDeviceEnvelopeV2(envelope({environment:'PROD'}),{now:NOW}).errors.includes('prod_context_not_allowed'));
  assert.ok(validateUniversalDeviceEnvelopeV2(envelope({environment:'DEV'}),{now:NOW}).errors.includes('invalid:environment'));
});

test('policy explicitly constrains environment and version',()=>{
  const lab=envelope({environment:'LAB',policy:{...envelope().policy,allowed_environments:['PREPROD']}});
  const deniedEnvironment=authorizeUniversalDeviceEnvelopeV2(lab,{now:NOW,identity:IDENTITY});
  assert.equal(deniedEnvironment.decision,'HOLD');
  assert.ok(deniedEnvironment.blockers.includes('environment_scope_denied'));
  const deniedVersion=authorizeUniversalDeviceEnvelopeV2(envelope({version:'2.1.0'}),{now:NOW,identity:IDENTITY});
  assert.equal(deniedVersion.decision,'HOLD');
  assert.ok(deniedVersion.blockers.includes('version_scope_denied'));
});

test('policy is mandatory, wildcards are forbidden and cross-tenant scope is denied',()=>{
  const missing=envelope();delete missing.policy;
  assert.equal(validateUniversalDeviceEnvelopeV2(missing,{now:NOW}).ok,false);
  const wildcard=validateUniversalDeviceEnvelopeV2(envelope({policy:{...envelope().policy,allowed_company_ids:['*']}}),{now:NOW});
  assert.ok(wildcard.errors.includes('wildcard_forbidden:policy.allowed_company_ids'));
  const result=authorizeUniversalDeviceEnvelopeV2(envelope(),{now:NOW,identity:IDENTITY,expected_company_id:'aion'});
  assert.equal(result.decision,'HOLD');
  assert.ok(result.blockers.includes('tenant_isolation_violation'));
});

test('raw secrets are rejected but credential references are allowed',()=>{
  const bad=validateUniversalDeviceEnvelopeV2(envelope({payload:{password:'nope'}}),{now:NOW});
  assert.equal(bad.ok,false);assert.ok(bad.errors.some(x=>x.startsWith('raw_secret_forbidden:')));
  const good=validateUniversalDeviceEnvelopeV2(envelope({credential_ref:'vault://fenix/preprod/one'}),{now:NOW});
  assert.equal(good.ok,true);
});

test('expired, long-lived and future envelopes are rejected',()=>{
  assert.ok(validateUniversalDeviceEnvelopeV2(envelope({expires_at:'2026-10-19T11:59:30.000Z'}),{now:NOW}).errors.includes('envelope_expired'));
  assert.ok(validateUniversalDeviceEnvelopeV2(envelope({issued_at:'2026-10-19T12:10:00.000Z',expires_at:'2026-10-19T12:11:00.000Z'}),{now:NOW}).errors.includes('issued_in_future'));
  assert.ok(validateUniversalDeviceEnvelopeV2(envelope({issued_at:'2026-10-19T11:00:00.000Z',expires_at:'2026-10-19T12:10:00.000Z'}),{now:NOW}).errors.includes('time_window_too_long'));
});

test('replay request id is rejected; same idempotency and same payload returns cached result',()=>{
  const ledger=new Map();
  const first=claimUniversalDeviceEnvelopeV2(envelope(),ledger,{now:NOW,identity:IDENTITY});
  assert.equal(first.decision,'CLAIMED');assert.equal(first.ledger_action,'EXECUTE_ONCE');
  const exactReplay=claimUniversalDeviceEnvelopeV2(envelope(),ledger,{now:NOW,identity:IDENTITY});
  assert.equal(exactReplay.ledger_action,'REPLAY_REJECTED');
  const retry=claimUniversalDeviceEnvelopeV2(envelope({request_id:'req-002'}),ledger,{now:NOW,identity:IDENTITY});
  assert.equal(retry.decision,'IDEMPOTENT_REPLAY');assert.equal(retry.ledger_action,'RETURN_CACHED');
});

test('reusing idempotency key for different payload is rejected',()=>{
  const ledger=new Map();claimUniversalDeviceEnvelopeV2(envelope(),ledger,{now:NOW,identity:IDENTITY});
  const conflict=claimUniversalDeviceEnvelopeV2(envelope({request_id:'req-003',action:'OTHER_ACTION',policy:{...envelope().policy,allowed_actions:['OTHER_ACTION']}}),ledger,{now:NOW,identity:IDENTITY});
  assert.equal(conflict.ledger_action,'IDEMPOTENCY_CONFLICT');
});

test('only canonical HUMAN_REQUIRED reasons are accepted in policy',()=>{
  const good=authorizeUniversalDeviceEnvelopeV2(envelope({policy:{...envelope().policy,human_required:'HIGH_RISK'}}),{now:NOW,identity:IDENTITY});
  assert.equal(good.decision,'HUMAN_REQUIRED');assert.equal(good.human_required,'HIGH_RISK');
  const bad=validateUniversalDeviceEnvelopeV2(envelope({policy:{...envelope().policy,human_required:'MFA_REQUIRED'}}),{now:NOW});
  assert.ok(bad.errors.includes('invalid:policy.human_required'));
});

test('state-changing execution cannot be PASS without semantic readback',()=>{
  const claim=claimUniversalDeviceEnvelopeV2(envelope(),new Map(),{now:NOW,identity:IDENTITY});
  const partial=buildSanitizedUniversalDeviceReceiptV2({envelope:envelope(),claim,result:{ok:true}});
  assert.equal(partial.status,'PARCIAL_SEMANTIC_READBACK_REQUIRED');
  const pass=buildSanitizedUniversalDeviceReceiptV2({envelope:envelope(),claim,result:{ok:true,semantic_readback:{verified:true,kind:'TEXT_EQUALS',evidence_ref:'evidence://synthetic/1'}}});
  assert.equal(pass.status,'PASS');assert.equal(pass.prod_authorized,false);assert.equal(pass.trading_access,false);
  assert.deepEqual(pass.credential_refs,['vault://fenix/preprod/test']);
  assert.equal(JSON.stringify(pass).includes('password'),false);
});
