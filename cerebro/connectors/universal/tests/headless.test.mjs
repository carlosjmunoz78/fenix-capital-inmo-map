import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeadlessCerebro} from '../src/headless.mjs';
import {getCapability} from '../src/catalog.mjs';
const context={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const read={source:'owner_order',context,capability:'vercel.projects.list',input:{}};
const write={...read,capability:'vercel.project.update-lab',idempotency_key:'owner-write-1',input:{idOrName:'prj_test',enablePreviewFeedback:false}};
const owner={client_id:'cerebro',actor_id:'owner',identity_ref:'iam:verified-owner',source:'owner_order',authority:'owner_signed_command',verified:true};
const bot={...owner,actor_id:'scheduler',identity_ref:'iam:automation:registered',source:'automation',authority:'registered_automation'};
const fixture=({identity=owner,permit=true,throwVerification=false}={})=>{
 const calls=[];let auth=0;let grants=0;
 const h=createHeadlessCerebro({
  core:{execute:async req=>{calls.push(req);return {status:'COMPLETED',capability:req.capability};}},
  verifySignedOrder:async()=>{auth++;if(throwVerification)throw Error('bad_jwt');return identity;},
  grant:async()=>{grants++;return permit;}
 });
 return {h,calls,stats:()=>({auth,grants})};
};
test('no console: verified signed owner command invokes existing core with unforgeable identity',async()=>{
 const f=fixture();const out=await f.h.execute(read,{jwt:'validated externally'});
 assert.equal(out.status,'COMPLETED');
 assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0].trustedPrincipal,{client_id:'cerebro',actor_id:'owner',identity_ref:'iam:verified-owner'});
 assert.equal(f.calls[0].context.environment,'LAB');
});
test('headless automation can execute only with registered independent identity',async()=>{
 const f=fixture({identity:bot});
 const out=await f.h.execute({...read,source:'automation'},null);
 assert.equal(out.status,'COMPLETED');assert.equal(f.calls.length,1);
});
test('owner proof cannot be forged by setting source in payload',async()=>{
 const f=fixture({identity:bot});const r=await f.h.execute(read,{hacked:true});
 assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(f.calls.length,0);
});
test('automation identity cannot impersonate owner order',async()=>{
 const f=fixture({identity:{...owner,source:'automation'}});const r=await f.h.execute(read);
 assert.equal(r.reason,'SECURITY_INCIDENT');assert.equal(f.calls.length,0);
});
test('expired or missing externally checked signature fails closed',async()=>{
 const f=fixture({throwVerification:true});const r=await f.h.execute(read);
 assert.equal(r.reason,'SECURITY_INCIDENT');assert.equal(f.calls.length,0);assert.equal(f.stats().grants,0);
});
test('no shell injections, arbitrary scopes or caller supplied principals',async()=>{
 for(const v of [
  {...read,context:{...context,environment:'INTERNAL'}},
  {...read,context:{...context,company_id:'../secrets'}},
  {...read,capability:'git; rm -rf /'},
  {...read,trustedPrincipal:owner},
  {...read,input:[]},
  {...read,source:'evil-agent'}
 ]){
  const f=fixture();const r=await f.h.execute(v);assert.equal(r.reason,'POLICY_CONFLICT');assert.equal(f.calls.length,0);assert.equal(f.stats().auth,0);
 }
});
test('no PROD writes or unimplemented destructive capability',async()=>{
 const f=fixture();
 assert.equal((await f.h.execute({...write,context:{...context,environment:'PROD'}})).reason,'HIGH_RISK');
 assert.equal((await f.h.execute({...write,capability:'vercel.project.delete'})).reason,'LOW_CONFIDENCE');
 assert.equal(f.calls.length,0);
});
test('LAB mutation needs durable idempotency key',async()=>{
 const f=fixture();const r=await f.h.execute({...write,idempotency_key:undefined});
 assert.equal(r.reason,'POLICY_CONFLICT');assert.equal(f.calls.length,0);
});
test('deny on missing server-side grant, independent of user command text',async()=>{
 const f=fixture({permit:false});const r=await f.h.execute(write);
 assert.equal(r.reason,'POLICY_CONFLICT');assert.equal(f.calls.length,0);
});
test('verified owner LAB write passes unchanged to core, where cost/idempotency/rollback still apply',async()=>{
 const f=fixture();const r=await f.h.execute(write);
 assert.equal(r.status,'COMPLETED');assert.equal(f.calls[0].idempotency_key,'owner-write-1');
 assert.equal(getCapability(f.calls[0].capability).sideEffect,true);
});
test('requires authenticated core and trusted grant/identity callbacks',()=>{
 assert.throws(()=>createHeadlessCerebro({}),/HEADLESS_TRUST_AND_CORE_REQUIRED/);
 assert.throws(()=>createHeadlessCerebro({core:{execute(){}},verifySignedOrder:()=>owner}),/HEADLESS_TRUST_AND_CORE_REQUIRED/);
});
