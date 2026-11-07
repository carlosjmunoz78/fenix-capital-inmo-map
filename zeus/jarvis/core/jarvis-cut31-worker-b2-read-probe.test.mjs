import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import app from '../cloudflare-lab/worker-b2-read-probe.mjs';

const uuid='988b11e1-21aa-4cf9-8b9d-110319df7ccc';
const owner='zeus-owner:lab';
const email='owner.synthetic@example.invalid';
const aud='abcdef0123456789abcdef0123456789';
const secret='3c'.repeat(32);
const iat=Math.floor((Date.now()-120_000)/1000);
const hash=createHmac('sha256',Buffer.from(secret,'hex'))
 .update('jarvis-b2-access-v1\0'+owner+'\0'+uuid+'\0'+iat).digest('hex');
const ctx=({email:e=email,user_uuid=uuid,iat:issued=iat}={},appAud=aud)=>({
 access:{aud:appAud,getIdentity:async()=>({email:e,user_uuid,iat:issued})}
});
const req=(method='GET',path='/__jarvis/b2-status')=>new Request(
 'https://cerebro-jarvis-lab-eu.synthetic.workers.dev'+path,{method,
 headers:{'cf-access-jwt-assertion':'forged-jwt-that-must-not-be-trusted'}}
);
function bindings({exists=true,revoked=0,expired=false}={}){
 const calls=[];
 const row={owner_id:owner,session_hmac:hash,environment:'LAB',
 channel:'cloudflare-access',role:'OWNER_ROOT',active:1,revoked,
 authorized_companies_json:'["fenix"]',expires_at_ms:Date.now()+(expired?-10000:3600000),
 issued_at_ms:iat*1000};
 const db={prepare(sql){calls.push(sql);return{bind(...args){return{
  async first(){
   const [ownerId,sessionHmac,channel]=args;
   if(!exists||ownerId!==owner||sessionHmac!==hash||
      channel!=='cloudflare-access'||revoked||expired)return null;
   return row;
  }
 }}}}};
 return {calls,env:{
 JARVIS_ENVIRONMENT:'LAB',JARVIS_ACCESS_PROBE_ENABLED:'true',
 JARVIS_B2_ACCESS_ENABLED:'true',JARVIS_B2_B3_LIVE_ENABLED:'false',
 JARVIS_GATEWAY_ENABLED:'false',JARVIS_LAB_DB:db,
 JARVIS_ACCESS_AUD:aud,JARVIS_OWNER_EMAIL:email,JARVIS_OWNER_ID:owner,
 JARVIS_B2_HMAC_KEY_HEX:secret
 }};
}
test('CUT31 B2 route OFF by default and has no access to D1',async()=>{
 const b=bindings();b.env.JARVIS_B2_ACCESS_ENABLED='false';
 assert.equal((await app.fetch(req(),b.env,ctx())).status,503);
 assert.equal(b.calls.length,0);
});
test('CUT31 unauthenticated, spoofed headers and wrong audience cannot read session',async()=>{
 for(const c of [{},ctx({},'different-app-audience'),
  ctx({email:'other@example.invalid'})]){
  const b=bindings();const response=await app.fetch(req(),b.env,c);
  assert.equal(response.status,403);
  assert.equal(b.calls.length,0);
 }
});
test('CUT31 existing LAB B2 D1 binding allows status ONLY, not B3 or Gateway',async()=>{
 const b=bindings();const response=await app.fetch(req(),b.env,ctx());
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{
  status:'B2_SESSION_VERIFIED_NO_B3_GRANTS',environment:'LAB',
  b3:'OFF',gateway:'OFF',prod:'NO_GO'
 });
 assert.equal(b.calls.length,1);
 const body=JSON.stringify(await (await app.fetch(req(),b.env,ctx())).json());
 for(const forbidden of [email,secret,uuid,hash,owner])
  assert.equal(body.includes(forbidden),false);
});
test('CUT31 missing, revoked and expired D1 row fail closed',async()=>{
 for(const variant of [{exists:false},{revoked:1},{expired:true}]){
  const b=bindings(variant);
  assert.equal((await app.fetch(req(),b.env,ctx())).status,403);
 }
});
test('CUT31 no POST, query, PROD, unknown route or missing binding',async()=>{
 const b=bindings();
 assert.equal((await app.fetch(req('POST'),b.env,ctx())).status,405);
 assert.equal((await app.fetch(req('GET','/__jarvis/b2-status?x=1'),b.env,ctx())).status,404);
 assert.equal((await app.fetch(req(),{...b.env,JARVIS_ENVIRONMENT:'PROD'},ctx())).status,503);
 assert.equal((await app.fetch(req(),{...b.env,JARVIS_LAB_DB:null},ctx())).status,503);
 assert.notEqual((await app.fetch(req('GET','/v1/missions/private'),b.env,ctx())).status,200);
});
