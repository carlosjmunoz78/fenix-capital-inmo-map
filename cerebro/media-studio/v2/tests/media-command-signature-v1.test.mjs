import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {makeMediaPayload,signMediaCommand,verifyMediaCommand,MEDIA_CAPABILITIES}
 from '../security/media-command-signature-v1.mjs';
const NOW=Date.parse('2026-11-12T08:30:00.000Z');
const NONCE='01234567-89ab-4cde-8fab-0123456789ab';
const make=(type,id)=>makeMediaPayload({media_type:type,request_id:'CEREBRO-REQ-001',
 order_id:id,nonce:NONCE,nowMs:NOW});
async function creds(){
 const pair=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
 const secret=Buffer.from(await crypto.subtle.exportKey('pkcs8',pair.privateKey)).toString('base64');
 const raw=await crypto.subtle.exportKey('spki',pair.publicKey);
 return {secret,publicSpkiBase64:Buffer.from(raw).toString('base64'),
  publicSpkiSha256:Buffer.from(await crypto.subtle.digest('SHA-256',raw)).toString('hex')};
}
const policy=(c,type,id)=>({...c,nowMs:NOW,
 allowedCapabilities:[MEDIA_CAPABILITIES[type==='image'?'IMAGE_QA_METADATA':'VIDEO_QA_METADATA']],
 allowedOrderIds:[id]});
test('same Ed25519 identity signs IMAGE and VIDEO with explicit distinct capabilities',async()=>{
 const c=await creds();
 for(const type of ['image','video']){
  const id=type==='image'?'CEREBRO-IMAGE-001':'CEREBRO-VIDEO-001';
  const signed=await signMediaCommand(make(type,id),c.secret,{nowMs:NOW});
  const r=await verifyMediaCommand(signed,policy(c,type,id));
  assert.equal(r.authenticated_origin,true);assert.equal(r.media_type,type);
  for(const k of ['authorized_for_publication','authorized_for_paid_execution','rights_approved','editorial_approved'])
   assert.equal(r[k],false);
 }
});
test('image-only verifier rejects valid video signature; video-only rejects image',async()=>{
 const c=await creds(),image=await signMediaCommand(make('image','CEREBRO-IMAGE-001'),c.secret,{nowMs:NOW}),
 video=await signMediaCommand(make('video','CEREBRO-VIDEO-001'),c.secret,{nowMs:NOW});
 await assert.rejects(verifyMediaCommand(video,policy(c,'image','CEREBRO-VIDEO-001')),/CAPABILITY_OR_ORDER_DENIED/);
 await assert.rejects(verifyMediaCommand(image,policy(c,'video','CEREBRO-IMAGE-001')),/CAPABILITY_OR_ORDER_DENIED/);
});
test('cannot change media_type after signature',async()=>{
 const c=await creds(),s=await signMediaCommand(make('image','CEREBRO-IMAGE-001'),c.secret,{nowMs:NOW});
 const tampered=structuredClone(s);tampered.payload.media_type='video';
 await assert.rejects(verifyMediaCommand(tampered,policy(c,'image','CEREBRO-IMAGE-001')),/CAPABILITY_SCOPE/);
});
test('cannot add paid or publish approvals to signed payload',async()=>{
 const c=await creds(),s=await signMediaCommand(make('image','CEREBRO-IMAGE-001'),c.secret,{nowMs:NOW});
 for(const field of ['publish_enabled','paid_execution_enabled','rights_approved','editorial_approved','production_enabled']){
  const t=structuredClone(s);t.payload[field]=true;
  await assert.rejects(verifyMediaCommand(t,policy(c,'image','CEREBRO-IMAGE-001')),/PAYLOAD_SCHEMA/);
 }
});
test('authentic signature alone cannot authorize a different video order',async()=>{
 const c=await creds(),s=await signMediaCommand(make('video','CEREBRO-VIDEO-002'),c.secret,{nowMs:NOW});
 await assert.rejects(verifyMediaCommand(s,policy(c,'video','CEREBRO-VIDEO-001')),/CAPABILITY_OR_ORDER_DENIED/);
});
test('independent SPKI fingerprint rejects unexpected rotation',async()=>{
 const c=await creds(),x=await creds(),s=await signMediaCommand(make('video','CEREBRO-VIDEO-001'),c.secret,{nowMs:NOW});
 await assert.rejects(verifyMediaCommand(s,{...policy(c,'video','CEREBRO-VIDEO-001'),
  publicSpkiBase64:x.publicSpkiBase64}),/TRUST_FINGERPRINT_MISMATCH/);
});
test('attacker signs with own key, trusted key remains separate',async()=>{
 const c=await creds(),x=await creds(),s=await signMediaCommand(make('image','CEREBRO-IMAGE-001'),x.secret,{nowMs:NOW});
 await assert.rejects(verifyMediaCommand(s,policy(c,'image','CEREBRO-IMAGE-001')),/SIGNATURE_INVALID/);
});
test('missing authorization policy fails closed',async()=>{
 const c=await creds(),s=await signMediaCommand(make('video','CEREBRO-VIDEO-001'),c.secret,{nowMs:NOW});
 await assert.rejects(verifyMediaCommand(s,{...c,nowMs:NOW}),/CAPABILITY_OR_ORDER_DENIED/);
});
test('stale command rejected before queue or publisher',async()=>{
 const c=await creds(),s=await signMediaCommand(make('image','CEREBRO-IMAGE-001'),c.secret,{nowMs:NOW});
 await assert.rejects(verifyMediaCommand(s,{...policy(c,'image','CEREBRO-IMAGE-001'),nowMs:NOW+181000}),/TIMING_EXPIRED/);
});
test('wrong tenant, PROD or engine refused',async()=>{
 for(const k of [{company_id:'other'},{engine_id:'UMS-002'},{environment:'PROD'}]){
  const p={...make('video','CEREBRO-VIDEO-001'),...k};
  await assert.rejects(signMediaCommand(p,(await creds()).secret,{nowMs:NOW}),/PAYLOAD_SCOPE/);
 }
});
test('invalid media type or new capabilities refused',()=>{
 assert.throws(()=>make('audio','CEREBRO-AUDIO-001'),/MEDIA_TYPE/);
 const p={...make('image','CEREBRO-IMAGE-001'),capability:'media.image.publish'};
 assert.throws(()=>makeMediaPayload({media_type:'image',request_id:p.request_id,order_id:p.order_id,nonce:p.nonce,nowMs:NaN}),/RangeError|TIMING/);
});
test('different order ID signed with same key cannot be reused against exact allowlist',async()=>{
 const c=await creds(),s=await signMediaCommand(make('image','CEREBRO-IMAGE-002'),c.secret,{nowMs:NOW});
 await assert.rejects(verifyMediaCommand(s,policy(c,'image','CEREBRO-IMAGE-001')),/CAPABILITY_OR_ORDER_DENIED/);
});
test('replay store is deliberately NOT claimed to exist in crypto module',async()=>{
 const c=await creds(),s=await signMediaCommand(make('video','CEREBRO-VIDEO-001'),c.secret,{nowMs:NOW});
 const r=await verifyMediaCommand(s,policy(c,'video','CEREBRO-VIDEO-001'));
 assert.equal(r.nonce,NONCE);assert.equal(Object.hasOwn(r,'replay_protected'),false);
});
