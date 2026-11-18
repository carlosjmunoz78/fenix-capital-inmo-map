import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import handler,{privateEvidenceHost} from '../../../api/cerebro-executor-coverage.ts';

const host='fenix-capital-preprod-abc123.vercel.app';
const env={...process.env},originalFetch=globalThis.fetch;
const clean=()=>{
 for(const k of ['VERCEL_ENV','VERCEL_URL','CEREBRO_CF_READ_TOKEN_PREVIEW','CEREBRO_PREPROD_PUBLISHABLE_KEY']){
  if(env[k]===undefined)delete process.env[k];else process.env[k]=env[k];
 }
 globalThis.fetch=originalFetch;
};
const response=()=>{let status=200,body=null;return{
 status(n){status=n;return this},setHeader(){},json(x){body=x;return this},get(){return {status,body}}
}};
const request=async (overrides={})=>{
 const output=response();
 await handler({method:'GET',url:'/api/cerebro-executor-coverage?company_id=fenix',headers:{
  host,authorization:'Bearer '+'a'.repeat(60),apikey:'sb_publishable_'+'b'.repeat(30),...overrides
 }},output);
 return output.get();
};
test('private host gate excludes PROD and unexpected Vercel deployment',()=>{
 assert.equal(privateEvidenceHost(host,'preview',undefined),true);
 assert.equal(privateEvidenceHost(host,'production',host),true);
 assert.equal(privateEvidenceHost(host,'production','fenix-capital-preprod-other.vercel.app'),false);
 assert.equal(privateEvidenceHost('app.fenixcapital.es','preview',undefined),false);
 assert.equal(privateEvidenceHost('evil.example','production','evil.example'),false);
});
test('owner-authenticated sources are separate inventories and historical LAB jobs, never agent activation',async()=>{
 process.env.VERCEL_ENV='preview';
 process.env.CEREBRO_CF_READ_TOKEN_PREVIEW='c'.repeat(60);
 process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY='sb_publishable_'+'d'.repeat(28);
 const urls=[];
 globalThis.fetch=async (url)=>{
  urls.push(String(url));
  if(String(url).includes('fenix-app-gateway/session/context'))return{status:200,json:async()=>({ok:true,context:{actor_code:'CARLOS-ADMIN'}})};
  if(String(url).includes('cloudflare.com'))return{status:200,ok:true,text:async()=>JSON.stringify({
   success:true,result:[{id:'worker-one'},{id:'worker-two'}],result_info:{total_pages:1}
  })};
  if(String(url).includes('cerebro-operativa-job-telemetry-lab-v0'))return{status:200,ok:true,text:async()=>JSON.stringify({
   status:'OK',source:'FENIX_LAB_AGENT_JOB_AGGREGATE_V1',company_id:'fenix',environment:'LAB',
   read_only:true,agent_identity_verified:false,active_agent_count:null,
   source_totals:[{source:'JARVIS_WORK',total_rows:2},{source:'BROWSER_V2',total_rows:4},{source:'CREATIVE_V1',total_rows:1}]
  })};
  throw Error('UNEXPECTED_NETWORK');
 };
 try{
  const x=await request();
  assert.equal(x.status,200,JSON.stringify(x.body));
  assert.equal(x.body.status,'OK');
  assert.equal(x.body.inventory_sources[0].visible_count,2);
  assert.equal(x.body.inventory_sources[1].visible_count,7);
  assert.equal(x.body.inventory_sources[0].metric_label,'WORKERS_IN_ACCOUNT');
  assert.equal(x.body.inventory_sources[1].metric_label,'HISTORICAL_LAB_JOB_ROWS');
  assert.equal(x.body.runtime_verified_profiles,0);
  assert.equal(x.body.active_recent_profiles,0);
  assert.equal(x.body.unverified_profiles,2477);
  assert.equal(x.body.templates_not_instances,29);
  assert.equal(x.body.active_executor_count,null);
  assert.equal(x.body.receipt_source_status,'NOT_CONNECTED');
  assert.equal(urls.length,3);
 }finally{clean();}
});
test('no session, wrong company or other host fail before provider fetch',async()=>{
 process.env.VERCEL_ENV='preview';
 let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('MUST_NOT_CALL_FETCH')};
 try{
  assert.equal((await request({authorization:''})).status,401);
  assert.equal((await request({host:'app.fenixcapital.es'})).status,403);
  const output=response();
  await handler({method:'GET',url:'/api/cerebro-executor-coverage?company_id=other',
   headers:{host,authorization:'Bearer '+'a'.repeat(60),apikey:'sb_publishable_'+'b'.repeat(30)}},output);
  assert.equal(output.get().status,403);
  assert.equal(calls,0);
 }finally{clean();}
});
test('preview client host and protected premium route do not regress',()=>{
 const roster=readFileSync(new URL('../../../src/CerebroRoleAgentRosterReadonly.tsx',import.meta.url),'utf8');
 const hostUI=readFileSync(new URL('../../../src/CerebroConsoleHost.tsx',import.meta.url),'utf8');
 assert(roster.includes('window.location.hostname'));
 assert(!roster.includes(String.fromCharCode(92,92)+'.vercel'));
 assert(hostUI.includes('const previewOwnerGate=Boolean(isCerebroPath&&previewHost);'));
 assert(hostUI.includes('const showPremiumV3=(realProduction||previewHost||visualPreview)&&!legacyRequested;'));
 assert(hostUI.includes("fetch('/api/cerebro-preview-owner'"));
});
