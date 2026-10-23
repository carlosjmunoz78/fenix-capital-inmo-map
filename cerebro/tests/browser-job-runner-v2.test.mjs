import test from 'node:test';
import assert from 'node:assert/strict';
import {runOneBrowserJobV2,BROWSER_JOB_RUNNER_V2_CONTRACT} from '../runtime/browser-job-runner-v2.mjs';

function responder(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});}

function baseJob(){return {job_id:'00000000-0000-0000-0000-000000000101',lease_id:'00000000-0000-0000-0000-000000000102',company_id:'fenix',department_id:'seo',engine_id:'CONSOLE-001',environment:'PREPROD',version:'v2',mode:'OBSERVE',identity_id:'phase2-id',account_id:'phase2-account',browser_profile_id:'b1-fenix-phase2-id-phase2-account-PREPROD',credential_ref_id:null,audit_id:'audit-v2',timeout_seconds:300,commands:[{command:'goto',url:'https://fenixcapital.es/'},{command:'extract_text',target:{selector:'h1'}}],authority:{canonical_engine_ids:['CONSOLE-001'],browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true},engine_authority:{browser_use_authorized:true},kill_switch_enabled:true}};}

test('V2 seeds, leases, heartbeats, executes, completes and writes metrics',async()=>{
  const calls=[]; const job=baseJob();
  const fetch_impl=async(url,options={})=>{const route=String(url).split('/').at(-1);const body=JSON.parse(options.body||'{}');calls.push({route,body});
    if(route==='phase2-canary-seed')return responder({ok:true,job_id:'seed'});
    if(route==='lease-v2')return responder({ok:true,worker_id:'github:1:1:slot-2',job});
    if(route==='heartbeat-v2')return responder({ok:true,cancel_requested:false});
    if(route==='complete-v2')return responder({ok:true,status:'SUCCEEDED'});
    if(route==='metrics-v2')return responder({ok:true,metric_id:'m1'});
    throw new Error(`unexpected ${route}`);
  };
  const browser1={observe:async()=>({ok:true,authorization:{status:'AUTHORIZED'},results:['Hipotecas'],final_url:'https://fenixcapital.es/',final_evidence:'/tmp/e.png'})};
  const result=await runOneBrowserJobV2({endpoint:'https://dispatch.example',worker_slot:2,stage_concurrency:4,seed_canary:true,browser1,fetch_impl,token:'oidc',run_id:'r1'});
  assert.equal(result.ok,true); assert.equal(result.status,'SUCCEEDED');
  assert.deepEqual(calls.map(x=>x.route),['phase2-canary-seed','lease-v2','heartbeat-v2','complete-v2','metrics-v2']);
  assert.equal(calls.at(-1).body.stage_concurrency,4);
});

test('V2 refuses execution when cancellation is observed before browser start',async()=>{
  const calls=[]; const job=baseJob(); let executed=false;
  const fetch_impl=async(url,options={})=>{const route=String(url).split('/').at(-1);calls.push(route);
    if(route==='lease-v2')return responder({ok:true,worker_id:'github:1:1:slot-1',job});
    if(route==='heartbeat-v2')return responder({ok:true,cancel_requested:true});
    if(route==='complete-v2')return responder({ok:true,status:'CANCELLED'});
    throw new Error(`unexpected ${route}`);
  };
  const browser1={observe:async()=>{executed=true;return {ok:true};}};
  const result=await runOneBrowserJobV2({endpoint:'https://dispatch.example',worker_slot:1,stage_concurrency:2,browser1,fetch_impl,token:'oidc'});
  assert.equal(executed,false); assert.equal(result.status,'CANCELLED'); assert.deepEqual(calls,['lease-v2','heartbeat-v2','complete-v2']);
});

test('V2 credential materialization is in-memory and never included in completion/metrics payloads',async()=>{
  const calls=[]; const job={...baseJob(),mode:'MUTATE',credential_ref_id:'credref:test',commands:[{command:'fill',target:{selector:'#email'},value:'$CREDENTIAL.email'}]}; let executedValue='';
  const fetch_impl=async(url,options={})=>{const route=String(url).split('/').at(-1);const body=JSON.parse(options.body||'{}');calls.push({route,body});
    if(route==='lease-v2')return responder({ok:true,worker_id:'github:1:1:slot-1',job});
    if(route==='heartbeat-v2')return responder({ok:true,cancel_requested:false});
    if(route==='credential-materialize-v2')return responder({ok:true,secret_payload:{email:'canary@example.invalid',password:'synthetic'},secret_material_logged:false});
    if(route==='complete-v2')return responder({ok:true,status:'SUCCEEDED'});
    if(route==='metrics-v2')return responder({ok:true,metric_id:'m1'});
    throw new Error(`unexpected ${route}`);
  };
  const browser1={act:async input=>{executedValue=input.commands[0].value;return {ok:true,authorization:{status:'AUTHORIZED'},results:[null],final_url:'https://example.invalid/',final_evidence:'/tmp/e.png'};}};
  const result=await runOneBrowserJobV2({endpoint:'https://dispatch.example',worker_slot:1,stage_concurrency:2,browser1,fetch_impl,token:'oidc'});
  assert.equal(result.ok,true); assert.equal(executedValue,'canary@example.invalid');
  const outward=JSON.stringify(calls.filter(x=>['complete-v2','metrics-v2'].includes(x.route)));
  assert.equal(outward.includes('synthetic'),false); assert.equal(outward.includes('canary@example.invalid'),false);
});

test('contract preserves V1 rollback and zero-cost policy',()=>{
  assert.equal(BROWSER_JOB_RUNNER_V2_CONTRACT.worker_pool,true);
  assert.equal(BROWSER_JOB_RUNNER_V2_CONTRACT.one_serial_browser1_per_worker,true);
  assert.equal(BROWSER_JOB_RUNNER_V2_CONTRACT.serial_v1_rollback_preserved,true);
  assert.equal(BROWSER_JOB_RUNNER_V2_CONTRACT.incremental_cost_eur,0);
});
