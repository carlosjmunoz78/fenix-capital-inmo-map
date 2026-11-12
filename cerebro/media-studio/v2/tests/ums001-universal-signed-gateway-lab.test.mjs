import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {validateMediaJob,validateEnvelope,canonical,envelopeSigningBody,verifySignedJob,acceptMediaJob}
 from '../cloudflare/ums001-universal-gateway-lab-eu/core.mjs';
const schema=JSON.parse(readFileSync(new URL('../contracts/media-job-request.v1.schema.json',import.meta.url),'utf8'));
const now=Date.parse('2026-11-12T11:30:00Z');
function request(o={}){
 return {schema_version:'1.0.0',event_type:'MEDIA_JOB_REQUESTED',request_id:'UMS001-GW-TEST-01',
  company_id:'fenix',engine_id:'UMS-001',origin_engine_id:'SOC-001',
  environment:'LAB',version:'1.0.0',trigger:'ENGINE_EVENT',asset_kind:'IMAGE',
  capability_id:'IMAGE.SYNTHETIC',item_id:'IG-FEED-01',consumer_engine_id:'SOC-001',
  channel_id:'INSTAGRAM',placement:'FEED',brief_ref:'cerebro://briefs/test/media',
  format:{profile_id:'IG_FEED_4_5',width_px:1080,height_px:1350,duration_seconds:null,output_mime:'image/png'},
  rights_profile:'SYNTHETIC_ORIGINAL',priority:'NORMAL',
  requested_at_utc:'2026-11-12T11:30:00Z',deadline_utc:null,policy_version:'ums001-v1',
  budget:{max_additional_cost_eur:0,max_attempts:2,prepaid_only:true,paid_execution_enabled:false,auto_recharge:false,publish_requested:false},
  reply_to:'cerebro://events/test/ums001',...o};
}
async function keys(){
 const pair=await crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
 const spki=new Uint8Array(await crypto.subtle.exportKey('spki',pair.publicKey));
 return {pair,issuer:{enabled:1,key_id:'UMS001-LAB-SOC-001-TEST-20261112',origin_engine_id:'SOC-001',
  company_id:'fenix',environment:'LAB',allowed_channels:'["INSTAGRAM","FACEBOOK","LINKEDIN"]',
  allowed_kinds:'["IMAGE","VIDEO"]',public_spki_base64:Buffer.from(spki).toString('base64'),
  public_spki_sha256:Buffer.from(await crypto.subtle.digest('SHA-256',spki)).toString('hex')}};
}
async function signed(k,r=request()){
 const e={schema_version:1,key_id:k.issuer.key_id,issuer:'SOC-001',
  sent_at_utc:'2026-11-12T11:30:00Z',nonce:randomUUID(),payload:r};
 const signature=await crypto.subtle.sign('Ed25519',k.pair.privateKey,
  new TextEncoder().encode(envelopeSigningBody(e)));
 return {...e,signature:Buffer.from(signature).toString('base64')};
}
function mock(issuer){
 const data={issuer,jobs:new Map(),nonces:new Set(),events:new Set(),rejections:[]};
 return {data,prepare(sql){
  return {bind(...params){return {
   async first(){
    if(sql.includes('media_issuers'))return params[0]===issuer.key_id?issuer:null;
    if(sql.includes('media_jobs'))return data.jobs.get(params[0])||null;return null;
   },
   async run(){
    let changes=0;
    if(sql.includes('INTO media_nonces')){const key=params.slice(0,2).join(':');if(!data.nonces.has(key)){data.nonces.add(key);changes=1;}}
    if(sql.includes('INTO media_jobs')){if(!data.jobs.has(params[0])){data.jobs.set(params[0],{request_sha256:params[9],status:params[10]});changes=1;}}
    if(sql.includes('INTO media_events')){if(!data.events.has(params[0])){data.events.add(params[0]);changes=1;}}
    return {meta:{changes}};
   }
  }}};
 }};
}
test('Cloudflare core and canonical wire share all required fields',()=>{
 const r=request();assert.equal(validateMediaJob(r),r);
 assert.deepEqual(Object.keys(r).sort(),[...schema.required].sort());
 assert.throws(()=>validateMediaJob({...r,admin:true}),/SCHEMA/);
});
test('signed real Ed25519 LAB Social image accepted durably exactly once',async()=>{
 const k=await keys(),e=await signed(k),db=mock(k.issuer);
 assert.equal(validateEnvelope(e),e);
 assert.equal((await verifySignedJob(e,k.issuer,now)).r.request_id,e.payload.request_id);
 const once=await acceptMediaJob(db,e,now);
 assert.equal(once.status,'REGISTERED_QA_PENDING');assert.equal(once.cost_eur,0);
 assert.equal(db.data.jobs.size,1);assert.equal(db.data.events.size,1);
 const twice=await acceptMediaJob(db,e,now);assert.equal(twice.status,'DUPLICATE_ACCEPTED');
 assert.equal(db.data.jobs.size,1);assert.equal(db.data.events.size,1);
});
test('signed Video for future TikTok can be registered without running generator',async()=>{
 const k=await keys();k.issuer.allowed_channels='["TIKTOK"]';
 const e=await signed(k,request({asset_kind:'VIDEO',capability_id:'VIDEO.SHORT',channel_id:'TIKTOK',
  placement:'SHORT',item_id:'TIKTOK-VIDEO-001',
  format:{profile_id:'VERTICAL_9_16',width_px:1080,height_px:1920,duration_seconds:20,output_mime:'video/mp4'}}));
 const db=mock(k.issuer),result=await acceptMediaJob(db,e,now);
 assert.equal(result.status,'REGISTERED_QA_PENDING');assert.equal(db.data.jobs.size,1);
});
test('unknown issuer and changed signature reject, no durable job',async()=>{
 const k=await keys(),e=await signed(k),db=mock(k.issuer);
 await assert.rejects(acceptMediaJob(mock({...k.issuer,enabled:0}),e,now),/UNTRUSTED_ISSUER/);
 await assert.rejects(acceptMediaJob(db,{...e,payload:{...e.payload,priority:'HIGH'}},now),/SIGNED_SIGNATURE_INVALID/);
 assert.equal(db.data.jobs.size,0);
});
test('wrong fingerprint, invalid nonce, time expiry, unauthorized channel fail closed',async()=>{
 const k=await keys(),e=await signed(k);
 await assert.rejects(verifySignedJob(e,{...k.issuer,public_spki_sha256:'a'.repeat(64)},now),/TRUST_FINGERPRINT_MISMATCH/);
 await assert.rejects(verifySignedJob({...e,nonce:'INVALID'},k.issuer,now),/SIGNED_SCHEMA/);
 await assert.rejects(verifySignedJob(e,k.issuer,now+200000),/SIGNED_TIME_EXPIRED/);
 await assert.rejects(verifySignedJob(e,{...k.issuer,allowed_channels:'["SEO"]'},now),/ISSUER_PERMISSION/);
});
test('budget elevation, publishing, unauthorized person, unknown extra key always blocked',async()=>{
 const k=await keys();const o=request();
 for(const [field,value] of [['paid_execution_enabled',true],['auto_recharge',true],['publish_requested',true],['max_additional_cost_eur',1]]) {
  const invalid=request({budget:{...o.budget,[field]:value}});
  await assert.rejects(acceptMediaJob(mock(k.issuer),await signed(k,invalid),now),/MONEY_LIMIT/);
 }
 const human=await signed(k,request({rights_profile:'AUTHORIZED_PERSON'}));
 await assert.rejects(verifySignedJob(human,k.issuer,now),/LEGAL_REQUIRED/);
 assert.throws(()=>validateMediaJob({...o,secret:'no'}),/SCHEMA/);
});
test('foreign tenancy, cross-engine or non-LAB environment rejected',async()=>{
 const k=await keys();
 const e=await signed(k,request({company_id:'other'}));
 await assert.rejects(verifySignedJob(e,k.issuer,now),/UNTRUSTED_ISSUER/);
 assert.throws(()=>validateMediaJob(request({environment:'PROD'})),/SCHEMA_SCOPE/);
});
