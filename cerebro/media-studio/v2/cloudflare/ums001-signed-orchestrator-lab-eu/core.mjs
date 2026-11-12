/**
 * UMS-001 LAB: physically scheduled CEREBRO image QA canary issuer.
 * Only one previously archived LinkedIn metadata order. No paid inference,
 * image download, customer dispatch, publication or PROD access.
 *
 * Private Ed25519 PKCS8 key is stored as a Cloudflare Worker secret, never
 * emitted in a Queue message or log. The distinct receiver holds public key.
 * ONE-SHOT KV claim fails closed; KV is not a transactional FINOPS ledger.
 */
export const SCOPE={schema_version:1,actor_id:'cerebro-orchestrator-lab',
 company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
 mode:'QA_METADATA_ONLY',action:'SUBMIT_ARCHIVED_LINKEDIN_QA'};
export const SIGNATURE_KEY_ID='UMS001-LAB-ORCH-ED25519-20261112-V2';
export const ISSUER='cerebro-ums001-signed-orchestrator-lab-eu';
export const ONCE_KEY='meta/ums001-signed-once/v1/fenix/UMS-001/LAB/LI-FEED-01-DIAG03';
export const ORDER_ID='UMS001-LAB-LI-FEED-01-ARCHIVE-20261118';
const REQUEST_ID='UMS001-SENDER-REQ-AUTOSIGNED20261112';
const DEADLINE=Date.parse('2026-11-13T00:00:00Z');
const fail=code=>{throw Error('UMS001_ORCH_SIGNED_'+code)};
const canon=o=>JSON.stringify(o,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?
 Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b,'en'))):v);
const fromBase64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const toBase64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
export function buildScheduledPayload(nowMs,nonce){
 if(!Number.isFinite(nowMs)||nowMs<=0||nowMs>DEADLINE||!/^[-0-9a-f]{36}$/.test(nonce||''))
  fail('INVALID_SCHEDULED_INPUT');
 return {...SCOPE,request_id:REQUEST_ID,order_id:ORDER_ID,issuer:ISSUER,
   issued_at:new Date(nowMs).toISOString(),expires_at:new Date(nowMs+180000).toISOString(),
   nonce};
}
export async function signScheduledPayload(payload,secret){
 if(typeof secret!=='string'||secret.length<64)fail('PRIVATE_SIGNING_KEY_MISSING');
 const priv=await crypto.subtle.importKey('pkcs8',fromBase64(secret),
  {name:'Ed25519'},false,['sign']);
 const bytes=new TextEncoder().encode(canon(payload));
 const signature=await crypto.subtle.sign('Ed25519',priv,bytes);
 return {schema_version:2,key_id:SIGNATURE_KEY_ID,payload,signature:toBase64(signature)};
}
export async function runScheduledOnce(event,env){
 if(env?.SCHEDULE_ENABLED!=='true'||env?.SCHEDULE_MODE!=='QA_ONE_SHOT_ONLY'||
   !env.ONCE_KV||typeof env.ONCE_KV.get!=='function'||
   typeof env.ONCE_KV.put!=='function'||!env.SIGNED_COMMAND_QUEUE||
   typeof env.SIGNED_COMMAND_QUEUE.send!=='function')
  fail('DISABLED');
 if(event?.cron!=='* * * * *')fail('UNEXPECTED_CRON');
 const now=Number(event.scheduledTime);
 if(!Number.isFinite(now)||now<=0||now>DEADLINE)
  return {status:'OUTSIDE_CANARY_WINDOW_NO_SEND',sent:0};
 const prior=await env.ONCE_KV.get(ONCE_KEY,{type:'json'});
 if(prior)return {status:'ONCE_GATE_ALREADY_CLAIMED_NO_SEND',sent:0};
 // Cryptographic preflight BEFORE consuming the unique claim:
 // a missing/malformed signer key must never burn the one-shot gate.
 // This creates no message, provider call or publishing permission.
 const nonce=crypto.randomUUID();
 const payload=buildScheduledPayload(now,nonce);
 const envelope=await signScheduledPayload(payload,env.ORCH_SIGNER_PRIVATE_PKCS8_BASE64);
 // Claim first, then QUEUE SEND. On queue/network errors the claim remains
 // terminal and requires reconciliation rather than blind automatic replay.
 await env.ONCE_KV.put(ONCE_KEY,JSON.stringify({
  company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
  version:'1',status:'CLAIMED',order_id:ORDER_ID,
  triggered_at:new Date(now).toISOString(),
  publication:false,cost_eur:0,video:false
 }));
 await env.SIGNED_COMMAND_QUEUE.send(envelope);
 await env.ONCE_KV.put(ONCE_KEY,JSON.stringify({
  company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
  version:'1',status:'SIGNED_COMMAND_SENT',order_id:ORDER_ID,
  issuer:ISSUER,key_id:SIGNATURE_KEY_ID,triggered_at:new Date(now).toISOString(),
  publication:false,cost_eur:0,video:false
 }));
 return {status:'SCHEDULED_SIGNED_QA_COMMAND_SENT',sent:1,
  order_id:ORDER_ID,key_id:SIGNATURE_KEY_ID,
  publisher_enabled:false,video_enabled:false,paid_execution_enabled:false};
}
