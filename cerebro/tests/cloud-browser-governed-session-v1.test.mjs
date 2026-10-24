import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {prepareGovernedBrowserJob,createGovernedCloudBrowserWorker} from '../runtime/cloud-browser-governed-session-v1.mjs';

const PHYSICAL_BROWSER_E2E = process.env.CEREBRO_PHYSICAL_BROWSER_E2E === '1';
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
  transport:{encrypted:true,plaintext_secret_material:false,secret_ref:'env://CEREBRO_TEST_SESSION'},
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

test('every explicit navigation in an authenticated job must remain in allowed origins',()=>{
  const r=prepareGovernedBrowserJob({...base,actions:[
    {type:'NAVIGATE',url:'https://fenixcapital.es/wp-admin/'},
    {type:'OPEN_TAB',url:'https://example.com/' }
  ],session_bundle:bundle},now);
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

test('fully authorized session job still fails closed before browser launch when secret resolver is absent',async()=>{
  const worker=createGovernedCloudBrowserWorker();
  const liveBundle={
    ...bundle,
    issued_at:new Date(Date.now()-60_000).toISOString(),
    expires_at:new Date(Date.now()+60*60*1000).toISOString()
  };
  const result=await worker.execute({
    ...base,
    session_bundle:liveBundle,
    canonical_engine_ids:['AUTO-001'],
    kill_switch_enabled:true,
    browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true}
  });
  assert.equal(result.ok,false);
  assert.equal(result.authorization.status,'HOLD_SESSION_SECRET_RESOLVER_REQUIRED');
});

async function authFixture() {
  const server=http.createServer((req,res)=>{
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
    res.end(`<!doctype html><html><body><div id="auth"></div><script>
      document.querySelector('#auth').textContent=(document.cookie.includes('cerebroAuth=YES')?'COOKIE_OK':'COOKIE_NO')+'|'+(localStorage.getItem('cerebroToken')||'LOCAL_NO');
    </script></body></html>`);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  return {server,baseUrl:`http://127.0.0.1:${address.port}`};
}

test('governed wrapper physically restores synthetic authenticated state before Chromium actions', {timeout:90_000,skip:PHYSICAL_BROWSER_E2E?false:'DEDICATED_PHYSICAL_BROWSER_GATE_ONLY'}, async()=>{
  const {server,baseUrl}=await authFixture();
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cerebro-governed-auth-'));
  const issued=new Date(Date.now()-60_000).toISOString();
  const expires=new Date(Date.now()+60*60*1000).toISOString();
  const profile='fenix-synthetic-PREPROD';
  const liveBundle={
    schema_version:'1.0.0',bundle_id:'synthetic-live',company_id:'fenix',identity_id:'synthetic',environment:'PREPROD',version:'v1',
    issued_at:issued,expires_at:expires,revoked:false,allowed_origins:[baseUrl],
    transport:{encrypted:true,plaintext_secret_material:false,secret_ref:'env://SYNTHETIC_SESSION'},
    attestation:{fresh:true,fingerprint:'sha256:synthetic-live',bound_profile_id:profile}
  };
  const storageState={
    cookies:[{name:'cerebroAuth',value:'YES',domain:'127.0.0.1',path:'/',expires:-1,httpOnly:false,secure:false,sameSite:'Lax'}],
    origins:[{origin:baseUrl,localStorage:[{name:'cerebroToken',value:'LOCAL_OK'}]}]
  };
  const audits=[];
  try {
    const worker=createGovernedCloudBrowserWorker({
      profiles_root:path.join(temp,'profiles'),artifacts_root:path.join(temp,'artifacts'),headless:true,
      audit_sink:async e=>audits.push(e),
      secret_resolver:async(ref)=>{
        assert.equal(ref,'env://SYNTHETIC_SESSION');
        return {storage_state:storageState,secret_ref:ref};
      }
    });
    const result=await worker.execute({
      request_id:'req-governed-live',audit_id:'audit-governed-live',
      company_id:'fenix',identity_id:'synthetic',environment:'PREPROD',browser_profile_id:profile,
      profile_scope:{company_id:'fenix',identity_id:'synthetic',environment:'PREPROD'},
      engine_id:'AUTO-001',canonical_engine_ids:['AUTO-001'],kill_switch_enabled:true,
      browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true},
      operation:{kind:'AUTHENTICATED_OBSERVE',incremental_spend_eur:0},
      engine_authority:{browser_use_authorized:true,session_binding_authorized:false},
      session_bundle:liveBundle,
      actions:[{type:'NAVIGATE',url:baseUrl},{type:'EXTRACT_TEXT',target:{selector:'#auth'}}],
      capture_final_evidence:false
    });
    assert.equal(result.ok,true);
    assert.equal(result.session_materialized,true);
    assert.equal(result.results[1],'COOKIE_OK|LOCAL_OK');
    assert.ok(audits.some(e=>e.type==='BROWSER_STORAGE_STATE_RESTORED'&&e.secret_material_logged===false));
  } finally {
    await new Promise(resolve=>server.close(resolve));
    await fs.rm(temp,{recursive:true,force:true});
  }
});
