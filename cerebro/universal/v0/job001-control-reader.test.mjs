import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createJob001ControlReaderLabV0} from './job001-control-reader.mjs';
import {UniversalGatewayLabV0} from './control-plane.mjs';
import handler from '../../../api/cerebro-universal-preview.ts';
const REPO=JSON.parse(fs.readFileSync(new URL('../../registry/engine-registry.v1.json',import.meta.url),'utf8'));
const SOURCE_URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-operativa-job001-read-lab-v0?company_id=fenix&environment=LAB';
const OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const PREPROD='sb_publishable_preprod_lab_test_0123456789';
const PROD='sb_publishable_owner_lab_test_0123456789';
const TOKEN='owner-long-session-jwt-1234567890'.repeat(12);
const HOST='fenix-capital-preprod-job001lab.vercel.app';
const rjson=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const good=()=>({
 status:'OK',source:'PREPROD_JOB001_CONTROL_METADATA',company_id:'fenix',source_company_id:'FENIX_CAPITAL',
 environment:'PREPROD',observed_at:'2026-11-13T18:40:00Z',
 job_controls:[{job_id:2,company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
 version:'v0',enabled:true,runtime_verified:false,dispatch_verified:false,freshness:'STALE_CONFIG',private_data:'DO_NOT_LEAK'}],
 external_controls:[{job_id:25,company_id:'fenix',engine_id:'SOCIAL-001',environment:'PREPROD',
 version:'v0',enabled:false,runtime_verified:false,dispatch_verified:false,freshness:'STALE_CONFIG'}],
 engine_state_records:[{engine_id:'SEOBOOT-001',company_id:'fenix',environment:'PREPROD',
 version:'1.0.0',declared_state:'GREEN',runtime_verified:false,freshness:'STALE_CONFIG',last_changed_at:'2026-10-13T12:52:01Z'}],
 totals:{job_controls:1,external_controls:1,engine_state_records:1,telemetry_records:0},
 live_execution_verified:false,actual_dispatch_enabled:false,prod_execution_enabled:false,job001_queue_connected:false,write_operations:0
});
test('PREPROD controls reader enforces two publishable key scopes and returns sanitised counts only',async()=>{
 const calls=[];
 const reader=createJob001ControlReaderLabV0({preprodApiKey:PREPROD,ownerApiKey:PROD,
  fetchImpl:async(url,options)=>{calls.push({url,options});return rjson(good())}});
 const v=await reader.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
 assert.equal(v.status,'OK');assert.equal(v.control_rows,1);assert.equal(v.enabled_control_rows,1);
 assert.equal(v.external_control_rows,1);assert.equal(v.engine_state_records,1);assert.equal(v.telemetry_records,0);
 assert.equal(v.stale_control_rows,2);
 assert.equal(v.job001_queue_connected,false);assert.equal(v.live_execution_verified,false);
 assert.equal(v.source_environment,'PREPROD');
 assert.equal(v.engine_bindings.length,1);
 assert.equal(v.engine_bindings[0].engine_id,'SEOBOOT-001');
 assert.equal(v.engine_bindings[0].declared_state,'GREEN');
 assert.equal(v.engine_bindings[0].freshness,'STALE_CONFIG');
 assert.equal(v.engine_bindings[0].runtime_verified,false);
 assert.equal(v.control_engine_bindings.length,2);
 assert.equal(v.control_engine_bindings.find(x=>x.engine_id==='SEO-001').enabled_controls,1);
 assert.equal(JSON.stringify(v.engine_bindings).includes('private_data'),false);
 assert.equal(JSON.stringify(v).includes('DO_NOT_LEAK'),false);
 assert.equal(JSON.stringify(v).includes(TOKEN),false);
 assert.equal(JSON.stringify(v).includes(PREPROD),false);
 assert.equal(calls.length,1);assert.equal(calls[0].url,SOURCE_URL);
 assert.equal(calls[0].options.method,'GET');
 assert.equal(calls[0].options.headers.apikey,PREPROD);
 assert.equal(calls[0].options.headers['x-cerebro-owner-prod-apikey'],PROD);
});
test('403 from PREPROD Edge exposes only safe authorization reason, never raw context',async()=>{
 const reader=createJob001ControlReaderLabV0({preprodApiKey:PREPROD,ownerApiKey:PROD,fetchImpl:async()=>
  rjson({status:'UNAVAILABLE',reason:'OWNER_CONTEXT_NOT_AUTHORIZED',internal:'TOP_SECRET'},403)});
 const value=await reader.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
 assert.equal(value.status,'UNAVAILABLE');
 assert.equal(value.reason,'PREPROD_OWNER_CONTEXT_NOT_AUTHORIZED');
 assert.equal(JSON.stringify(value).includes('TOP_SECRET'),false);
});
test('existing owner read exposes only four sanitized PREPROD pg_cron run observations; not JOB001 runtime',async()=>{
 const cron_observation={
  status:'OK',source:'PREPROD_PG_CRON_OBSERVATION',
  is_job001_hostinger_master:false,is_job001_runtime_proof:false,active:4,recent_successful_cron_commands:4,
  jobs:[6,22,23,25].map(id=>({job_id:id,active:true,last_status:'succeeded',
   last_run_at:'2026-11-13T19:07:00Z',run_recent:true,run_record_present:true,
   job001_execution_verified:false,downstream_effect_verified:false,command:'SECRET_NOT_ALLOWED'}))
 };
 const reader=createJob001ControlReaderLabV0({preprodApiKey:PREPROD,ownerApiKey:PROD,
  fetchImpl:async()=>rjson({...good(),cron_observation})});
 const result=await reader.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
 assert.equal(result.cron_observation.status,'OK');
 assert.equal(result.cron_observation.active,4);
 assert.equal(result.cron_observation.recent_successful_cron_commands,4);
 assert.equal(result.cron_observation.is_job001_runtime_proof,false);
 assert.equal(result.job001_queue_connected,false);
 assert.equal(JSON.stringify(result).includes('SECRET_NOT_ALLOWED'),false);
 const denied=createJob001ControlReaderLabV0({preprodApiKey:PREPROD,ownerApiKey:PROD,
  fetchImpl:async()=>rjson({...good(),cron_observation:{...cron_observation,is_job001_runtime_proof:true}})});
 const invalid=await denied.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
 assert.equal(invalid.cron_observation.status,'UNAVAILABLE');
 assert.equal(invalid.cron_observation.active,null);
});
test('owner reader admits only sanitized SQL RPC totals with false Hostinger and runtime assertions',async()=>{
 const rpc_observation={status:'OK',source:'PREPROD_JOB001_DISPATCH_RPC_STATS',
  observed_at:'2026-11-13T20:29:37Z',stats_reset_at:'2026-08-14T16:57:07Z',
  rpc_calls_since_reset:79994,hostinger_origin_verified:false,
  runtime_execution_verified:false,downstream_effect_verified:false,
  raw_sql:'NEVER_LEAK_THIS_SQL'};
 const reader=createJob001ControlReaderLabV0({preprodApiKey:PREPROD,ownerApiKey:PROD,fetchImpl:async()=>rjson({...good(),rpc_observation})});
 const result=await reader.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
 assert.equal(result.rpc_observation.status,'OK');
 assert.equal(result.rpc_observation.rpc_calls_since_reset,79994);
 assert.equal(result.rpc_observation.runtime_execution_verified,false);
 assert.equal(result.job001_queue_connected,false);
 assert.equal(JSON.stringify(result).includes('NEVER_LEAK_THIS_SQL'),false);
 const forged=createJob001ControlReaderLabV0({preprodApiKey:PREPROD,ownerApiKey:PROD,fetchImpl:async()=>rjson({...good(),rpc_observation:{...rpc_observation,downstream_effect_verified:true}})});
 assert.equal((await forged.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN})).rpc_observation.status,'UNAVAILABLE');
});
test('non-Fénix, PROD or missing owner session cannot read PREPROD and no upstream requests are made',async()=>{
 let calls=0;const reader=createJob001ControlReaderLabV0({preprodApiKey:PREPROD,ownerApiKey:PROD,fetchImpl:async()=>{calls++;return rjson(good())}});
 for(const params of [{company_id:'aion',environment:'LAB',session_token:TOKEN},{company_id:'fenix',environment:'PROD',session_token:TOKEN},{company_id:'fenix',environment:'LAB',session_token:'bad'}])
  await assert.rejects(reader.listForContext(params));
 assert.equal(calls,0);
});
test('cross-tenant rows and forged running status fail closed',async()=>{
 for(const change of [
  {job_controls:[{...good().job_controls[0],company_id:'aion'}]},
  {job_controls:[{...good().job_controls[0],runtime_verified:true}]},
  {job001_queue_connected:true},{live_execution_verified:true},{prod_execution_enabled:true},
  {totals:{...good().totals,job_controls:10}},
  {engine_state_records:[{...good().engine_state_records[0],runtime_verified:true}]},
  {engine_state_records:[{...good().engine_state_records[0],declared_state:'G'.repeat(200)}]},
 ]){
  const reader=createJob001ControlReaderLabV0({preprodApiKey:PREPROD,ownerApiKey:PROD,
   fetchImpl:async()=>rjson({...good(),...change})});
  const v=await reader.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
  assert.equal(v.status,'UNAVAILABLE');
  assert.equal(v.control_rows,null);
 }
});
test('real Preview API allows one owner-verified GET to existing separate PREPROD read-only function',async t=>{
 const oldFetch=globalThis.fetch,oldEnv=process.env.VERCEL_ENV,oldUrl=process.env.VERCEL_URL,oldKey=process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY;
 t.after(()=>{globalThis.fetch=oldFetch;process.env.VERCEL_ENV=oldEnv;process.env.VERCEL_URL=oldUrl;process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY=oldKey});
 process.env.VERCEL_ENV='preview';process.env.VERCEL_URL=HOST;process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY=PREPROD;
 const calls=[];
 globalThis.fetch=async(url,opt)=>{
  calls.push({url,method:opt.method});
  if(url===OWNER)return rjson({ok:true,context:{actor_code:'CARLOS-ADMIN'}});
  if(url===SOURCE_URL)return rjson(good());
  throw Error('OUT_OF_SCOPE');
 };
 const req={method:'POST',headers:{host:HOST,origin:'https://'+HOST,authorization:'Bearer '+TOKEN,apikey:PROD},body:{action:'get_job001_controls',params:{company_id:'fenix',environment:'LAB'}}};
 const out={code:0,body:null};const res={setHeader(){},status(v){out.code=v;return res},json(v){out.body=v;return res}};
 await handler(req,res);
 assert.equal(out.code,200);assert.equal(out.body.control_rows,1);
 assert.equal(out.body.transport,'PREVIEW_ONLY_SERVER_VERIFIED');
 assert.equal(out.body.prod_execution_enabled,false);
 assert.equal(out.body.live_execution_verified,false);
 assert.equal(out.body.job001_queue_connected,false);
 assert.deepEqual(calls.map(x=>x.url),[OWNER,SOURCE_URL]);
 assert.deepEqual(calls.map(x=>x.method),['GET','GET']);
});
test('no job controls reader, non-owner and write requests fail closed',async()=>{
 const g=new UniversalGatewayLabV0({registry:REPO,authenticate:async()=>({actor_id:'CARLOS-ADMIN',company_ids:['fenix'],scopes:['cerebro:universal:read','cerebro:jobs:read']})});
 const result=await g.handle({session_token:TOKEN,action:'get_job001_controls',params:{company_id:'fenix',environment:'LAB'}});
 assert.equal(result.status,'UNAVAILABLE');assert.equal(result.job001_queue_connected,false);
 await assert.rejects(g.handle({session_token:TOKEN,action:'get_job001_controls',params:{company_id:'fenix',environment:'PROD'}}),/ENVIRONMENT_LAB_ONLY/);
 await assert.rejects(g.handle({session_token:TOKEN,action:'get_job001_controls',params:{company_id:'aion',environment:'LAB'}}),/COMPANY_SCOPE_DENIED/);
});
