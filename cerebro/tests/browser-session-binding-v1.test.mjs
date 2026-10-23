import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateBrowserSessionBinding,getBrowserSessionBindingDefaults} from '../runtime/browser-session-binding-v1.mjs';

const now = Date.parse('2026-10-23T08:00:00.000Z');
const request = {
  company_id:'fenix',
  identity_id:'carlos-office',
  environment:'PROD',
  browser_profile_id:'fenix-carlos-office-PROD',
  target_url:'https://fenixcapital.es/wp-admin/'
};
const bundle = {
  schema_version:'1.0.0',
  bundle_id:'sess-001',
  company_id:'fenix',
  identity_id:'carlos-office',
  environment:'PROD',
  version:'v1',
  issued_at:'2026-10-23T07:00:00.000Z',
  expires_at:'2026-10-24T07:00:00.000Z',
  revoked:false,
  allowed_origins:['https://fenixcapital.es'],
  transport:{encrypted:true,plaintext_secret_material:false,secret_ref:'vault://fenix/prod/browser/carlos-office'},
  attestation:{fresh:true,fingerprint:'sha256:test',bound_profile_id:'fenix-carlos-office-PROD'}
};

test('valid encrypted same-scope session binding is authorized without creating action authority',()=>{
  const r=evaluateBrowserSessionBinding({bundle,request,now});
  assert.equal(r.status,'AUTHORIZED');
  assert.equal(r.session_binding_authorized,true);
  assert.equal(r.authority_created_by_session_binding,false);
  assert.equal(r.secret_material_exposed,false);
  assert.equal(r.target_origin,'https://fenixcapital.es');
});

test('cross company identity and environment bindings fail closed',()=>{
  assert.equal(evaluateBrowserSessionBinding({bundle:{...bundle,company_id:'other'},request,now}).status,'HOLD_SESSION_COMPANY_MISMATCH');
  assert.equal(evaluateBrowserSessionBinding({bundle:{...bundle,identity_id:'other'},request,now}).status,'HOLD_SESSION_IDENTITY_MISMATCH');
  assert.equal(evaluateBrowserSessionBinding({bundle:{...bundle,environment:'PREPROD'},request,now}).status,'HOLD_SESSION_ENVIRONMENT_MISMATCH');
});

test('expired revoked overlong and not-yet-valid sessions fail closed',()=>{
  assert.equal(evaluateBrowserSessionBinding({bundle:{...bundle,expires_at:'2026-10-23T07:30:00.000Z'},request,now}).status,'HOLD_SESSION_EXPIRED');
  assert.equal(evaluateBrowserSessionBinding({bundle:{...bundle,revoked:true},request,now}).status,'HOLD_SESSION_REVOKED');
  assert.equal(evaluateBrowserSessionBinding({bundle:{...bundle,expires_at:'2026-11-15T07:00:00.000Z'},request,now}).status,'HOLD_SESSION_TTL_EXCEEDS_POLICY');
  assert.equal(evaluateBrowserSessionBinding({bundle:{...bundle,issued_at:'2026-10-23T09:00:01.000Z',expires_at:'2026-10-24T09:00:01.000Z'},request,now}).status,'HOLD_SESSION_NOT_YET_VALID');
});

test('plaintext or missing secret reference is rejected',()=>{
  assert.equal(evaluateBrowserSessionBinding({bundle:{...bundle,transport:{encrypted:false,plaintext_secret_material:true,secret_ref:'x'}},request,now}).status,'HOLD_SESSION_TRANSPORT_NOT_ENCRYPTED');
  assert.equal(evaluateBrowserSessionBinding({bundle:{...bundle,transport:{encrypted:true,plaintext_secret_material:false}},request,now}).status,'HOLD_SESSION_SECRET_REFERENCE_MISSING');
});

test('origin profile and attestation are exact and fail closed',()=>{
  assert.equal(evaluateBrowserSessionBinding({bundle,request:{...request,target_url:'https://example.com'},now}).status,'HOLD_SESSION_ORIGIN_DENIED');
  assert.equal(evaluateBrowserSessionBinding({bundle,request:{...request,browser_profile_id:'wrong'},now}).status,'HOLD_SESSION_PROFILE_MISMATCH');
  assert.equal(evaluateBrowserSessionBinding({bundle:{...bundle,attestation:{...bundle.attestation,fresh:false}},request,now}).status,'HOLD_SESSION_ATTESTATION_NOT_FRESH');
});

test('defaults explicitly prohibit plaintext and cross-scope reuse',()=>{
  const d=getBrowserSessionBindingDefaults();
  assert.equal(d.plaintext_secrets_allowed,false);
  assert.equal(d.cross_company_allowed,false);
  assert.equal(d.cross_identity_allowed,false);
  assert.equal(d.cross_environment_allowed,false);
  assert.equal(d.exact_origin_allowlist_required,true);
});
