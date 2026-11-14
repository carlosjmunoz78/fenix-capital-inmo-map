import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGithubWorkActivityReaderV0} from './github-work-activity-reader.mjs';
import {createUniversalInterfaceAutoConnectV0,UNIVERSAL_INTERFACE_TYPES_V0} from './interface-autoconnect.mjs';
import {UniversalGatewayLabV0} from './control-plane.mjs';
import handler from '../../../api/cerebro-universal-preview.ts';

const ACTIVITY_URL='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-activity-v0/';
const OWNER_URL='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const KEY='public-lab-publishable-key-1234567890';
const TOKEN='realistic-jwt-length-owner-token-0123456789'.repeat(10);
const registry=JSON.parse(fs.readFileSync(new URL('../../registry/engine-registry.v1.json',import.meta.url),'utf8'));
const actor={actor_id:'CARLOS-ADMIN',company_ids:['fenix'],scopes:['cerebro:universal:read','cerebro:factory:inspect','cerebro:jobs:read','cerebro:invoke:read']};
const run=(id,extra={})=>({
 run_id:id,company_id:'fenix',source:'GITHUB_ACTIONS',provenance:'REAL',status:'in_progress',
 workflow_name:'Smoke de Operativa',environment:'PREPROD',version:'v4',engine_id:'FACT-001',
 html_url:'https://github.com/'+REPO+'/actions/runs/'+id,
 jobs_provenance:'REAL_GITHUB_JOBS',running_jobs:2,queued_jobs:1,
 progress_percent:50,progress_provenance:'REAL_GITHUB_JOBS',...extra
});
const good=(more={})=>({status:'OK',source:'GITHUB_ACTIONS',source_status:'CACHED',repository:REPO,
 observed_at:'2026-11-13T15:32:00Z',runs:[run(1001),run(1002,{company_id:'aion'}),run(1003,{html_url:'https://evil.example'})],...more});
const response=(v,code=200)=>new Response(JSON.stringify(v),{status:code,headers:{'content-type':'application/json'}});

test('reuses existing actual GitHub Actions source: GET only, tenant isolation, CACHED, no payload leak',async()=>{
 const calls=[];const reader=createGithubWorkActivityReaderV0({apiKey:KEY,fetchImpl:async(url,opt)=>{calls.push({url,opt});return response(good())}});
 const r=await reader.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
 assert.equal(r.status,'OK');assert.equal(r.source,'GITHUB_ACTIONS');assert.equal(r.source_status,'CACHED');
 assert.equal(r.runs.length,1);assert.equal(r.runs[0].run_id,1001);
 assert.equal(r.runs[0].origin_environment,'PREPROD');assert.equal(r.runs[0].running_jobs,2);
 assert.equal(r.job001_connected,false);assert.equal(r.sample_limited,true);
 assert.equal(calls.length,1);assert.equal(calls[0].url,ACTIVITY_URL);assert.equal(calls[0].opt.method,'GET');
 assert.equal(calls[0].opt.headers.authorization,'Bearer '+TOKEN);
 assert.equal(JSON.stringify(r).includes(TOKEN),false);
 assert.equal(JSON.stringify(r).includes(KEY),false);
 await assert.rejects(reader.listForContext({company_id:'aion',environment:'LAB',session_token:TOKEN}),/FENIX_LAB_ONLY/);
 await assert.rejects(reader.listForContext({company_id:'fenix',environment:'PROD',session_token:TOKEN}),/FENIX_LAB_ONLY/);
});
test('source outage, malformed repository and missing timestamps fail closed not false zero jobs',async()=>{
 for(const [mock,code] of [[good({repository:'another/repo'}),200],[good({observed_at:'not-a-date'}),200],[good(),403]]){
  const reader=createGithubWorkActivityReaderV0({apiKey:KEY,fetchImpl:async()=>response(mock,code)});
  const x=await reader.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
  assert.equal(x.status,'UNAVAILABLE');assert.equal(x.source_status,'UNAVAILABLE');assert.equal(x.runs.length,0);
 }
 const down=createGithubWorkActivityReaderV0({apiKey:KEY,fetchImpl:async()=>{throw Error('timeout')}});
 const v=await down.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
 assert.equal(v.status,'UNAVAILABLE');assert.equal(v.reason,'BOTH_SOURCES_NETWORK_UNAVAILABLE');
});
test('expired or denied activity feed falls back once to read-only public GitHub metadata without tokens',async()=>{
 const FALLBACK_URL='https://api.github.com/repos/'+REPO+'/actions/runs?per_page=30';
 const calls=[];
 const mock={
  total_count:2,workflow_runs:[
   {id:43469603691,name:'CEREBRO Browser 1 V2 Live Worker',path:'.github/workflows/cerebro-browser-job-runner-v2-live.yml',
    status:'in_progress',html_url:'https://github.com/'+REPO+'/actions/runs/43469603691',
    head_sha:'a'.repeat(40),conclusion:null},
   {id:43469603692,name:'Sensitive data should not be displayed',status:'queued',
    html_url:'https://evil.example/hijack',head_sha:'b'.repeat(40)}
  ]
 };
 const reader=createGithubWorkActivityReaderV0({apiKey:KEY,fetchImpl:async(url,options)=>{
  calls.push({url,method:options.method,headers:options.headers});
  if(url===ACTIVITY_URL)return response({status:'ERROR',source_status:'UNAVAILABLE'},503);
  if(url===FALLBACK_URL)return response(mock);
  throw Error('UNEXPECTED_ENDPOINT');
 }});
 const r=await reader.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
 assert.deepEqual(calls.map(x=>x.url),[ACTIVITY_URL,FALLBACK_URL]);
 assert.deepEqual(calls.map(x=>x.method),['GET','GET']);
 assert.equal(calls[1].headers.authorization,undefined);
 assert.equal(r.status,'OK');
 assert.equal(r.source_status,'LIVE');
 assert.equal(r.activity_provenance,'PUBLIC_GITHUB_REST_READ_ONLY_FALLBACK');
 assert.equal(r.job001_connected,false);
 assert.equal(r.runs.length,1);
 assert.equal(r.runs[0].run_id,43469603691);
 assert.equal(r.runs[0].running_jobs,null);
 assert.equal(r.runs[0].jobs_provenance,'UNAVAILABLE');
 assert.equal(JSON.stringify(r).includes(TOKEN),false);
});
test('public GitHub fallback also fails closed if rate limited or malformed',async()=>{
 const fallback='https://api.github.com/repos/'+REPO+'/actions/runs?per_page=30';
 for(const responseStatus of [403,429,500]){
  const reader=createGithubWorkActivityReaderV0({apiKey:KEY,fetchImpl:async(url)=>{
   if(url===ACTIVITY_URL)return response({},503);
   if(url===fallback)return response({message:'rate limit'},responseStatus);
   throw Error('wrong URL');
  }});
  const value=await reader.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
  assert.equal(value.status,'UNAVAILABLE');
  assert.equal(value.source_status,'UNAVAILABLE');
  assert.deepEqual(value.runs,[]);
  assert.equal(value.reason,'PUBLIC_GITHUB_REST_UNAVAILABLE');
 }
});
test('one Gateway / SDK protocol: all six future interface connectors use same owner rights; none self-grants permission',async()=>{
 const fetchImpl=async()=>response(good());
 const reader=createGithubWorkActivityReaderV0({apiKey:KEY,fetchImpl});
 const gateway=new UniversalGatewayLabV0({registry,authenticate:async s=>s===TOKEN?actor:null,workActivity:reader});
 const request=x=>gateway.handle(x);
 for(const interface_id of UNIVERSAL_INTERFACE_TYPES_V0){
  const connector=createUniversalInterfaceAutoConnectV0({interface_id,request,getSessionToken:async()=>TOKEN});
  const handshake=await connector.connect();
  assert.equal(handshake.connected,true);assert.deepEqual(handshake.capabilities,['fact.registry.summary']);
  assert.equal(handshake.prod_authorized,false);
  const obs=await connector.readWorkActivity();
  assert.equal(obs.status,'OK');assert.equal(obs.source,'GITHUB_ACTIONS');assert.equal(obs.source_status,'CACHED');
 }
 const noRoles=new UniversalGatewayLabV0({registry,authenticate:async()=>({...actor,scopes:['cerebro:universal:read']}),workActivity:reader});
 await assert.rejects(noRoles.handle({session_token:TOKEN,action:'list_work_activity',params:{company_id:'fenix',environment:'LAB'}}),/SCOPE_DENIED/);
 await assert.rejects(gateway.handle({session_token:TOKEN,action:'list_work_activity',params:{company_id:'fenix',environment:'PROD'}}),/ENVIRONMENT_LAB_ONLY/);
 await assert.rejects(gateway.handle({session_token:TOKEN,action:'list_work_activity',params:{company_id:'aion',environment:'LAB'}}),/COMPANY_SCOPE_DENIED/);
 await assert.rejects(createUniversalInterfaceAutoConnectV0({interface_id:'OPERATIVA',request,getSessionToken:async()=>''}).connect(),/AUTH_SESSION_REQUIRED/);
 assert.throws(()=>createUniversalInterfaceAutoConnectV0({interface_id:'NEW_UNKNOWN',request,getSessionToken:async()=>TOKEN}),/INTERFACE_NOT_REGISTERED/);
 const missing=new UniversalGatewayLabV0({registry,authenticate:async()=>actor});
 const noReader=await missing.handle({session_token:TOKEN,action:'list_work_activity',params:{company_id:'fenix',environment:'LAB'}});
 assert.equal(noReader.status,'UNAVAILABLE');assert.equal(noReader.job001_connected,false);
});
test('physical Preview route contracts: server verifies owner before only one existing activity GET; writes forbidden',async t=>{
 const save=globalThis.fetch,env=process.env.VERCEL_ENV,vercel=process.env.VERCEL_URL;
 t.after(()=>{globalThis.fetch=save;process.env.VERCEL_ENV=env;process.env.VERCEL_URL=vercel});
 process.env.VERCEL_ENV='preview';process.env.VERCEL_URL='fenix-capital-preprod-labread123.vercel.app';
 const calls=[];
 globalThis.fetch=async(url,opts)=>{
  calls.push({url,method:opts.method});
  if(url===OWNER_URL)return response({ok:true,context:{actor_code:'CARLOS-ADMIN'}});
  if(url===ACTIVITY_URL)return response(good({source_status:'LIVE'}));
  throw Error('Unapproved endpoint: '+url);
 };
 const data={method:'POST',headers:{host:'fenix-capital-preprod-labread123.vercel.app',origin:'https://fenix-capital-preprod-labread123.vercel.app',authorization:'Bearer '+TOKEN,apikey:KEY},
 body:{action:'list_work_activity',params:{company_id:'fenix',environment:'LAB'}}};
 const logs={status:0,body:null};
 const res={setHeader:()=>{},status(n){logs.status=n;return res},json(v){logs.body=v;return res}};
 await handler(data,res);
 assert.equal(logs.status,200);
 assert.equal(logs.body.status,'OK');
 assert.equal(logs.body.source,'GITHUB_ACTIONS');
 assert.equal(logs.body.source_status,'LIVE');
 assert.equal(logs.body.runs.length,1);
 assert.equal(logs.body.prod_execution_enabled,false);
 assert.deepEqual(calls.map(x=>x.method),['GET','GET']);
 assert.deepEqual(calls.map(x=>x.url),[OWNER_URL,ACTIVITY_URL]);
 await handler({...data,body:{action:'execute',params:data.body.params}},res);
 assert.equal(logs.status,404);assert.equal(calls.length,2);
});
test('Operativa panel keeps old chat and voice; renders provenance and separate JOB001 status',()=>{
 const client=fs.readFileSync(new URL('../../../src/cerebroUniversalOperativaLabApi.ts',import.meta.url),'utf8');
 const panel=fs.readFileSync(new URL('../../../src/CerebroUniversalOperativaLabPanel.tsx',import.meta.url),'utf8');
 assert.ok(client.includes("'list_work_activity'"));
 assert.ok(panel.includes("result.workActivity?.state"));
 assert.ok(panel.includes("NO la cola JOB-001"));
 assert.ok(panel.includes("No controla")===false);
 assert.equal(client.includes('service_role'),false);
});
