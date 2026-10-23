import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ActionGatewayV1 } from '../gateway/action-gateway-v1.mjs';
import { CerebroGatewayV0 } from '../console/gateway.mjs';
import { bindConsoleToActionGatewayV1 } from '../console/action-gateway-binding-v1.mjs';
import { bindBrowser1ToActionGatewayV1 } from '../gateway/browser1-action-gateway-binding-v1.mjs';
import { createBrowser1Tool } from '../runtime/browser1-access-v1.mjs';

const PHYSICAL = process.env.CEREBRO_PHYSICAL_BROWSER_E2E === '1';

function authorityProvider() {
  return {
    origin_engine_id:'AUTO-001',
    canonical_engine_ids:['AUTO-001','SEO-001'],
    browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true},
    engine_authority:{browser_use_authorized:true,session_binding_authorized:false,operation_authorized:true},
    kill_switch_enabled:true
  };
}

function fakeBrowser() {
  const calls=[];
  return {
    calls,
    observe: async input => { calls.push({mode:'OBSERVE',input}); return {ok:true,kind:'observe'}; },
    act: async input => { calls.push({mode:'MUTATE',input}); return {ok:true,kind:'act'}; }
  };
}

test('ACTGW registers Browser 1 observe and act capabilities',()=>{
  const gateway=new ActionGatewayV1();
  const browser=fakeBrowser();
  const bound=bindBrowser1ToActionGatewayV1({actionGateway:gateway,browser1Tool:browser,authority_provider:authorityProvider});
  assert.equal(bound.status,'BOUND');
  assert.equal(bound.gateway_engine_id,'ACTGW-001');
  assert.equal(bound.observe_capability,'browser1.observe');
  assert.equal(bound.act_capability,'browser1.act');
  assert.equal(bound.raw_secret_payloads,'DENY');
});

test('Console -> ACTGW -> Browser 1 preserves canonical company/environment and server authority',async()=>{
  const consoleGateway=new CerebroGatewayV0({environment:'PREPROD',version:'0.1.0'});
  const actionGateway=new ActionGatewayV1();
  const browser=fakeBrowser();
  bindBrowser1ToActionGatewayV1({actionGateway,browser1Tool:browser,authority_provider:authorityProvider});
  bindConsoleToActionGatewayV1({consoleGateway,actionGateway});
  consoleGateway.createSession({session_id:'console-1',company_id:'fenix'});

  const result=await consoleGateway.execute({
    session_id:'console-1',command:'action.execute',payload:{
      authorized:true,capability:'browser1.act',idempotency_key:'browser-1',risk:'LOW',
      payload:{
        company_id:'evil-company',engine_id:'EVIL-999',environment:'PROD',
        department_id:'SEO',identity_id:'public',account_id:'fixture',
        commands:[{command:'write',target:{selector:'#q'},value:'hipotecas cordoba'}]
      }
    }
  });
  assert.equal(result.status,'ACTION_EXECUTED');
  assert.equal(result.result.ok,true);
  assert.equal(browser.calls.length,1);
  assert.equal(browser.calls[0].mode,'MUTATE');
  assert.equal(browser.calls[0].input.company_id,'fenix');
  assert.equal(browser.calls[0].input.environment,'PREPROD');
  assert.equal(browser.calls[0].input.engine_id,'AUTO-001');
  assert.equal(browser.calls[0].input.department_id,'SEO');
  assert.equal(browser.calls[0].input.incremental_spend_eur,0);
});

test('Browser 1 gateway binding rejects raw cookies, tokens, passwords and session bundles',async()=>{
  for (const forbidden of [
    {cookies:[{name:'sid',value:'x'}]},
    {access_token:'secret'},
    {password:'secret'},
    {nested:{session_bundle:{bundle_id:'x'}}}
  ]) {
    const gateway=new ActionGatewayV1();
    const browser=fakeBrowser();
    bindBrowser1ToActionGatewayV1({actionGateway:gateway,browser1Tool:browser,authority_provider:authorityProvider});
    await assert.rejects(()=>gateway.execute({
      context:{company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'0.1.0'},
      authorized:true,capability:'browser1.observe',idempotency_key:`secret-${Object.keys(forbidden)[0]}`,risk:'LOW',
      payload:{department_id:'SEO',commands:[{command:'goto',url:'https://example.com'}],...forbidden}
    }),/BROWSER1_RAW_SECRET_FIELD_FORBIDDEN/);
    assert.equal(browser.calls.length,0);
  }
});

test('Browser 1 gateway binding fails closed if server authority is missing or noncanonical',async()=>{
  const gateway=new ActionGatewayV1();
  const browser=fakeBrowser();
  bindBrowser1ToActionGatewayV1({
    actionGateway:gateway,browser1Tool:browser,
    authority_provider:async()=>({origin_engine_id:'SEO-001',canonical_engine_ids:['AUTO-001'],browser_binding:{},engine_authority:{},kill_switch_enabled:true})
  });
  await assert.rejects(()=>gateway.execute({
    context:{company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'0.1.0'},
    authorized:true,capability:'browser1.observe',idempotency_key:'authority-bad',risk:'LOW',
    payload:{department_id:'SEO',commands:[{command:'goto',url:'https://example.com'}]}
  }),/BROWSER1_ORIGIN_ENGINE_NOT_CANONICAL/);
  assert.equal(browser.calls.length,0);
});

test('observe and act are distinct capabilities through ACTGW',async()=>{
  const gateway=new ActionGatewayV1();
  const browser=fakeBrowser();
  bindBrowser1ToActionGatewayV1({actionGateway:gateway,browser1Tool:browser,authority_provider:authorityProvider});
  const context={company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'0.1.0'};
  const base={authorized:true,risk:'LOW',payload:{department_id:'MARKETING',commands:[{command:'goto',url:'https://example.com'}]}};
  await gateway.execute({...base,context,capability:'browser1.observe',idempotency_key:'observe-1'});
  await gateway.execute({...base,context,capability:'browser1.act',idempotency_key:'act-1'});
  assert.deepEqual(browser.calls.map(x=>x.mode),['OBSERVE','MUTATE']);
});

async function fixtureServer() {
  const server=http.createServer((req,res)=>{
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
    res.end('<!doctype html><html><body><input aria-label="Texto"><button id="go" onclick="document.querySelector(\'#out\').textContent=document.querySelector(\'input\').value">Aplicar</button><div id="out">EMPTY</div></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,url:`http://127.0.0.1:${server.address().port}`};
}

test('physical chain Console -> ACTGW -> Browser 1 -> Chromium writes and verifies', {timeout:90_000,skip:PHYSICAL?false:'DEDICATED_PHYSICAL_BROWSER_GATE_ONLY'}, async()=>{
  const {server,url}=await fixtureServer();
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'browser1-gateway-e2e-'));
  try {
    const consoleGateway=new CerebroGatewayV0({environment:'PREPROD',version:'0.1.0'});
    const actionGateway=new ActionGatewayV1();
    const browser=createBrowser1Tool({worker_options:{profiles_root:path.join(temp,'profiles'),artifacts_root:path.join(temp,'artifacts'),headless:true}});
    bindBrowser1ToActionGatewayV1({actionGateway,browser1Tool:browser,authority_provider:authorityProvider});
    bindConsoleToActionGatewayV1({consoleGateway,actionGateway});
    consoleGateway.createSession({session_id:'physical-console',company_id:'fenix'});

    const result=await consoleGateway.execute({
      session_id:'physical-console',command:'action.execute',payload:{
        authorized:true,capability:'browser1.act',idempotency_key:'physical-browser1-e2e',risk:'LOW',estimated_additional_cost_eur:0,
        payload:{
          department_id:'SEO',identity_id:'public-e2e',account_id:'fixture',
          commands:[
            {command:'goto',url},
            {command:'write',target:{label:'Texto'},value:'CEREBRO_GATEWAY_BROWSER1_OK'},
            {command:'click',target:{selector:'#go'}},
            {command:'extract_text',target:{selector:'#out'}},
            {command:'screenshot',label:'gateway-browser1-e2e'}
          ]
        }
      }
    });

    assert.equal(result.status,'ACTION_EXECUTED');
    assert.equal(result.result.ok,true);
    assert.equal(result.result.results[3],'CEREBRO_GATEWAY_BROWSER1_OK');
    assert.equal(result.result.browser1.capability_id,'BROWSER-1');
    assert.equal(result.result.browser1.department_id,'SEO');
    assert.equal(result.result.browser1.serialized_execution,true);
    await fs.access(result.result.final_evidence);
    assert.equal(actionGateway.auditLog().at(-1).type,'ACTION_EXECUTED');
    assert.equal(consoleGateway.auditLog().at(-1).type,'COMMAND_EXECUTED');
  } finally {
    await new Promise(resolve=>server.close(resolve));
    await fs.rm(temp,{recursive:true,force:true});
  }
});
