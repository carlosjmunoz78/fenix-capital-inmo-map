import test from 'node:test';
import assert from 'node:assert/strict';
import { UniversalConnectorCore, inMemoryIdempotency, createAuditSink } from '../src/core.mjs';
import { makeChatGPTAdapter, makeCerebroAdapter } from '../src/clients.mjs';
import { CloudflareOfficialApi } from '../src/cloudflare.mjs';
import { FACEBOOK_D1, CLOUDFLARE_ACCOUNT_ID, CAPABILITIES } from '../src/catalog.mjs';
import { labFacebookPolicy, cloudflareFreeCostGuard } from '../src/policy.mjs';
const CONTEXT={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'0.1.0'};
const INPUT={name:FACEBOOK_D1,jurisdiction:'eu',confirm_isolated:true};
const UUID='12345678-abcd-1234-abcd-123456789abc';
const PRINCIPAL={actor_id:'owner',identity_ref:'iam:fenix-owner-lab'};
function fixture({free=true,permit=labFacebookPolicy,http,cloudflare}={}) {
 const audit=createAuditSink();
 const core=new UniversalConnectorCore({cloudflare:cloudflare??new CloudflareOfficialApi({tokenProvider:async()=> 'SIMULATED_NEVER_REAL',http}),authorize:permit,idempotency:inMemoryIdempotency(),audit:audit.record,costGuard: free?async()=>true:cloudflareFreeCostGuard});
 return {audit,core,chatgpt:makeChatGPTAdapter({core,authenticate:async()=>PRINCIPAL}),cerebro:makeCerebroAdapter({core,authenticate:async()=>PRINCIPAL})};
}
function cloudflareHttp(){const calls=[],databases=[];const impl=async(url,request)=>{
 const u=new URL(url), pathname=u.pathname, method=request.method;
 calls.push({pathname,method,body:request.body?JSON.parse(request.body):null});
 if(pathname.endsWith('/d1/database')&&method==='GET')return response(databases,{count:databases.length,page:1,per_page:100,total_count:databases.length});
 if(pathname.endsWith('/d1/database')&&method==='POST'){
  const data=JSON.parse(request.body);databases.push({name:data.name,jurisdiction:data.jurisdiction,uuid:UUID});
  return response({name:data.name,jurisdiction:data.jurisdiction,uuid:UUID});
 }
 if(pathname.endsWith('/query')&&method==='POST')return response([{results:[{tables:3}]}]);
 return response([]);
 };return {http:impl,calls,databases};}
function response(result,result_info){return {ok:true,status:200,json:async()=>({success:true,result,result_info})};}
const cargs=(name='cloudflare.d1.create-facebook-lab-eu',input=INPUT,key='fb-001')=>({name,arguments:{...CONTEXT,input,idempotency_key:key}});

test('catalog is global Cloudflare and single shared core for both clients', async()=>{
 const api=cloudflareHttp(),f=fixture({http:api.http});
 const names=f.chatgpt.listTools().map(x=>x.name);
 for(const v of ['cloudflare.zones.list','cloudflare.dns.list','cloudflare.d1.list','cloudflare.workers.list','cloudflare.pages.projects','cloudflare.access.apps'])assert.ok(names.includes(v));
 assert.ok(CAPABILITIES.some(x=>x.id==='cloudflare.dns.update'&&x.status==='PLANNED_PROD_GATED'));
 const a=await f.chatgpt.callTool(cargs('cloudflare.d1.list',{},undefined));
 const b=await f.cerebro.execute({context:CONTEXT,capability:'cloudflare.d1.list'},{});
 assert.equal(a.status,'COMPLETED');assert.equal(b.status,'COMPLETED');
 assert.equal(api.calls.length,2);
 assert.equal(f.audit.list()[0].client_id,'chatgpt');assert.equal(f.audit.list()[1].client_id,'cerebro');
});
test('creates EU Facebook D1 only after preflight and verifies real UUID, then replays exactly once',async()=>{
 const api=cloudflareHttp(),f=fixture({http:api.http});
 const a=await f.chatgpt.callTool(cargs(),{});
 assert.deepEqual(a,{status:'COMPLETED',uuid:UUID,name:FACEBOOK_D1,jurisdiction:'eu',verified:true});
 assert.equal(api.calls.filter(x=>x.method==='POST'&&x.pathname.endsWith('/d1/database')).length,1);
 const r=await f.chatgpt.callTool(cargs(),{});assert.deepEqual(r,a);
 assert.equal(api.calls.filter(x=>x.method==='POST'&&x.pathname.endsWith('/d1/database')).length,1);
 assert.equal(f.audit.list().at(-1).outcome,'REPLAY');
});
test('never duplicates already-existing D1, verifies jurisdiction and name',async()=>{
 const api=cloudflareHttp();api.databases.push({name:FACEBOOK_D1,jurisdiction:'eu',uuid:UUID});
 const f=fixture({http:api.http});
 const result=await f.cerebro.execute({context:CONTEXT,capability:'cloudflare.d1.create-facebook-lab-eu',input:INPUT,idempotency_key:'fb-2'},{});
 assert.equal(result.status,'ALREADY_EXISTS_VERIFIED');
 assert.equal(api.calls.filter(x=>x.method==='POST').length,0);
});
test('wrong jurisdiction, account, company, scope, missing auth, cost and prod writes fail closed',async()=>{
 const api=cloudflareHttp(),f=fixture({http:api.http,free:false});
 const bad=await f.chatgpt.callTool(cargs(),{});assert.equal(bad.reason,'MONEY_LIMIT');
 const requests=[
  {...cargs(),arguments:{...cargs().arguments, company_id:'other-company'}},
  cargs('cloudflare.d1.create-facebook-lab-eu',{...INPUT,jurisdiction:'us'},'different'),
  cargs('cloudflare.d1.create-facebook-lab-eu',{...INPUT,account_id:'other-account'},'other'),
  {...cargs(),arguments:{...cargs().arguments,environment:'PROD'}}
 ];
 for(const req of requests){const result=await f.chatgpt.callTool(req,{});assert.equal(result.status,'HUMAN_REQUIRED');}
 assert.equal(api.calls.length,0);
 const invalid=makeChatGPTAdapter({core:f.core,authenticate:async()=>null});assert.equal((await invalid.callTool(cargs(),{})).reason,'POLICY_CONFLICT');
});
test('same key with different action payload cannot be reused; clients do not share idempotency namespace',async()=>{
 const api=cloudflareHttp(),f=fixture({http:api.http});
 await f.chatgpt.callTool(cargs(),{});
 const conflict=await f.chatgpt.callTool(cargs('cloudflare.d1.create-facebook-lab-eu',{...INPUT,foo:'bar'}),{});
 assert.equal(conflict.reason,'POLICY_CONFLICT');
 const second=await f.cerebro.execute({context:CONTEXT,capability:'cloudflare.d1.create-facebook-lab-eu',input:INPUT,idempotency_key:'fb-001'},{});
 assert.equal(second.status,'ALREADY_EXISTS_VERIFIED');
 assert.equal(api.calls.filter(x=>x.method==='POST'&&x.pathname.endsWith('/d1/database')).length,1);
});
test('only SELECT on exact FB D1 allowed, never another D1 or SQL mutations',async()=>{
 const api=cloudflareHttp();api.databases.push({name:FACEBOOK_D1,jurisdiction:'eu',uuid:UUID});const f=fixture({http:api.http});
 const ok=await f.chatgpt.callTool(cargs('cloudflare.d1.query-facebook-readonly',{database_id:UUID,sql:'SELECT count(*) AS tables FROM sqlite_master'},undefined),{});
 assert.equal(ok.status,'COMPLETED');
 const bad=await f.chatgpt.callTool(cargs('cloudflare.d1.query-facebook-readonly',{database_id:UUID,sql:'DELETE FROM users'},undefined),{});
 assert.equal(bad.reason,'LOW_CONFIDENCE');
 const foreign=await f.chatgpt.callTool(cargs('cloudflare.d1.query-facebook-readonly',{database_id:'ffffffff-ffff-ffff-ffff-ffffffffffff',sql:'SELECT 1'},undefined),{});
 assert.equal(foreign.reason,'LOW_CONFIDENCE');
 assert.equal(api.calls.filter(x=>x.pathname.endsWith('/query')).length,1);
});
test('pending mutation is not retried after ambiguous API outcome', async()=>{
 let n=0;const f=fixture({http:async()=>{n++;throw Object.assign(new Error('network failed'),{code:'TIMEOUT'});}});
 const first=await f.chatgpt.callTool(cargs(),{});assert.equal(first.reason,'LOW_CONFIDENCE');
 const second=await f.chatgpt.callTool(cargs(),{});assert.equal(second.detail.includes('pending'),true);
 assert.equal(n,1);
});
test('audit excludes credential values, token never appears',async()=>{
 const api=cloudflareHttp(),f=fixture({http:api.http});await f.chatgpt.callTool(cargs(),{});
 const text=JSON.stringify(f.audit.list());assert.ok(!text.includes('SIMULATED_NEVER_REAL'));assert.ok(!text.includes('Bearer'));
});
