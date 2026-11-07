import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisAccessOwnerCanary} from './jarvis-access-owner-canary.mjs';

const aud='abcdef0123456789abcdef0123456789';
const email='synthetic-owner@example.invalid';
const req=(path='/__jarvis/owner-check',method='GET',headers={})=>
 new Request('https://jarvis-lab.example.invalid'+path,{method,
 headers:{authorization:'Bearer client-spoof', 'cf-access-jwt-assertion':'forged.jwt.text',...headers}});
const env=()=>({
 JARVIS_ACCESS_PROBE_ENABLED:'true',
 JARVIS_ACCESS_AUD:aud,
 JARVIS_OWNER_EMAIL:email
});
const ctx=(identity={email})=>({access:{aud,getIdentity:async()=>identity}});
const app=createJarvisAccessOwnerCanary({enabled:true});

test('CUT30 off by default even with spoofed access header and forged runtime ctx',async()=>{
 let called=0;
 const off=createJarvisAccessOwnerCanary();
 const res=await off.fetch(req(),{...env()}, {access:{
  aud,getIdentity:async()=>{called++;return {email}}
 }});
 assert.equal(res.status,503);assert.equal(called,0);
});
test('CUT30 runtime kill switch defaults to disabled and ignores authentication',async()=>{
 let called=0;
 const response=await app.fetch(req(),{...env(),JARVIS_ACCESS_PROBE_ENABLED:'false'},{
  access:{aud,getIdentity:async()=>{called++;return{email}}}
 });
 assert.equal(response.status,503);assert.equal(called,0);
});
test('CUT30 no ctx.access is always forbidden even with forged JWT and email headers',async()=>{
 assert.equal((await app.fetch(req(),env(),{})).status,403);
 assert.equal((await app.fetch(req(),env(),{access:{aud}})).status,403);
});
test('CUT30 denied on different Access application audience',async()=>{
 let called=0;
 const response=await app.fetch(req(),env(),{
  access:{aud:'0123456789abcdef0123456789abcdef',
    getIdentity:async()=>{called++;return {email}}}
 });
 assert.equal(response.status,403);assert.equal(called,0);
});
test('CUT30 unauthorized identities and blank identity are forbidden',async()=>{
 for(const value of [null,{}, {email:'other@example.invalid'}, {email:'  '+email},
  {email:'synthetic-owner@other.invalid'},{email:null}]){
  const result=await app.fetch(req(),env(),ctx(value));
  assert.equal(result.status,403);
 }
});
test('CUT30 no server-only owner email or audience means fail closed',async()=>{
 for(const e of [{...env(),JARVIS_OWNER_EMAIL:undefined},
  {...env(),JARVIS_ACCESS_AUD:undefined},
  {...env(),JARVIS_OWNER_EMAIL:'BAD@EXAMPLE.INVALID'},
  {...env(),JARVIS_ACCESS_AUD:'bad'},
  {...env(),JARVIS_OWNER_EMAIL:'anybody'}]){
   assert.equal((await app.fetch(req(),e,ctx())).status,503);
 }
});
test('CUT30 identity service errors are sanitized',async()=>{
 const result=await app.fetch(req(),env(),{access:{
  aud,getIdentity:async()=>{throw Error('SECRET JWT + IP address')}
 }});
 assert.equal(result.status,403);
 assert.equal((await result.text()).includes('SECRET'),false);
});
test('CUT30 no non-GET method, arbitrary route or query allowed',async()=>{
 for(const r of [req('/__jarvis/owner-check','POST'),
  req('/v1/missions/cut29'),req('/__jarvis/owner-check?email='+email),
  req('/__jarvis/owner-check#stuff')]){
  const response=await app.fetch(r,env(),ctx());
  assert.notEqual(response.status,200);
 }
});
test('CUT30 verified Access ctx and bound owner return ONLY LAB probe, never data',async()=>{
 const response=await app.fetch(req(),env(),ctx());
 assert.equal(response.status,200);
 const body=await response.json();
 assert.deepEqual(body,{
  status:'ACCESS_OWNER_VERIFIED',environment:'LAB',
  b2Enrollment:'NOT_STARTED',gateway:'OFF',permissions:'NONE',prod:'NO_GO'
 });
 for(const privateValue of [email,aud,'cf-access-jwt-assertion','synthetic-owner']){
  assert.equal(JSON.stringify(body).includes(privateValue),false);
 }
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(response.headers.get('x-frame-options'),'DENY');
});
test('CUT30 cannot enable outside LAB',()=>{
 assert.throws(()=>createJarvisAccessOwnerCanary({enabled:true,environment:'PROD'}),/ACCESS_LAB_ONLY/);
});
