import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisEuD1Provisioner} from './jarvis-cloudflare-eu-d1-provisioner.mjs';
const accountId='e39a57e1ac42650ca5a6d5307cf0ac8e';
const base='https://api.cloudflare.com/client/v4/accounts/'+accountId+'/d1/database';
const uuid='11111111-2222-4333-8444-555555555555';
const token='synthetic-private-operator-token-12345';
const record=(over={})=>({uuid,name:'cerebro-jarvis-lab-eu',
 jurisdiction:'eu',read_replication:{mode:'disabled'},...over});
const body=(result,info)=>({success:true,errors:[],result,
 ...(info?{result_info:info}:{})});
const response=(data,status=200)=>({ok:status>=200&&status<300,status,
 text:async()=>JSON.stringify(data)});
function rig({found=[],count=1,created=record(),
  readback=record(),errorOn,apiError=false}={}){
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,method:options.method,headers:options.headers,body:options.body,
   cache:options.cache,redirect:options.redirect});
  if(errorOn===options.method)throw Error('private bearer '+token);
  if(apiError)return response({success:false,errors:[{message:token}],result:[]});
  if(options.method==='GET'&&url.includes('?name=')){
   return response(body(found,{total_count:count}));
  }
  if(options.method==='POST')return response(body(created),201);
  if(options.method==='GET'&&url.startsWith(base+'/'))return response(body(readback));
  throw Error('unexpected URL');
 };
 const provisioner=createJarvisEuD1Provisioner({
  fetchImpl,apiToken:token,accountId,enabled:true
 });
 return {calls,provisioner};
}
const authorized={mode:'create',approved:true,confirmation:'CREATE_JARVIS_EU_LAB'};
test('CUT27 defaults disabled and never accesses account or credentials',async()=>{
 const provisioner=createJarvisEuD1Provisioner({
  fetchImpl:async()=>{throw Error('never')},apiToken:'fake-token'
 });
 assert.equal((await provisioner.run(authorized)).state,'DISABLED');
});
test('CUT27 explicit LAB-only and scoped Cloudflare token are mandatory',()=>{
 assert.throws(()=>createJarvisEuD1Provisioner({environment:'PROD',enabled:true}),/LAB_ONLY/);
 assert.throws(()=>createJarvisEuD1Provisioner({fetchImpl:async()=>{},apiToken:'',enabled:true}),/SCOPED_CLOUDFLARE_D1_TOKEN_REQUIRED/);
 assert.throws(()=>createJarvisEuD1Provisioner({fetchImpl:async()=>{},apiToken:token,accountId:'wrong',enabled:true}),/SCOPED_CLOUDFLARE_D1_TOKEN_REQUIRED/);
});
test('CUT27 defaults inspect-only: no POST even when database is missing',async()=>{
 const r=rig({found:[]});
 const status=await r.provisioner.run();
 assert.equal(status.state,'MISSING_EU_D1_NO_WRITE');
 assert.deepEqual(r.calls.map(c=>c.method),['GET']);
 assert.ok(r.calls[0].url.includes('cerebro-jarvis-lab-eu'));
});
test('CUT27 creation requires explicit approval and matching confirmation',async()=>{
 const r=rig({found:[]});
 for(const opts of [{mode:'create'},{mode:'create',approved:true},
  {mode:'create',approved:true,confirmation:'CREATE_OTHER_DB'}]){
  const status=await r.provisioner.run(opts);
  assert.equal(status.state,'CREATE_REQUIRES_EXPLICIT_AUTHORIZATION');
 }
 assert.equal(r.calls.length,0);
});
test('CUT27 one new EU database: exact POST request, readback and no deploy',async()=>{
 const r=rig({found:[],count:1});
 const result=await r.provisioner.run(authorized);
 assert.equal(result.state,'NEW_EU_D1_CREATED_UNMIGRATED');
 assert.equal(result.created,true);assert.equal(result.databaseId,uuid);
 assert.equal(result.deployAllowed,false);assert.equal(result.prod,'NO_GO');
 assert.deepEqual(r.calls.map(c=>c.method),['GET','POST','GET']);
 assert.equal(r.calls[1].url,base);
 assert.deepEqual(JSON.parse(r.calls[1].body),{
  name:'cerebro-jarvis-lab-eu',jurisdiction:'eu',
  read_replication:{mode:'disabled'}
 });
 assert.equal(r.calls[1].redirect,'error');
 assert.equal(r.calls[1].cache,'no-store');
 assert.equal(JSON.stringify(result).includes(token),false);
});
test('CUT27 existing EU D1 verified idempotently with GET only',async()=>{
 const r=rig({found:[record()]});
 const result=await r.provisioner.run(authorized);
 assert.equal(result.state,'EXISTING_EU_VERIFIED_NO_WRITE');
 assert.equal(result.created,undefined);
 assert.deepEqual(r.calls.map(c=>c.method),['GET','GET']);
});
test('CUT27 existing non-EU named database is immutable, no creation',async()=>{
 for(const jurisdiction of [null,'us','fedramp',undefined]){
  const r=rig({found:[record({jurisdiction})]});
  const result=await r.provisioner.run(authorized);
  assert.equal(result.state,'EXISTING_DATABASE_NOT_EU_NO_WRITE');
  assert.deepEqual(r.calls.map(c=>c.method),['GET']);
 }
});
test('CUT27 existing old synthetic D1 UUID cannot be adopted as new EU',async()=>{
 const r=rig({found:[record({uuid:'a859fde1-126b-4c40-bc0d-aec2f8839f7b'})]});
 const result=await r.provisioner.run(authorized);
 assert.equal(result.state,'EXISTING_DATABASE_NOT_EU_NO_WRITE');
 assert.equal(r.calls.length,1);
});
test('CUT27 duplicate or fuzzy database names stop without mutation',async()=>{
 for(const found of [[record(),record({uuid:'22222222-2222-4333-8444-555555555555'})],
  [record({name:'not-jarvis-eu'})]]){
  const r=rig({found});
  assert.equal((await r.provisioner.run(authorized)).state,'AMBIGUOUS_DATABASE_NAME_NO_WRITE');
  assert.deepEqual(r.calls.map(c=>c.method),['GET']);
 }
});
test('CUT27 capacity exhausted or missing count prevents Free-tier creation',async()=>{
 for(const count of [10,100,null,-1]){
  const r=rig({found:[],count});
  const result=await r.provisioner.run(authorized);
  assert.equal(result.state,'FREE_D1_CAPACITY_UNVERIFIED_NO_WRITE');
  assert.deepEqual(r.calls.map(c=>c.method),['GET']);
 }
});
test('CUT27 metadata mismatch after POST requires human review; never deletes',async()=>{
 const r=rig({found:[],created:record({jurisdiction:null})});
 const result=await r.provisioner.run(authorized);
 assert.equal(result.state,'CREATED_METADATA_UNSAFE_HUMAN_REVIEW');
 assert.deepEqual(r.calls.map(c=>c.method),['GET','POST']);
 assert.equal(JSON.stringify(result).includes(token),false);
});
test('CUT27 readback mismatch requires review and does not retry POST',async()=>{
 const r=rig({found:[],readback:record({jurisdiction:null})});
 const result=await r.provisioner.run(authorized);
 assert.equal(result.state,'CREATED_NEEDS_READBACK_HUMAN_REVIEW');
 assert.deepEqual(r.calls.map(c=>c.method),['GET','POST','GET']);
});
test('CUT27 ambiguous network error after POST never retries or discloses error',async()=>{
 const r=rig({found:[],errorOn:'POST'});
 const result=await r.provisioner.run(authorized);
 assert.equal(result.state,'CREATE_OUTCOME_UNKNOWN_RECHECK_INVENTORY');
 assert.deepEqual(r.calls.map(c=>c.method),['GET','POST']);
 assert.equal(JSON.stringify(result).includes(token),false);
});
test('CUT27 unavailable Cloudflare inventory refuses to create',async()=>{
 const r=rig({errorOn:'GET'});
 const result=await r.provisioner.run(authorized);
 assert.equal(result.state,'INVENTORY_UNAVAILABLE_NO_WRITE');
 assert.deepEqual(r.calls.map(c=>c.method),['GET']);
});
test('CUT27 Cloudflare API failure body and token never returned',async()=>{
 const r=rig({apiError:true});
 const result=await r.provisioner.run(authorized);
 assert.equal(result.state,'INVENTORY_UNAVAILABLE_NO_WRITE');
 assert.equal(JSON.stringify(result).includes(token),false);
});
test('CUT27 API call URLs are pinned to the authorized account (no redirects)',async()=>{
 const r=rig({found:[]});
 await r.provisioner.run(authorized);
 assert.ok(r.calls.every(c=>c.url.startsWith(base)));
 assert.ok(r.calls.every(c=>c.redirect==='error'));
 assert.ok(r.calls.every(c=>c.headers.authorization==='Bearer '+token));
});


test('CUT27 list API may omit replication; GET-by-UUID certifies it',async()=>{
 const r=rig({found:[record({read_replication:undefined})],readback:record()});
 const result=await r.provisioner.run(authorized);
 assert.equal(result.state,'EXISTING_EU_VERIFIED_NO_WRITE');
 assert.deepEqual(r.calls.map(c=>c.method),['GET','GET']);
});
test('CUT27 GET detail rejects unknown or automatic replication',async()=>{
 for(const read_replication of [undefined,null,{}, {mode:'auto'}]){
  const r=rig({found:[record({read_replication:undefined})],
   readback:record({read_replication})});
  const result=await r.provisioner.run(authorized);
  assert.equal(result.state,'EXISTING_EU_DATABASE_NOT_VERIFIED');
  assert.deepEqual(r.calls.map(c=>c.method),['GET','GET']);
 }
});
test('CUT27 POST may omit replication but fresh detail GET must prove disabled',async()=>{
 const r=rig({found:[],created:record({read_replication:undefined}),readback:record()});
 const result=await r.provisioner.run(authorized);
 assert.equal(result.state,'NEW_EU_D1_CREATED_UNMIGRATED');
 assert.deepEqual(r.calls.map(c=>c.method),['GET','POST','GET']);
 assert.equal(result.deployAllowed,false);
});
test('CUT27 POST with missing replica metadata is never accepted without safe readback',async()=>{
 const r=rig({found:[],created:record({read_replication:undefined}),
  readback:record({read_replication:undefined})});
 const result=await r.provisioner.run(authorized);
 assert.equal(result.state,'CREATED_NEEDS_READBACK_HUMAN_REVIEW');
 assert.deepEqual(r.calls.map(c=>c.method),['GET','POST','GET']);
 assert.equal(result.deployAllowed,false);
});
