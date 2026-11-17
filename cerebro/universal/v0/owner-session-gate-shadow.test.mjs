import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authorizeOwnerLabRead} from './owner-session-gate-shadow.mjs';
const user='11111111-1111-4111-a111-111111111111';
const sid='22222222-2222-4222-a222-222222222222';
const issuer='https://cluhljgonannaafpmblx.supabase.co/auth/v1';
const now=Date.parse('2026-11-16T12:00:00.000Z');
const base=()=>({issuer,environment:'LAB',nowMs:now,
 identity:{actor_code:'CARLOS-ADMIN',active:true,company_id:'fenix',user_id:user},
 verifiedClaims:{iss:issuer,sub:user,session_id:sid,exp:Math.floor(now/1000)+600,
  iat:Math.floor(now/1000)-600}});
const live=async()=>({id:sid,user_id:user,not_after:null});
test('shadow: valid owner requires live authoritative session, not only valid JWT',async()=>{
 let checks=0;
 const result=await authorizeOwnerLabRead(base(),async q=>{
  checks++;assert.deepEqual(q,{sessionId:sid,userId:user});return live();
 });
 assert.equal(checks,1);assert.deepEqual(result,{status:'ALLOW',
  reason:'ACTIVE_SESSION_CONFIRMED_BY_SERVER',authorized:true,read_only:true,executed:false});
});
test('shadow: valid signed token but revoked/missing session denies',async()=>{
 const r=await authorizeOwnerLabRead(base(),async()=>null);
 assert.equal(r.status,'DENIED');assert.equal(r.reason,'SESSION_REVOKED_OR_EXPIRED');
});
test('shadow: absent reader fails closed',async()=>{
 const r=await authorizeOwnerLabRead(base(),undefined);
 assert.equal(r.status,'DENIED');assert.equal(r.reason,'TRUSTED_SESSION_READER_REQUIRED');
});
test('shadow: rejects other owner, other company, env, issuer, expired or forged claims before privileged lookup',async()=>{
 let reads=0;const reader=async()=>{reads++;return live()};
 const x=base();
 const cases=[
  {...x,environment:'PROD'},
  {...x,issuer:'https://malicious.example/auth/v1'},
  {...x,identity:{...x.identity,actor_code:'OTHER'}},
  {...x,identity:{...x.identity,company_id:'other'}},
  {...x,identity:{...x.identity,active:false}},
  {...x,verifiedClaims:{...x.verifiedClaims,iss:'https://other.supabase.co/auth/v1'}},
  {...x,verifiedClaims:{...x.verifiedClaims,sub:'33333333-3333-4333-a333-333333333333'}},
  {...x,verifiedClaims:{...x.verifiedClaims,session_id:'NOT_UUID'}},
  {...x,verifiedClaims:{...x.verifiedClaims,exp:Math.floor(now/1000)}},
  {...x,verifiedClaims:{...x.verifiedClaims,nbf:Math.floor(now/1000)+300}},
  {...x,verifiedClaims:{...x.verifiedClaims,iat:Math.floor(now/1000)+300}},
  {...x,nowMs:NaN}
 ];
 for(const bad of cases){const r=await authorizeOwnerLabRead(bad,reader);
  assert.equal(r.authorized,false,JSON.stringify(bad).slice(0,120));
  assert.equal(r.executed,false);
 }
 assert.equal(reads,0);
});
test('shadow: wrong owner session, wrong session ID, expired session, query outage all deny',async()=>{
 const x=base();
 const cases=[
  async()=>({id:sid,user_id:'33333333-3333-4333-a333-333333333333'}),
  async()=>({id:'33333333-3333-4333-a333-333333333333',user_id:user}),
  async()=>({id:sid,user_id:user,not_after:'2026-11-16T11:59:00.000Z'}),
  async()=>{throw Error('secret: DONT_LOG')}
 ];
 for(const reader of cases){const r=await authorizeOwnerLabRead(x,reader);
  assert.equal(r.authorized,false);assert.ok(!JSON.stringify(r).includes('DONT_LOG'));
 }
});
test('shadow: result never includes token, session ID, owner ID or request payload',async()=>{
 const r=await authorizeOwnerLabRead(base(),live);
 const wire=JSON.stringify(r);
 assert.ok(!wire.includes(sid));assert.ok(!wire.includes(user));
 assert.ok(!wire.includes('Bearer'));assert.ok(!wire.includes('token'));
});
