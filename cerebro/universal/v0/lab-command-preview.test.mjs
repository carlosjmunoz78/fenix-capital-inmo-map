import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../../api/cerebro-universal-preview.ts';
const HOST='fenix-capital-preprod-testdryrun1.vercel.app';
const TOKEN='isolated-test-owner-auth-session-1234567890'.repeat(8);
const KEY='test-publishable-key-for-lab-contract';
const OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const body={action:'submit_command',params:{
 company_id:'fenix',environment:'LAB',engine_id:'FACT-001',
 capability_id:'fact.registry.summary',version:'0.1.0-lab',
 dry_run:true,idempotency_key:'lab-fact001-dryrun-read-20261113',
 estimated_additional_cost_eur:0,payload:{},risk:'LOW'}};
const make=(b=body)=>({method:'POST',headers:{host:HOST,origin:'https://'+HOST,authorization:'Bearer '+TOKEN,apikey:KEY},body:b});
async function call(req){const out={code:0,body:null};const res={
 setHeader(){},status(n){out.code=n;return res},json(payload){out.body=payload;return res}
};await handler(req,res);return out;}
test('Preview-only owner authenticated FACT dryrun validates but never executes',async t=>{
 const originalFetch=globalThis.fetch,env=process.env.VERCEL_ENV,vercel=process.env.VERCEL_URL;
 t.after(()=>{globalThis.fetch=originalFetch;process.env.VERCEL_ENV=env;process.env.VERCEL_URL=vercel});
 process.env.VERCEL_ENV='preview';process.env.VERCEL_URL=HOST;
 const calls=[];globalThis.fetch=async(url,options)=>{
  calls.push({url,method:options.method});
  if(url!==OWNER)throw Error('EXTERNAL_SIDE_EFFECT_DENIED');
  return new Response(JSON.stringify({ok:true,context:{actor_code:'CARLOS-ADMIN'}}),{status:200});
 };
 const x=await call(make());
 assert.equal(x.code,200);assert.equal(x.body.status,'DRY_RUN_VALIDATED');
 assert.equal(x.body.executed,false);assert.equal(x.body.prod_execution_enabled,false);
 assert.equal(x.body.durable_audit,false);assert.equal(x.body.idempotency_persisted,false);
 assert.equal(x.body.additional_cost_eur,0);
 assert.deepEqual(calls.map(x=>x.method),['GET']);
 assert.deepEqual(calls.map(x=>x.url),[OWNER]);
});
test('non-dryrun and other engine / payload are denied before authorisation or side effects',async t=>{
 const originalFetch=globalThis.fetch,env=process.env.VERCEL_ENV,vercel=process.env.VERCEL_URL;
 t.after(()=>{globalThis.fetch=originalFetch;process.env.VERCEL_ENV=env;process.env.VERCEL_URL=vercel});
 process.env.VERCEL_ENV='preview';process.env.VERCEL_URL=HOST;
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('NOT_ALLOWED')};
 for(const bad of [
  {...body,params:{...body.params,dry_run:false}},
  {...body,params:{...body.params,engine_id:'JOB-001'}},
  {...body,params:{...body.params,payload:{write:true}}},
  {...body,params:{...body.params,idempotency_key:'invalid'}},
  {...body,params:{...body.params,version:'PROD'}}
 ]){
  const x=await call(make(bad));
  assert.equal(x.code,404);
 }
 assert.equal(calls,0);
});
test('dryrun is blocked in Vercel production by host/environment gate',async t=>{
 const env=process.env.VERCEL_ENV,vercel=process.env.VERCEL_URL;
 t.after(()=>{process.env.VERCEL_ENV=env;process.env.VERCEL_URL=vercel});
 process.env.VERCEL_ENV='production';process.env.VERCEL_URL='app.fenixcapital.es';
 const x=await call(make());assert.equal(x.code,403);assert.equal(x.body.reason,'PREVIEW_ONLY');
});
