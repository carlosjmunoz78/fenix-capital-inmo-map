import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runProdReadonlyCanary} from '../skills/skill-prod-readonly-canary.mjs';

function root(){return fs.mkdtempSync(path.join(os.tmpdir(),'skill-prod-canary-test-'));}

function mockFetch(url){
  if(url==='https://app.fenixcapital.es/'){
    return Promise.resolve(new Response('<!doctype html><html><body>Fenix</body></html>',{status:200,headers:{'content-type':'text/html'}}));
  }
  if(url==='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/health'){
    return Promise.resolve(new Response(JSON.stringify({ok:true,env:'PROD',service:'fenix-app-gateway'}),{status:200,headers:{'content-type':'application/json'}}));
  }
  throw new Error(`unexpected url:${url}`);
}

test('requires explicit high-risk canary confirmation',async()=>{
  await assert.rejects(()=>runProdReadonlyCanary({confirm:'NO',prodPublishableKey:'sb_publishable_test',fetchImpl:mockFetch,stateRoot:root()}),/EXPLICIT_PROD_READONLY_CANARY_CONFIRMATION_REQUIRED/);
});

test('requires publishable PROD key shape',async()=>{
  await assert.rejects(()=>runProdReadonlyCanary({confirm:'RUN_PROD_READONLY_CANARY',prodPublishableKey:'bad',fetchImpl:mockFetch,stateRoot:root()}),/VALID_PROD_PUBLISHABLE_KEY_REQUIRED/);
});

test('executes two live-read equivalents, wraps locally and rolls binding back to disabled',async()=>{
  const stateRoot=root();
  const report=await runProdReadonlyCanary({confirm:'RUN_PROD_READONLY_CANARY',prodPublishableKey:'sb_publishable_test',fetchImpl:mockFetch,stateRoot,observedAt:'2026-10-07T00:00:00.000Z'});
  assert.equal(report.status,'GREEN_PROD_READONLY_CANARY');
  assert.equal(report.environment,'PROD_CANARY');
  assert.equal(report.live_requests,2);
  assert.deepEqual(report.methods_used,['GET']);
  assert.equal(report.prod_write,false);
  assert.equal(report.customer_data_used,false);
  assert.equal(report.external_skill_code_executed,false);
  assert.equal(report.trading_access,false);
  assert.equal(report.additional_cost_eur,0);
  assert.equal(report.rollback_proven,true);
  assert.equal(report.binding_after,'DISABLED');
  assert.equal(report.wrappers_remain_prod_authorized_false,true);
  assert.equal(report.wrappers.supabase.policy_conflict,false);
  assert.equal(report.wrappers.agent_browser.policy_conflict,false);
  const persisted=JSON.parse(fs.readFileSync(path.join(stateRoot,'binding','skill-prod-canary-binding.json'),'utf8'));
  assert.equal(persisted.state,'DISABLED');
});

test('failure still rolls local canary binding back to disabled',async()=>{
  const stateRoot=root();
  const failingFetch=async(url)=>{
    if(url==='https://app.fenixcapital.es/') return new Response('<!doctype html><html></html>',{status:200});
    return new Response(JSON.stringify({ok:false,env:'PROD',service:'fenix-app-gateway'}),{status:500});
  };
  await assert.rejects(()=>runProdReadonlyCanary({confirm:'RUN_PROD_READONLY_CANARY',prodPublishableKey:'sb_publishable_test',fetchImpl:failingFetch,stateRoot}),/GATEWAY_PROD_CANARY_HTTP_NOT_200/);
  const persisted=JSON.parse(fs.readFileSync(path.join(stateRoot,'binding','skill-prod-canary-binding.json'),'utf8'));
  assert.equal(persisted.state,'DISABLED');
});
