import test from 'node:test';
import assert from 'node:assert/strict';
import {assertFiveReadOrder,runFiveProviderRead,SCOPED_READ_ORDER} from '../five-provider-read.mjs';
const base={...SCOPED_READ_ORDER,request_id:'FACT001-FIVE-READ-20261112-V001'};
const fake=({notion=true,github=true}={})=>{
 const calls=[];
 const response=(status,value)=>({status,json:async()=>value});
 const transport=async(url,opt)=>{
  calls.push({url,method:opt.method,auth:opt.headers.Authorization});
  if(url.includes('/verify')){
   const b=JSON.parse(opt.body);
   assert.ok(['cloudflare','vercel','supabase'].includes(b.provider));
   return response(200,{status:'VERIFIED_READ',provider:b.provider,object_count:2,writes:0,credentials_exposed:false});
  }
  if(url.endsWith('/notion-workspace')){
   return response(notion?200:503,{status:notion?'NOTION_INDEPENDENT_WORKSPACE_READ':'BLOCKED',provider:'notion',accessible_objects_returned:50,content_returned:false,write_operations:0,credentials_exposed:false});
  }
  if(url.startsWith('https://api.github.com/'))return response(github?200:403,{type:'file',name:'headless.mjs',sha:'a'.repeat(40)});
  throw Error('UNEXPECTED_URL');
 };
 return {calls,transport};
};
test('five providers verified using own CEREBRO read identities and immutable endpoints',async()=>{
 const f=fake();const r=await runFiveProviderRead({order:base,fetchImpl:f.transport,sign:async aud=>{assert.equal(aud,'cerebro-fact001-provider-headless-lab-v1');return 'oidc-signed-token'},githubToken:'github-internal-token'.repeat(2)});
 assert.equal(r.status,'FIVE_CEREBRO_PROVIDER_READ_VERIFIED_LAB');assert.equal(r.providers.length,5);assert.equal(r.provider_writes,0);
 assert.deepEqual(r.providers.map(p=>p.provider),['cloudflare','vercel','supabase','notion','github']);
 assert.equal(f.calls.filter(c=>c.method==='POST').length,4);
 assert.equal(f.calls.filter(c=>c.method==='GET').length,1);
});
test('no user endpoint, PROD, cost or provider set injection',()=>{
 for(const patch of [{environment:'PROD'},{max_cost_eur:1},{source:'automation'},{provider_set:'cloudflare'},{target:'https://attacker.example'},{request_id:'BAD'}]){
  assert.throws(()=>assertFiveReadOrder({...base,...patch}),/FIVE_READ_ORDER_DENIED/);
 }
});
test('fail closed if Notion or GitHub unavailable',async()=>{
 for(const options of [{notion:false},{github:false}]){
  const f=fake(options);
  await assert.rejects(runFiveProviderRead({order:base,fetchImpl:f.transport,sign:async()=> 'jwt',githubToken:'x'.repeat(40)}),/FIVE_READ_/);
 }
});
test('missing independent github token blocks before network',async()=>{
 const f=fake();await assert.rejects(runFiveProviderRead({order:base,fetchImpl:f.transport,sign:async()=> 'jwt',githubToken:'x'}),/IDENTITY_REQUIRED/);
 assert.equal(f.calls.length,0);
});
