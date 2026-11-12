/**
 * CEREBRO OS · shared image/video COMMAND AUTHENTICATION contract (LAB)
 * One Ed25519 key pair for the CEREBRO issuer, separate signed capabilities.
 * Signing proves provenance only. It NEVER implies image/video rights,
 * commercial QA, spending permission or automatic publication.
 *
 * Input/output always contains company_id, engine_id, environment, version.
 * This module is a reusable pure gate; no Worker, network, ledger, or cron.
 */
export const SIGNATURE_VERSION=1;
export const KEY_ID='CEREBRO-UMS001-MEDIA-ED25519-V1';
export const ISSUER='cerebro-media-orchestrator';
export const MEDIA_CAPABILITIES=Object.freeze({
 IMAGE_QA_METADATA:'media.image.qa.metadata',
 VIDEO_QA_METADATA:'media.video.qa.metadata'
});
const REQUIRED=Object.freeze(['company_id','engine_id','environment','version',
 'media_type','capability','request_id','order_id','issuer','issued_at','expires_at','nonce']);
const ENVELOPE=Object.freeze(['signature_version','key_id','payload','signature']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HEX=/^[0-9a-f]{64}$/;
const BASE64=/^[A-Za-z0-9+/]+={0,2}$/;
const IDENT=/^[A-Za-z0-9][A-Za-z0-9_.:-]{2,127}$/;
const fail=s=>{throw Error('CEREBRO_MEDIA_SIGNATURE_'+s)};
const canonical=o=>JSON.stringify(o,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?
 Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b,'en'))):v);
const decode=s=>{
 if(typeof s!=='string'||!BASE64.test(s))fail('BASE64_INVALID');
 try{return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}catch{fail('BASE64_INVALID')}
};
const encode=s=>btoa(String.fromCharCode(...new Uint8Array(s)));
const isExact=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).length===keys.length&&keys.every(k=>Object.hasOwn(obj,k));
function assertPayload(p,nowMs){
 if(!isExact(p,REQUIRED))fail('PAYLOAD_SCHEMA');
 for(const k of ['company_id','engine_id','environment','request_id','order_id'])
  if(typeof p[k]!=='string'||!IDENT.test(p[k]))fail('PAYLOAD_ID');
 if(p.company_id!=='fenix'||p.engine_id!=='UMS-001'||p.environment!=='LAB'||
    p.version!=='1'||p.issuer!==ISSUER)fail('PAYLOAD_SCOPE');
 if(!['image','video'].includes(p.media_type))fail('MEDIA_TYPE');
 if(p.capability!==MEDIA_CAPABILITIES[p.media_type==='image'?'IMAGE_QA_METADATA':'VIDEO_QA_METADATA'])
  fail('CAPABILITY_SCOPE');
 if(!UUID.test(p.nonce||''))fail('NONCE_FORMAT');
 const issued=Date.parse(p.issued_at),expires=Date.parse(p.expires_at);
 if(!Number.isFinite(issued)||!Number.isFinite(expires)||
    new Date(issued).toISOString()!==p.issued_at||
    new Date(expires).toISOString()!==p.expires_at||
    expires<=issued||expires-issued>180000)fail('TIMING_SCHEMA');
 if(!Number.isFinite(nowMs)||nowMs<issued-30000||nowMs>expires)
  fail('TIMING_EXPIRED');
 return p;
}
export function makeMediaPayload({media_type,request_id,order_id,nonce,nowMs}){
 const p={company_id:'fenix',engine_id:'UMS-001',environment:'LAB',version:'1',
  media_type,capability:media_type==='image'?MEDIA_CAPABILITIES.IMAGE_QA_METADATA:
   media_type==='video'?MEDIA_CAPABILITIES.VIDEO_QA_METADATA:null,
  request_id,order_id,issuer:ISSUER,issued_at:new Date(nowMs).toISOString(),
  expires_at:new Date(nowMs+180000).toISOString(),nonce};
 return assertPayload(p,nowMs);
}
export async function signMediaCommand(payload,privatePkcs8Base64,{nowMs=Date.now()}={}){
 assertPayload(payload,nowMs);
 const key=await crypto.subtle.importKey('pkcs8',decode(privatePkcs8Base64),
  {name:'Ed25519'},false,['sign']);
 const data=new TextEncoder().encode(canonical(payload));
 const signature=await crypto.subtle.sign('Ed25519',key,data);
 return {signature_version:SIGNATURE_VERSION,key_id:KEY_ID,payload,signature:encode(signature)};
}
export async function verifyMediaCommand(envelope,{publicSpkiBase64,
 publicSpkiSha256,allowedCapabilities,allowedOrderIds,nowMs=Date.now()}={}){
 if(!isExact(envelope,ENVELOPE)||envelope.signature_version!==SIGNATURE_VERSION||
    envelope.key_id!==KEY_ID)fail('ENVELOPE_SCHEMA');
 const p=assertPayload(envelope.payload,nowMs);
 // Permission is not derived from a valid signature. Explicit caller policy
 // must declare EACH allowed media capability and exact order ID.
 if(!Array.isArray(allowedCapabilities)||!allowedCapabilities.includes(p.capability)||
    !Array.isArray(allowedOrderIds)||!allowedOrderIds.includes(p.order_id))
  fail('CAPABILITY_OR_ORDER_DENIED');
 if(typeof publicSpkiSha256!=='string'||!HEX.test(publicSpkiSha256))
  fail('TRUST_FINGERPRINT_MISSING');
 const pub=decode(publicSpkiBase64);
 const hash=await crypto.subtle.digest('SHA-256',pub);
 const fingerprint=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
 if(fingerprint!==publicSpkiSha256)fail('TRUST_FINGERPRINT_MISMATCH');
 let verified=false;
 try{
  const key=await crypto.subtle.importKey('spki',pub,{name:'Ed25519'},false,['verify']);
  verified=await crypto.subtle.verify('Ed25519',key,decode(envelope.signature),
   new TextEncoder().encode(canonical(p)));
 }catch{verified=false}
 if(!verified)fail('SIGNATURE_INVALID');
 // Replay persistence MUST be supplied and checked by the consumer.
 // No claim of atomicity/transactional idempotence is made by this module.
 return {key_id:KEY_ID,company_id:p.company_id,engine_id:p.engine_id,
  environment:p.environment,media_type:p.media_type,capability:p.capability,
  order_id:p.order_id,request_id:p.request_id,nonce:p.nonce,
  authenticated_origin:true,authorized_for_publication:false,
  authorized_for_paid_execution:false,rights_approved:false,
  editorial_approved:false};
}
