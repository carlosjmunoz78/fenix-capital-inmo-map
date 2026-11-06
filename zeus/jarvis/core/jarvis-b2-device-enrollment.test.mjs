import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHmac} from 'node:crypto';
import {createJarvisB2DeviceEnrollment} from './jarvis-b2-device-enrollment.mjs';
import {createJarvisB2DeviceSessionGate} from './jarvis-b2-device-session-gate.mjs';

const origin='https://cerebro-jarvis-lab-eu.carlosj-munozcabeza.workers.dev';
const owner='zeus-owner:lab',email='owner.synthetic@example.invalid';
const uuid='11111111-2222-4333-8444-555555555555',aud='abcdef0123456789abcdef0123456789';
const key='a1'.repeat(32),now=Date.parse('2026-11-06T10:30:00Z');
const env=()=>({JARVIS_ENVIRONMENT:'LAB',JARVIS_B2_B3_LIVE_ENABLED:'false',
 JARVIS_GATEWAY_ENABLED:'false',JARVIS_B2_ENROLLMENT_ENABLED:'true',
 JARVIS_B2_ENROLLMENT_UNTIL_MS:String(now+500000),
 JARVIS_ACCESS_AUD:aud,JARVIS_OWNER_EMAIL:email,JARVIS_OWNER_ID:owner,
 JARVIS_B2_HMAC_KEY_HEX:key});
const ctx=(address=email)=>({access:{aud,getIdentity:async()=>({email:address,user_uuid:uuid})}});
const request=(headers={})=>new Request(origin+'/__jarvis/b2-device-enroll',{
 method:'POST',headers:{origin,'sec-fetch-site':'same-origin',
  'x-jarvis-enrollment':'1',...headers}
});
function store(){
 const rows=new Map(),audits=[];
 const db={
  prepare(sql){return {bind(...args){return {sql,args}}}},
  async batch(statements){
   const [first,second]=statements;
   if(!first.sql.includes('jarvis_lab_session_binding_v0')||
      !second.sql.includes('jarvis_lab_b2_device_enrollment_audit_v0'))
    throw Error('WRONG_TABLE');
   const [ownerId,hmac,expires,issued]=first.args;
   const count=Array.from(rows.values()).filter(r=>r.active&&!r.revoked&&r.expiresAt>now).length;
   if(count>=2)return [{success:true,meta:{changes:0}}, {success:true,meta:{changes:0}}];
   rows.set(hmac,{ownerId,sessionHmac:hmac,role:'OWNER_ROOT',
    environment:'LAB',expiresAt:expires,active:true,revoked:false,
    authorizedCompanies:['fenix']});
   audits.push({ownerId,hmac,issued,expires});
   return [{success:true,meta:{changes:1}},{success:true,meta:{changes:1}}];
  }
 };
 return {rows,audits,db};
}
const issuer=db=>createJarvisB2DeviceEnrollment({enabled:true,db,clock:()=>now,
 cryptoImpl:webcrypto});
test('CUT32 enrollment defaults OFF and is LAB-only',async()=>{
 const no=createJarvisB2DeviceEnrollment();
 assert.equal((await no.enroll({request:request(),ctx:ctx(),env:env()})).status,503);
 assert.throws(()=>createJarvisB2DeviceEnrollment({enabled:true,environment:'PROD'}),/LAB_ONLY/);
 assert.throws(()=>createJarvisB2DeviceEnrollment({enabled:true}),/SERVER_ADAPTERS_REQUIRED/);
});
test('CUT32 enrollment rejects external POST, request without Origin, wrong method or header',async()=>{
 const s=store(),e=issuer(s.db);
 const cases=[
  request({'origin':'https://evil.invalid'}),
  request({'sec-fetch-site':'cross-site'}),
  request({'x-jarvis-enrollment':'0'}),
  new Request(origin+'/__jarvis/b2-device-enroll',{method:'GET'}),
  new Request(origin+'/__jarvis/b2-device-enroll?token=x',{method:'POST',
   headers:{origin,'sec-fetch-site':'same-origin','x-jarvis-enrollment':'1'}})
 ];
 for(const r of cases){
  const res=await e.enroll({request:r,ctx:ctx(),env:env()});
  assert.notEqual(res.status,201);
  assert.equal(res.headers.get('set-cookie'),null);
 }
 assert.equal(s.rows.size,0);assert.equal(s.audits.length,0);
});
test('CUT32 enrollment requires confirmed Access identity, audience and owner exact email',async()=>{
 const s=store(),e=issuer(s.db);
 for(const c of [{},{access:{aud:'wrong',getIdentity:async()=>({email,user_uuid:uuid})}},
  ctx('other@example.invalid'),{access:{aud,getIdentity:async()=>{throw Error('PRIVATE')}}}]){
  const res=await e.enroll({request:request(),ctx:c,env:env()});
  assert.notEqual(res.status,201);assert.equal(res.headers.get('set-cookie'),null);
 }
 assert.equal(s.rows.size,0);
});
test('CUT32 enrollment requires short explicit window and no B3 or Gateway',async()=>{
 const s=store(),e=issuer(s.db);
 for(const change of [
  {JARVIS_B2_ENROLLMENT_ENABLED:'false'},
  {JARVIS_B2_ENROLLMENT_UNTIL_MS:String(now-1)},
  {JARVIS_B2_ENROLLMENT_UNTIL_MS:String(now+9999999)},
  {JARVIS_B2_B3_LIVE_ENABLED:'true'},
  {JARVIS_GATEWAY_ENABLED:'true'},
  {JARVIS_ENVIRONMENT:'PROD'},
  {JARVIS_B2_HMAC_KEY_HEX:'bad'}
 ]){
  const res=await e.enroll({request:request(),ctx:ctx(),env:{...env(),...change}});
  assert.notEqual(res.status,201);
 }
 assert.equal(s.rows.size,0);
});
test('CUT32 one approved enrollment issues HttpOnly Secure host-only device cookie after atomic audit',async()=>{
 const s=store(),e=issuer(s.db);
 const res=await e.enroll({request:request(),ctx:ctx(),env:env()});
 assert.equal(res.status,201);
 const cookie=res.headers.get('set-cookie');
 assert.match(cookie,/^__Host-jarvis_b2=[A-Za-z0-9_-]{43}; Path=\/; Secure; HttpOnly; SameSite=Strict; Max-Age=1800$/);
 assert.equal(s.rows.size,1);assert.equal(s.audits.length,1);
 const body=await res.text();
 for(const sensitive of [email,uuid,key,owner,s.audits[0].hmac,cookie.slice(17,60)])
  assert.equal(body.includes(sensitive),false);
 assert.equal(JSON.parse(body).b3,'OFF');
});
test('CUT32 only 2 active device enrollments, third is denied without a cookie',async()=>{
 const s=store(),e=issuer(s.db);
 const a=await e.enroll({request:request(),ctx:ctx(),env:env()});
 const b=await e.enroll({request:request(),ctx:ctx(),env:env()});
 const c=await e.enroll({request:request(),ctx:ctx(),env:env()});
 assert.equal(a.status,201);assert.equal(b.status,201);assert.equal(c.status,503);
 assert.notEqual(a.headers.get('set-cookie'),b.headers.get('set-cookie'));
 assert.equal(c.headers.get('set-cookie'),null);
 assert.equal(s.rows.size,2);assert.equal(s.audits.length,2);
});
test('CUT32 issued cookie is verifiable by server gate, and revoking one preserves second',async()=>{
 const s=store(),e=issuer(s.db);
 const a=await e.enroll({request:request(),ctx:ctx(),env:env()});
 const b=await e.enroll({request:request(),ctx:ctx(),env:env()});
 const hmacStore={get:async({sessionHmac})=>s.rows.get(sessionHmac)??null};
 const gate=createJarvisB2DeviceSessionGate({
  enabled:true,sessionStore:hmacStore,cryptoImpl:webcrypto,clock:()=>now
 });
 const verify=async(res)=>gate.verify({
  request:new Request(origin+'/__jarvis/b2-device-status',{headers:{
   cookie:res.headers.get('set-cookie').split(';')[0]
  }}),ctx:ctx(),env:{...env(),JARVIS_B2_DEVICE_ENABLED:'true'}
 });
 assert.equal((await verify(a)).ownerId,owner);
 assert.equal((await verify(b)).ownerId,owner);
 const cookieA=a.headers.get('set-cookie').split(';')[0].split('=')[1];
 const digestA=createHmac('sha256',Buffer.from(key,'hex')).update(
  'jarvis-b2-device-v1\0'+owner+'\0'+uuid+'\0'+cookieA).digest('hex');
 s.rows.get(digestA).revoked=true;
 await assert.rejects(verify(a),/NOT_VERIFIED/);
 assert.equal((await verify(b)).ownerId,owner);
});
test('CUT32 D1 transaction errors and ambiguous audit confirmation return NO cookie',async()=>{
 const base=store();
 const e1=issuer({...base.db,batch:async()=>{throw Error('PRIVATE SQLITE ERROR')}});
 const r1=await e1.enroll({request:request(),ctx:ctx(),env:env()});
 assert.equal(r1.status,503);assert.equal(r1.headers.get('set-cookie'),null);
 const e2=issuer({...base.db,batch:async()=>[
  {success:true,meta:{changes:1}},{success:true,meta:{changes:0}}
 ]});
 const r2=await e2.enroll({request:request(),ctx:ctx(),env:env()});
 assert.equal(r2.status,503);assert.equal(r2.headers.get('set-cookie'),null);
});
