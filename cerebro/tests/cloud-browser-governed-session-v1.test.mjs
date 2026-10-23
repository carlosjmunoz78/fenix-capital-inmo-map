import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareGovernedBrowserJob} from '../runtime/cloud-browser-governed-session-v1.mjs';

const now=Date.parse('2026-10-23T08:00:00.000Z');
const base={
  company_id:'fenix',identity_id:'carlos-office',environment:'PROD',engine_id:'AUTO-001',
  operation:{kind:'AUTHENTICATED_OBSERVE'},
  engine_authority:{browser_use_authorized:true,session_binding_authorized:false},
  actions:[{type:'NAVIGATE',url:'https://fenixcapital.es/wp-admin/'}]
};
const bundle={
  schema_version:'1.0.0',bundle_id:'sess-001',company_id:'fenix',identity_id:'carlos-office',environment:'PROD',version:'v1',
  issued_at:'2026-10-23T07:00:00.000Z',expires_at:'2026-10-24T07:00:00.000Z',revoked:false,
  allowed_origins:['https://fenixcapital.es'],
  transport:{encrypted:true,plaintext_secret_material:false,secret_ref:'vault://fenix/prod/browser/carlos-office'},
  attestation:{fresh:true,fingerprint:'sha256:test',bound_profile_id:'fenix-carlos-office-PROD'}
};

test('authenticated browser job cannot run without a real session bundle',()=>{
  const r=prepareGovernedBrowserJob(base,now);
  assert.equal(r.ok,false);
  assert.equal(r.session_binding.status,'HOLD_SESSION_BUNDLE_REQUIRED');
});

test('valid session bundle derives session authority and strips bundle before worker execution',()=>{
  const r=prepareGovernedBrowserJob({...base,session_bundle:bundle},now);
  assert.equal(r.ok,true);
  assert.equal(r.session_binding.status,'AUTHORIZED');
  assert.equal(r.job.engine_authority.session_binding_authorized,true);
  assert.equal(r.job.browser_profile_id,'fenix-carlos-office-PROD');
  assert.equal('session_bundle' in r.job,false);
});

test('wrong-origin session is rejected before Playwright is launched',()=>{
  const r=prepareGovernedBrowserJob({...base,actions:[{type:'NAVIGATE',url:'https://example.com/admin'}],session_bundle:bundle},now);
  assert.equal(r.ok,false);
  assert.equal(r.session_binding.status,'HOLD_SESSION_ORIGIN_DENIED');
});

test('ordinary public observation preserves existing worker path without session material',()=>{
  const job={...base,operation:{kind:'OBSERVE'},actions:[{type:'NAVIGATE',url:'https://fenixcapital.es/'}]};
  const r=prepareGovernedBrowserJob(job,now);
  assert.equal(r.ok,true);
  assert.equal(r.job,job);
  assert.equal(r.session_binding,null);
});

test('authenticated routine mutation can explicitly require the same session binding',()=>{
  const r=prepareGovernedBrowserJob({...base,operation:{kind:'ROUTINE_MUTATION',authenticated_session_required:true},session_bundle:bundle},now);
  assert.equal(r.ok,true);
  assert.equal(r.job.engine_authority.session_binding_authorized,true);
});
