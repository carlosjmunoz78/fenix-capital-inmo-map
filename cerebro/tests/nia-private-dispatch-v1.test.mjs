import test from 'node:test';
import assert from 'node:assert/strict';
import { signNiaDiscoveryLabV1,dispatchNiaVerifiedLabV1,NIA_LAB_QUEUE } from '../gateway/nia-private-dispatch-v1.mjs';
import { NIA_SKILL_ID } from '../gateway/nia-action-gateway-binding-v0.mjs';
const secret='LAB-TEST-ONLY-NOT-A-PRODUCTION-SECRET-'+('X'.repeat(48));
const title='NIA · Uso responsable de Notion Business en CEREBRO';
const now=1794905000000;
const id='c5280e1d-4c52-4544-b7b6-e0b74ecc46e9';
const good=async(opts={})=>signNiaDiscoveryLabV1({
 secret,topic:'documentation',nonce:id,idempotency_key:'nia_lab_request_123456',now,...opts
});
function rig() {
 const claimed=new Set();let reads=0;
 return {nonceStore:{async claim(n){if(claimed.has(n))return false;claimed.add(n);return true}},
  notionProvider:{async readSkillPage(page){reads++;assert.equal(page,NIA_SKILL_ID);
    return {id:NIA_SKILL_ID,archived:false,properties:{title:{title:[{plain_text:title}]}}};}},
  get reads(){return reads;}
 };
}
const call=(env,body,extra={})=>dispatchNiaVerifiedLabV1({
 envelope:body,queue:NIA_LAB_QUEUE,secret,nonceStore:env.nonceStore,
 notionProvider:env.notionProvider,enabled:true,now:now+1000,...extra
});
test('signed queue dispatch executes actual ACTGW NIA binding once',async()=>{
 const e=await good();const env=rig();
 const out=await call(env,e);
 assert.equal(out.status,'DISPATCH_RECORDED');
 assert.equal(out.provider_status,'NIA_DISCOVERED');
 assert.equal(out.skill_id,NIA_SKILL_ID);
 assert.equal(out.additional_cost_eur,0);
 assert.equal(out.ai_session_started,false);
 assert.equal(env.reads,1);
 const replay=await call(env,e);
 assert.equal(replay.reason,'REPLAY_DENIED');
 assert.equal(env.reads,1);
});
test('client-supplied spoofing, tampering, disabled and expired envelopes fail closed',async()=>{
 const base=await good();
 for(const variation of [
  [{...base,issuer:'attacker'},{}],
  [{...base,payload:{topic:'research',already_handled:true}},{}],
  [{...base,context:{...base.context,company_id:'other'}},{}],
  [{...base,authorized:true},{}],
  [base,{queue:'cerebro-ums001-private'}],
  [base,{enabled:false}],
  [base,{now:now+90000}],
  [base,{secret:'wrong-notion-issuer-key-of-sufficient-length-xxxxxxxxxxxxxxxxxxxxxxxxxx'}]
 ]){const env=rig();const out=await call(env,variation[0],variation[1]);
  assert.equal(out.status,'DENIED');assert.equal(env.reads,0);}
});
test('atomic replay ledger missing blocks even a valid signature',async()=>{
 const e=await good(),env=rig();
 const out=await call(env,e,{nonceStore:null});
 assert.equal(out.reason,'ATOMIC_REPLAY_LEDGER_REQUIRED');
 assert.equal(env.reads,0);
});
test('already handled work stays NOOP without Notion reads',async()=>{
 const e=await good({already_handled:true}),env=rig();
 const out=await call(env,e);
 assert.equal(out.status,'DISPATCH_RECORDED');
 assert.equal(out.provider_status,'NOOP');
 assert.equal(env.reads,0);
});
