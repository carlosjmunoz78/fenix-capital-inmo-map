import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createBrowser1Tool, browser1ProfileId, BROWSER1_ACCESS_V1_CONTRACT } from '../runtime/browser1-access-v1.mjs';

const PHYSICAL = process.env.CEREBRO_PHYSICAL_BROWSER_E2E === '1';

function baseAuthority() {
  return {
    canonical_engine_ids:['TEST-001'],
    browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true},
    engine_authority:{
      browser_use_authorized:true,
      session_binding_authorized:false,
      operation_authorized:true,
      prod_mutation_authorized:false,
      promotion_gate_green:false,
      rollback_ready:true,
      observability_ready:true,
      audit_ready:true,
      idempotency_proven:true
    },
    kill_switch_enabled:true
  };
}

function session(session_id, account_id, identity_id='google-user') {
  const browser_profile_id=browser1ProfileId({company_id:'fenix',identity_id,account_id,environment:'PREPROD'});
  return {
    session_id,company_id:'fenix',identity_id,account_id,environment:'PREPROD',browser_profile_id,
    allowed_departments:['MARKETING','SEO'],
    session_bundle:{
      schema_version:'1.0.0',bundle_id:`bundle-${session_id}`,company_id:'fenix',identity_id,environment:'PREPROD',version:'v1',
      issued_at:'2026-10-23T07:00:00.000Z',expires_at:'2027-10-23T07:00:00.000Z',revoked:false,
      allowed_origins:['https://facebook.com','https://www.facebook.com','https://accounts.google.com'],
      transport:{encrypted:true,plaintext_secret_material:false,secret_ref:`env://SESSION_${session_id.toUpperCase().replace(/[^A-Z0-9]/g,'_')}`},
      attestation:{fresh:true,fingerprint:`sha256:${session_id}`,bound_profile_id:browser_profile_id}
    }
  };
}

test('Browser 1 contract starts deliberately serialized before orchestrator V2',()=>{
  assert.equal(BROWSER1_ACCESS_V1_CONTRACT.capability_id,'BROWSER-1');
  assert.equal(BROWSER1_ACCESS_V1_CONTRACT.execution_model,'SINGLE_ACTIVE_SESSION_SERIAL');
  assert.equal(BROWSER1_ACCESS_V1_CONTRACT.initial_limits.max_active_sessions,1);
  assert.equal(BROWSER1_ACCESS_V1_CONTRACT.initial_limits.max_registered_sessions,64);
  assert.equal(BROWSER1_ACCESS_V1_CONTRACT.initial_limits.max_tabs_per_session,8);
  assert.equal(BROWSER1_ACCESS_V1_CONTRACT.initial_limits.max_actions_per_job,50);
  assert.equal(BROWSER1_ACCESS_V1_CONTRACT.supports_multiple_accounts_same_company,true);
  assert.equal(BROWSER1_ACCESS_V1_CONTRACT.live_viewer_included,false);
});

test('same company can register multiple isolated Google/Facebook account sessions',async()=>{
  const captured=[];
  const fakeFactory=()=>({execute:async job=>{captured.push(job);return {ok:true,results:[],authorization:{status:'AUTHORIZED'}};}});
  const tool=createBrowser1Tool({sessions:[session('fb-a','google-a'),session('fb-b','google-b')],worker_factory:fakeFactory,secret_resolver:async()=>({})});
  const common={company_id:'fenix',department_id:'MARKETING',engine_id:'TEST-001',environment:'PREPROD',version:'v1',commands:[{command:'goto',url:'https://www.facebook.com/'}],...baseAuthority()};
  await tool.observe({...common,session_id:'fb-a'});
  await tool.observe({...common,session_id:'fb-b'});
  assert.equal(captured.length,2);
  assert.notEqual(captured[0].browser_profile_id,captured[1].browser_profile_id);
  assert.equal(captured[0].account_id,'google-a');
  assert.equal(captured[1].account_id,'google-b');
  assert.equal(tool.status().registered_sessions.length,2);
});

test('department scoping prevents another department from borrowing a session',async()=>{
  const tool=createBrowser1Tool({sessions:[session('fb-a','google-a')],worker_factory:()=>({execute:async()=>({ok:true})}),secret_resolver:async()=>({})});
  const result=await tool.observe({company_id:'fenix',department_id:'FINANCE',engine_id:'TEST-001',environment:'PREPROD',session_id:'fb-a',commands:[{command:'goto',url:'https://www.facebook.com/'}],...baseAuthority()});
  assert.equal(result.ok,false);
  assert.equal(result.status,'HOLD_BROWSER1_DEPARTMENT_SESSION_DENIED');
});

test('observe mode cannot type or click; act mode is required',async()=>{
  const tool=createBrowser1Tool({worker_factory:()=>({execute:async()=>({ok:true})}),secret_resolver:async()=>({})});
  await assert.rejects(()=>tool.observe({company_id:'fenix',department_id:'SEO',engine_id:'TEST-001',environment:'PREPROD',commands:[{command:'write',target:{selector:'#x'},value:'hola'}],...baseAuthority()}),/BROWSER1_MUTATION_MODE_REQUIRED/);
});

test('initial action and explicit tab limits fail closed',async()=>{
  const tool=createBrowser1Tool({worker_factory:()=>({execute:async()=>({ok:true})}),secret_resolver:async()=>({})});
  const tooManyActions=Array.from({length:51},()=>({command:'wait',ms:1}));
  await assert.rejects(()=>tool.observe({company_id:'fenix',department_id:'SEO',engine_id:'TEST-001',environment:'PREPROD',commands:tooManyActions,...baseAuthority()}),/BROWSER1_ACTION_LIMIT_EXCEEDED/);
  const tabs=[{command:'goto',url:'https://example.com'},...Array.from({length:8},()=>({command:'open_tab',url:'https://example.com'}))];
  await assert.rejects(()=>tool.observe({company_id:'fenix',department_id:'SEO',engine_id:'TEST-001',environment:'PREPROD',commands:tabs,...baseAuthority()}),/BROWSER1_TAB_LIMIT_EXCEEDED/);
});

async function fixtureServer(){
  const server=http.createServer((req,res)=>{
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
    res.end(`<!doctype html><html><body>
      <input aria-label="Texto">
      <button id="save" onclick="document.querySelector('#out').textContent=document.querySelector('input').value">Guardar</button>
      <button id="popup" onclick="window.open('/', '_blank')">Popup</button>
      <div id="out">EMPTY</div>
    </body></html>`);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,url:`http://127.0.0.1:${server.address().port}`};
}

test('Browser 1 simple API physically writes, clicks and verifies with Chromium', {timeout:90_000,skip:PHYSICAL?false:'DEDICATED_PHYSICAL_BROWSER_GATE_ONLY'}, async()=>{
  const {server,url}=await fixtureServer();
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'browser1-access-'));
  try{
    const tool=createBrowser1Tool({worker_options:{profiles_root:path.join(temp,'profiles'),artifacts_root:path.join(temp,'artifacts'),headless:true}});
    const result=await tool.act({
      company_id:'fenix',department_id:'SEO',engine_id:'TEST-001',environment:'PREPROD',identity_id:'public-test',account_id:'fixture',version:'v1',
      commands:[
        {command:'goto',url},
        {command:'write',target:{label:'Texto'},value:'CEREBRO_BROWSER1_OK'},
        {command:'click',target:{selector:'#save'}},
        {command:'extract_text',target:{selector:'#out'}},
        {command:'screenshot',label:'browser1-simple-api'}
      ],
      ...baseAuthority()
    });
    assert.equal(result.ok,true);
    assert.equal(result.results[3],'CEREBRO_BROWSER1_OK');
    assert.equal(result.browser1.capability_id,'BROWSER-1');
    assert.equal(result.browser1.department_id,'SEO');
    assert.equal(result.browser1.mode,'MUTATE');
    await fs.access(result.final_evidence);
  } finally {
    await new Promise(resolve=>server.close(resolve));
    await fs.rm(temp,{recursive:true,force:true});
  }
});

test('Browser 1 physically enforces tab limit even when a site opens a popup', {timeout:90_000,skip:PHYSICAL?false:'DEDICATED_PHYSICAL_BROWSER_GATE_ONLY'}, async()=>{
  const {server,url}=await fixtureServer();
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'browser1-popup-limit-'));
  try{
    const tool=createBrowser1Tool({
      limits:{max_tabs_per_session:2},
      worker_options:{profiles_root:path.join(temp,'profiles'),artifacts_root:path.join(temp,'artifacts'),headless:true}
    });
    await assert.rejects(()=>tool.act({
      company_id:'fenix',department_id:'SEO',engine_id:'TEST-001',environment:'PREPROD',identity_id:'public-test',account_id:'popup-fixture',version:'v1',
      commands:[
        {command:'goto',url},
        {command:'open_tab',url},
        {command:'click',target:{selector:'#popup'}}
      ],
      ...baseAuthority()
    }),/BROWSER_TAB_LIMIT_EXCEEDED/);
  } finally {
    await new Promise(resolve=>server.close(resolve));
    await fs.rm(temp,{recursive:true,force:true});
  }
});
