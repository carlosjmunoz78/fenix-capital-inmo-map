import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomBytes,webcrypto} from 'node:crypto';
import {B2_DEVICE_COOKIE,createJarvisB2DeviceSessionGate} from './jarvis-b2-device-session-gate.mjs';

const email='synthetic-owner@example.invalid',ownerId='zeus-owner:lab';
const uuid='11111111-2222-4333-8444-555555555555';
const aud='abcdef0123456789abcdef0123456789';
const key='a1'.repeat(32),now=Date.parse('2026-11-06T10:30:00Z');
const cookieA=randomBytes(32).toString('base64url');
const cookieB=randomBytes(32).toString('base64url');
const env=()=>({JARVIS_B2_DEVICE_ENABLED:'true',JARVIS_ACCESS_AUD:aud,
 JARVIS_OWNER_EMAIL:email,JARVIS_OWNER_ID:ownerId,JARVIS_B2_HMAC_KEY_HEX:key});
const ctx=(identity={email,user_uuid:uuid})=>({
 access:{aud,getIdentity:async()=>identity}
});
const req=(c=cookieA,h={})=>new Request('https://jarvis-lab.invalid/__jarvis/b2-device-status',{
 headers:{cookie:B2_DEVICE_COOKIE+'='+c,...h}
});
const hmac=c=>createHmac('sha256',Buffer.from(key,'hex')).update(
 'jarvis-b2-device-v1\0'+ownerId+'\0'+uuid+'\0'+c
).digest('hex');
const record=(c,over={})=>({
 ownerId,sessionHmac:hmac(c),environment:'LAB',role:'OWNER_ROOT',
 active:true,revoked:false,expiresAt:now+3600000,
 authorizedCompanies:['fenix'],...over
});
function system(records=new Map(),other={}){
 const lookups=[];const sessionStore={async get(query){
  lookups.push(query);return records.get(query.sessionHmac)??null
 }};
 const gate=createJarvisB2DeviceSessionGate({
  enabled:true,sessionStore,clock:()=>now,cryptoImpl:webcrypto,...other
 });
 return {gate,lookups};
}
test('CUT32 OFF by default requires explicit LAB runtime switch',async()=>{
 const store={get:async()=>{throw Error('never')}};
 const off=createJarvisB2DeviceSessionGate({sessionStore:store});
 await assert.rejects(off.verify({request:req(),ctx:ctx(),env:env()}),/NOT_VERIFIED/);
 const h=system(new Map([[hmac(cookieA),record(cookieA)]]));
 await assert.rejects(h.gate.verify({request:req(),ctx:ctx(),
  env:{...env(),JARVIS_B2_DEVICE_ENABLED:'false'}}),/NOT_VERIFIED/);
 assert.equal(h.lookups.length,0);
});
test('CUT32 rejects enablement outside LAB and missing trusted crypto/store',()=>{
 assert.throws(()=>createJarvisB2DeviceSessionGate({enabled:true,environment:'PROD'}),/LAB_ONLY/);
 assert.throws(()=>createJarvisB2DeviceSessionGate({enabled:true}),/TRUSTED_ADAPTERS_REQUIRED/);
});
test('CUT32 identity alone never grants access without enrolled D1 device session',async()=>{
 const h=system();
 await assert.rejects(h.gate.verify({request:req(),ctx:ctx(),env:env()}),/NOT_VERIFIED/);
 assert.equal(h.lookups.length,1);
 assert.equal(h.lookups[0].sessionHmac,hmac(cookieA));
 assert.equal(JSON.stringify(h.lookups).includes(cookieA),false);
});
test('CUT32 two independent devices have different HMAC even with identical Access UUID and login',async()=>{
 const rows=new Map([[hmac(cookieA),record(cookieA)],[hmac(cookieB),record(cookieB)]]);
 const h=system(rows);
 const a=await h.gate.verify({request:req(cookieA),ctx:ctx(),env:env()});
 const b=await h.gate.verify({request:req(cookieB),ctx:ctx(),env:env()});
 assert.deepEqual(a,b);
 assert.notEqual(hmac(cookieA),hmac(cookieB));
 assert.equal(h.lookups.length,2);
 assert.deepEqual(a,{ownerId,roles:['OWNER_ROOT'],authorizedCompanies:['fenix'],
  environment:'LAB',b3Granted:false,verifiedBy:'ACCESS_AND_PER_DEVICE_D1_SESSION'});
});
test('CUT32 revoking device A does not revoke still-registered device B',async()=>{
 const rows=new Map([[hmac(cookieA),record(cookieA)],[hmac(cookieB),record(cookieB)]]);
 const h=system(rows);
 assert.equal((await h.gate.verify({request:req(cookieA),ctx:ctx(),env:env()})).ownerId,ownerId);
 rows.set(hmac(cookieA),record(cookieA,{revoked:true}));
 await assert.rejects(h.gate.verify({request:req(cookieA),ctx:ctx(),env:env()}),/NOT_VERIFIED/);
 assert.equal((await h.gate.verify({request:req(cookieB),ctx:ctx(),env:env()})).ownerId,ownerId);
});
test('CUT32 missing, malformed and duplicate device cookies fail before D1',async()=>{
 const rows=new Map([[hmac(cookieA),record(cookieA)]]);
 const h=system(rows);
 const examples=[
 new Request('https://jarvis-lab.invalid/__jarvis/b2-device-status'),
 req('short'),
 req(cookieA,{cookie:B2_DEVICE_COOKIE+'='+cookieA+'; '+B2_DEVICE_COOKIE+'='+cookieA}),
 req(cookieA,{cookie:B2_DEVICE_COOKIE+'='+cookieA+'; '+B2_DEVICE_COOKIE+'=x'}),
 req(cookieA,{cookie:'other=abc'}),
 req(cookieA,{cookie:B2_DEVICE_COOKIE+'='+'a'.repeat(9000)})
 ];
 for(const request of examples)
  await assert.rejects(h.gate.verify({request,ctx:ctx(),env:env()}),/NOT_VERIFIED/);
 assert.equal(h.lookups.length,0);
});
test('CUT32 rejects wrong Access application, other owner and untrusted headers',async()=>{
 const h=system(new Map([[hmac(cookieA),record(cookieA)]]));
 for(const principal of [
  null,{}, {access:{aud:'not-our-access-app',getIdentity:async()=>({email,user_uuid:uuid})}},
  ctx({email:'stranger@example.invalid',user_uuid:uuid}),
  ctx({email,user_uuid:'other'}),
  {access:{aud,getIdentity:async()=>{throw Error('private token')}}}
 ]){
  await assert.rejects(h.gate.verify({request:req(),ctx:principal,env:env()}),
   e=>e.message==='B2_DEVICE_SESSION_NOT_VERIFIED');
 }
 assert.equal(h.lookups.length,0);
});
test('CUT32 invalid secret/owner and missing clock denies before D1',async()=>{
 const h=system(new Map([[hmac(cookieA),record(cookieA)]]));
 for(const patch of [{JARVIS_B2_HMAC_KEY_HEX:'short'},
   {JARVIS_OWNER_ID:''},{JARVIS_OWNER_ID:undefined},
   {JARVIS_OWNER_EMAIL:'WRONG@EXAMPLE.INVALID'},
   {JARVIS_ACCESS_AUD:undefined}]){
  await assert.rejects(h.gate.verify({request:req(),ctx:ctx(),env:{...env(),...patch}}),
   /NOT_VERIFIED/);
 }
 const bad=system(new Map([[hmac(cookieA),record(cookieA)]]),{clock:()=>NaN});
 await assert.rejects(bad.gate.verify({request:req(),ctx:ctx(),env:env()}),/NOT_VERIFIED/);
 assert.equal(h.lookups.length,0);
});
test('CUT32 D1 row invalidities deny with no additional power',async()=>{
 for(const override of [
  {active:false},{revoked:true},{expiresAt:now-1},
  {environment:'PROD'},{role:'STAFF'},{authorizedCompanies:['*']},
  {authorizedCompanies:[]},{sessionHmac:'f'.repeat(64)}
 ]){
  const h=system(new Map([[hmac(cookieA),record(cookieA,override)]]));
  await assert.rejects(h.gate.verify({request:req(),ctx:ctx(),env:env()}),/NOT_VERIFIED/);
 }
});
test('CUT32 no secrets or device credential appear in returned principal',async()=>{
 const h=system(new Map([[hmac(cookieA),record(cookieA)]]));
 const result=await h.gate.verify({request:req(),ctx:ctx(),env:env()});
 for(const privateValue of [cookieA,key,email,uuid,hmac(cookieA)])
  assert.equal(JSON.stringify(result).includes(privateValue),false);
 assert.equal(result.b3Granted,false);
});
