import test from 'node:test';import assert from 'node:assert/strict';
import {createFact001DualReadIngress,ADMISSION_SCOPE} from '../fact001-dual-read-ingress.mjs';
const order=(p={})=>({...ADMISSION_SCOPE,source:'owner_order',provider:'cloudflare',operation:'provider.inventory.read',
 request_id:'FACT001-DUAL-OWNER-20261111-01',idempotency_key:'FACT001-DUAL-IDEM-20261111-01',max_cost_eur:0,...p});
const owner={verified:true,client_id:'chatgpt-human',identity_ref:'oauth:verified:owner',
 actor_id:'carlosjmunoz78',authority:'owner_signed_command'};
const service={...owner,client_id:'cerebro-service',identity_ref:'oidc:verified:cerebro'};
function factory({principal=owner,cost=true,queueState='QUEUED'}={}){
 const calls=[],db=new Map();
 const queue={durable:true,async writeAtomic(v){
  calls.push(v);
  if(queueState==='ERROR')throw Error('STORE_DOWN');
  const prior=db.get(v.idempotency_hash);
  if(prior)return {status:prior.fingerprint===v.fingerprint?'ALREADY_QUEUED':'CONFLICT'};
  db.set(v.idempotency_hash,v);return {status:queueState};
 }};
 return {calls,ingress:createFact001DualReadIngress({authenticate:async()=>principal,queue,costGuard:async()=>cost})};
}
test('owner ChatGPT signed admission creates one atomic queued inventory order, never provider action',async()=>{
 const x=factory();const r=await x.ingress.accept({order:order(),transport:'opaque'});
 assert.equal(r.status,'QUEUED');assert.equal(r.provider_writes,0);assert.equal(r.job_dispatch_enabled,false);
 assert.equal(x.calls[0].audit_event,'FACT001_INGRESS_QUEUED');
 assert.equal(x.calls[0].state,'PENDING_VERIFIED_EXECUTOR');
});
test('CEREBRO service signed owner order is distinct from ChatGPT and admitted',async()=>{
 const x=factory({principal:service});
 assert.equal((await x.ingress.accept({order:order(),transport:'oidc:opaque'})).status,'QUEUED');
 assert.equal(x.calls[0].client_id,'cerebro-service');
});
test('automation requires registered CEREBRO service identity',async()=>{
 const automation={...service,actor_id:'automation:fact001',authority:'registered_automation',automation_active:true};
 const x=factory({principal:automation});
 assert.equal((await x.ingress.accept({order:order({source:'automation'})})).status,'QUEUED');
 const y=factory();assert.equal((await y.ingress.accept({order:order({source:'automation'})})).status,'BLOCKED');
 assert.equal(y.calls.length,0);
});
test('idempotent replay uses one durable write and rejects divergent command under same key',async()=>{
 const x=factory();const a=await x.ingress.accept({order:order()});
 const b=await x.ingress.accept({order:order()});
 const c=await x.ingress.accept({order:order({provider:'notion'})});
 assert.equal(a.status,'QUEUED');assert.equal(b.status,'ALREADY_QUEUED');
 assert.equal(c.code,'IDEMPOTENCY_CONFLICT');
});
test('no cost positive, PROD, cross tenant, arbitrary privilege or extra token fields',async()=>{
 const bad=[{max_cost_eur:1},{environment:'PROD'},{company_id:'other'},
 {operation:'provider.inventory.write'},{api_token:'top-secret'},
 {provider:'wordpress'},{idempotency_key:''}];
 for(const arg of bad){const x=factory();assert.equal((await x.ingress.accept({order:order(arg)})).status,'BLOCKED');assert.equal(x.calls.length,0);}
});
test('unauthenticated principal and owner impersonation never reach queue',async()=>{
 for(const p of [null,{...owner,verified:false},{...owner,actor_id:'other'},{...owner,authority:'anonymous'}]){
 const x=factory({principal:p});assert.equal((await x.ingress.accept({order:order()})).status,'BLOCKED');assert.equal(x.calls.length,0);
 }
});
test('quota guard and missing atomic store fail closed',async()=>{
 const x=factory({cost:false});assert.equal((await x.ingress.accept({order:order()})).code,'MONEY_LIMIT');assert.equal(x.calls.length,0);
 const y=factory({queueState:'ERROR'});assert.equal((await y.ingress.accept({order:order()})).code,'ATOMIC_QUEUE_UNAVAILABLE');
 assert.throws(()=>createFact001DualReadIngress({authenticate:async()=>owner,queue:{durable:false},costGuard:async()=>true}));
});
test('all five providers accepted for inventory only, no direct execution',async()=>{
 for(const provider of ['cloudflare','github','supabase','vercel','notion']){
 const x=factory();const r=await x.ingress.accept({order:order({provider})});
 assert.equal(r.status,'QUEUED');assert.equal(r.provider_writes,0);
 }
});
