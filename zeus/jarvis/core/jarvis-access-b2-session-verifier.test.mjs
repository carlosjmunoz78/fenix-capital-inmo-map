import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,webcrypto} from 'node:crypto';
import {createJarvisAccessB2SessionVerifier} from './jarvis-access-b2-session-verifier.mjs';

const email='owner.synthetic@example.invalid';
const ownerId='zeus-owner:lab';
const accessUuid='988b11e1-21aa-4cf9-8b9d-110319df7ccc';
const audience='abcdef0123456789abcdef0123456789';
const now=Date.parse('2026-11-06T11:00:00Z');
const iat=Math.floor((now-60000)/1000);
const secret='3c'.repeat(32);
const env=()=>({
 JARVIS_B2_ACCESS_ENABLED:'true',
 JARVIS_ACCESS_AUD:audience,
 JARVIS_OWNER_EMAIL:email,
 JARVIS_OWNER_ID:ownerId,
 JARVIS_B2_HMAC_KEY_HEX:secret
});
const ctx=(identity={email,user_uuid:accessUuid,iat},aud=audience)=>({
 access:{aud,getIdentity:async()=>identity}
});
const hash=()=>createHmac('sha256',Buffer.from(secret,'hex'))
 .update('jarvis-b2-access-v1\0'+ownerId+'\0'+accessUuid+'\0'+iat).digest('hex');
function harness({row=null,enabled=true,clock=()=>now}={}){
 const queries=[];
 const store={async get(query){queries.push(query);return row}};
 const verifier=createJarvisAccessB2SessionVerifier({
  enabled,sessionStore:store,clock,cryptoImpl:webcrypto
 });
 return {verifier,queries,store};
}
const validRow=()=>({
 ownerId,sessionHmac:hash(),environment:'LAB',role:'OWNER_ROOT',
 active:true,revoked:false,expiresAt:now+3600_000,authorizedCompanies:['fenix']
});
test('CUT31 Access B2 defaults OFF and denies even verified owner',async()=>{
 const {verifier,queries}=harness({enabled:false,row:validRow()});
 await assert.rejects(verifier.verify({ctx:ctx(),env:env()}),/B2_ACCESS_SESSION_NOT_VERIFIED/);
 assert.equal(queries.length,0);
});
test('CUT31 requires WEBCRYPTO and private store, LAB only',()=>{
 assert.throws(()=>createJarvisAccessB2SessionVerifier({enabled:true}),/B2_ACCESS_TRUSTED_ADAPTERS_REQUIRED/);
 assert.throws(()=>createJarvisAccessB2SessionVerifier({enabled:true,environment:'PROD'}),/B2_ACCESS_LAB_ONLY/);
});
test('CUT31 Access owner has NO automatic role enrollment if D1 row is missing',async()=>{
 const h=harness();
 await assert.rejects(h.verifier.verify({ctx:ctx(),env:env()}),/NOT_VERIFIED/);
 assert.equal(h.queries.length,1);
 assert.equal(h.queries[0].ownerId,ownerId);
 assert.equal(h.queries[0].sessionHmac,hash());
 assert.equal(JSON.stringify(h.queries).includes(email),false);
 assert.equal(JSON.stringify(h.queries).includes(secret),false);
});
test('CUT31 full verified owner + pre-existing active B2 D1 session returns read-only principal',async()=>{
 const h=harness({row:validRow()});
 const result=await h.verifier.verify({ctx:ctx(),env:env()});
 assert.deepEqual(result,{ownerId,roles:['OWNER_ROOT'],
  authorizedCompanies:['fenix'],environment:'LAB',
  verifiedBy:'CLOUDFLARE_ACCESS_D1_SESSION',b3Granted:false});
 assert.ok(Object.isFrozen(result));assert.ok(Object.isFrozen(result.roles));
 for(const sensitive of [email,secret,accessUuid,hash(),String(iat)]){
  assert.equal(JSON.stringify(result).includes(sensitive),false);
 }
});
test('CUT31 absence of ctx.access or mismatch AUD/owner email denied before lookup',async()=>{
 const h=harness({row:validRow()});
 for(const p of [{ctx:{},env:env()},
  {ctx:ctx(undefined,'different-app-audience'),env:env()},
  {ctx:ctx({email:'someone.else@example.invalid',user_uuid:accessUuid,iat}),env:env()},
  {ctx:ctx(),env:{...env(),JARVIS_OWNER_EMAIL:'other@example.invalid'}}]){
  await assert.rejects(h.verifier.verify(p),/NOT_VERIFIED/);
 }
 assert.equal(h.queries.length,0);
});
test('CUT31 disabled runtime switch, missing owner ID or HMAC secret always denied',async()=>{
 const h=harness({row:validRow()});
 for(const values of [
  {...env(),JARVIS_B2_ACCESS_ENABLED:'false'},
  {...env(),JARVIS_OWNER_ID:undefined},
  {...env(),JARVIS_OWNER_ID:'*'},
  {...env(),JARVIS_B2_HMAC_KEY_HEX:''},
  {...env(),JARVIS_B2_HMAC_KEY_HEX:'wrong-format'}]){
  await assert.rejects(h.verifier.verify({ctx:ctx(),env:values}),/NOT_VERIFIED/);
 }
 assert.equal(h.queries.length,0);
});
test('CUT31 requires authenticated Access user UUID and issued-at, not fabricated headers',async()=>{
 const h=harness({row:validRow()});
 for(const identity of [null,{}, {email}, {email,user_uuid:'bad',iat},
   {email,user_uuid:accessUuid,iat:undefined},
   {email,user_uuid:accessUuid,iat:'not-integer'}]){
  await assert.rejects(h.verifier.verify({ctx:ctx(identity),env:env()}),/NOT_VERIFIED/);
 }
 assert.equal(h.queries.length,0);
});
test('CUT31 rejects stale or future issued-at and clock malfunction',async()=>{
 for(const [identity,clock] of [
  [{email,user_uuid:accessUuid,iat:Math.floor((now-48*3600e3)/1e3)},()=>now],
  [{email,user_uuid:accessUuid,iat:Math.floor((now+3600e3)/1e3)},()=>now],
  [{email,user_uuid:accessUuid,iat},()=>NaN],
  [{email,user_uuid:accessUuid,iat},()=>{throw Error('private clock')}]]){
  const h=harness({row:validRow(),clock});
  await assert.rejects(h.verifier.verify({ctx:ctx(identity),env:env()}),/NOT_VERIFIED/);
  assert.equal(h.queries.length,0);
 }
});
test('CUT31 D1 binding revoked, expired, inactive, wrong role, wrong hash always denies',async()=>{
 const base=validRow();
 for(const row of [
   {...base,revoked:true},
   {...base,active:false},
   {...base,expiresAt:now-1},
   {...base,role:'CUSTOMER'},
   {...base,environment:'PROD'},
   {...base,sessionHmac:'b'.repeat(64)},
   {...base,ownerId:'zeus-owner:other'},
   {...base,authorizedCompanies:['*']},
   {...base,authorizedCompanies:[]}]) {
  const h=harness({row});
  await assert.rejects(h.verifier.verify({ctx:ctx(),env:env()}),/NOT_VERIFIED/);
 }
});
test('CUT31 concurrent logins with distinct issued-at cannot reuse wrong session binding',async()=>{
 const h=harness({row:validRow()});
 const second=ctx({email,user_uuid:accessUuid,iat:iat+10});
 await assert.rejects(h.verifier.verify({ctx:second,env:env()}),/NOT_VERIFIED/);
 assert.notEqual(h.queries[0].sessionHmac,hash());
});
test('CUT31 identity/store/crypto failures are sanitized and fail closed',async()=>{
 const store={get:async()=>{throw Error('D1 PRIVATE SECRET')}};
 const verifier=createJarvisAccessB2SessionVerifier({enabled:true,sessionStore:store,cryptoImpl:webcrypto,clock:()=>now});
 await assert.rejects(verifier.verify({ctx:ctx(),env:env()}),
  e=>e.message==='B2_ACCESS_SESSION_NOT_VERIFIED');
 const h=harness({row:validRow()});
 await assert.rejects(h.verifier.verify({ctx:{access:{aud:audience,
  getIdentity:async()=>{throw Error('PRIVATE JWT')}}},env:env()}),
  e=>e.message==='B2_ACCESS_SESSION_NOT_VERIFIED');
});
