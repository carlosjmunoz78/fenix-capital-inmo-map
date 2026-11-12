/**
 * UMS001 private ED25519 signed QA ingress V2.
 * The caller-supplied actor_id is NOT authorization; the pinned independent
 * public key cryptographically identifies the isolated CEREBRO LAB scheduler.
 * No self-registration of trust keys, no unsigned or fallback paths.
 */
import {sendImageQaFromCerebro} from './sender-core.mjs';
export const SIGNED_QUEUE='cerebro-ums001-image-signed-command-lab-eu';
export const SIGNATURE_KEY_ID='UMS001-LAB-ORCH-ED25519-20261112-V1';
export const ISSUER='cerebro-ums001-signed-orchestrator-lab-eu';
const SCOPE=Object.freeze({schema_version:1,actor_id:'cerebro-orchestrator-lab',
 company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
 mode:'QA_METADATA_ONLY',action:'SUBMIT_ARCHIVED_LINKEDIN_QA'});
const EXPECTED_PAYLOAD_KEYS=[...Object.keys(SCOPE),'request_id','order_id','issuer',
 'issued_at','expires_at','nonce'];
const HASH=/^[A-Fa-f0-9]{64}$/;
const ID=/^UMS001-LAB-LI-FEED-01-ARCHIVE-[0-9]{8}$/;
const REQ=/^UMS001-SENDER-REQ-[A-Z0-9_-]{8,64}$/;
const NONCE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const fail=code=>{throw Error('UMS001_SIGNED_INBOX_'+code)};
const canon=o=>JSON.stringify(o,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?
 Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b,'en'))):v);
const fromBase64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const stableDate=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&
 new Date(s).toISOString()===s;
export async function verifyScheduledCommand(e,env,nowMs=Date.now()){
 if(env?.SIGNED_SENDER_ENABLED!=='true'||typeof env.ORCH_PUBLIC_SPKI_BASE64!=='string'||
    env.ORCH_PUBLIC_SPKI_BASE64.length<40)fail('TRUST_NOT_CONFIGURED');
 if(!e||typeof e!=='object'||Array.isArray(e)||Object.keys(e).length!==4||
    e.schema_version!==2||e.key_id!==SIGNATURE_KEY_ID||
    !Object.hasOwn(e,'payload')||!Object.hasOwn(e,'signature')||
    typeof e.signature!=='string')fail('SIGNED_ENVELOPE_SCHEMA_OR_KID');
 const p=e.payload;
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).length!==EXPECTED_PAYLOAD_KEYS.length||
    EXPECTED_PAYLOAD_KEYS.some(k=>!Object.hasOwn(p,k)))fail('SIGNED_PAYLOAD_SCHEMA');
 for(const [k,v] of Object.entries(SCOPE))if(p[k]!==v)fail('SIGNED_SCOPE_'+k);
 if(p.issuer!==ISSUER||!REQ.test(p.request_id||'')||
    !ID.test(p.order_id||'')||!NONCE.test(p.nonce||''))fail('SIGNED_IDENTITY');
 if(!stableDate(p.issued_at)||!stableDate(p.expires_at)||
    !Number.isFinite(nowMs))fail('SIGNED_TIME_SCHEMA');
 const issued=Date.parse(p.issued_at),expires=Date.parse(p.expires_at);
 if(expires<=issued||expires-issued>180000||issued>nowMs+30000||
    nowMs>expires||nowMs-issued>240000)fail('SIGNED_TIME_EXPIRED_OR_INVALID');
 if(!/^[A-Za-z0-9+/]{85,88}={0,2}$/.test(e.signature))
  fail('SIGNED_SIGNATURE_ENCODING');
 let ok=false;
 try{
  const key=await crypto.subtle.importKey('spki',fromBase64(env.ORCH_PUBLIC_SPKI_BASE64),
   {name:'Ed25519'},false,['verify']);
  ok=await crypto.subtle.verify('Ed25519',key,fromBase64(e.signature),
   new TextEncoder().encode(canon(p)));
 }catch{ok=false}
 if(!ok)fail('SIGNED_SIGNATURE_INVALID');
 return {command:Object.fromEntries(Object.keys(SCOPE).concat(['request_id','order_id'])
   .map(k=>[k,p[k]])),nonce:p.nonce,issuer:p.issuer,key_id:e.key_id};
}
export async function acceptSignedCommand(e,env,nowMs=Date.now()){
 const valid=await verifyScheduledCommand(e,env,nowMs);
 if(!env.SIGNED_REPLAY_KV||typeof env.SIGNED_REPLAY_KV.get!=='function'||
    typeof env.SIGNED_REPLAY_KV.put!=='function')fail('REPLAY_STORE_MISSING');
 const key='meta/ums001-ed25519-replay/v1/'+valid.nonce;
 const old=await env.SIGNED_REPLAY_KV.get(key,{type:'json'});
 if(old)return {status:'SIGNED_REPLAY_BLOCKED_NO_SEND',order_id:valid.command.order_id,
   key_id:valid.key_id,queued:0,publication:false};
 // Fail closed: a crash after CLAIMED requires operator reconciliation,
 // not an unbounded automatic retry or duplicate paid order.
 await env.SIGNED_REPLAY_KV.put(key,JSON.stringify({
  company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
  order_id:valid.command.order_id,issuer:valid.issuer,key_id:valid.key_id,
  stage:'CLAIMED',publication:false,paid_execution:false
 }));
 const delivered=await sendImageQaFromCerebro(valid.command,env);
 await env.SIGNED_REPLAY_KV.put(key,JSON.stringify({
  company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
  order_id:valid.command.order_id,issuer:valid.issuer,key_id:valid.key_id,
  stage:'QA_QUEUE_SUBMITTED',publication:false,paid_execution:false
 }));
 return {status:'ED25519_CEREBRO_ORIGIN_VERIFIED_TO_QA_QUEUE',key_id:valid.key_id,
  order_id:valid.command.order_id,queued:1,
  gateway_rpc_live:delivered.gateway_rpc_live,
  image_bytes_verified:false,signed_destination_receipt:false,
  publication:false,paid_execution:false,video:false};
}
