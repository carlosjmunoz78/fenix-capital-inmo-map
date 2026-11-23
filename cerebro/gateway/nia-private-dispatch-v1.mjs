/**
 * NIA ⇄ CEREBRO private LAB dispatch v1.
 * Additive hook, never part of the existing FACT/UMS Worker without gated migration.
 * Issuer identity is proved by HMAC, not by any client-supplied authorized flag.
 * Atomic replay claim is mandatory, supplied by runtime (D1 unique key / Durable Object).
 */
import { ActionGatewayV1 } from './action-gateway-v1.mjs';
import { bindNiaDiscoveryToActionGatewayV0, NIA_CAPABILITY, NIA_SKILL_ID } from './nia-action-gateway-binding-v0.mjs';

export const NIA_LAB_ISSUER = 'cerebro-fact001-gateway-lab-eu-20261109';
export const NIA_LAB_AUDIENCE = 'cerebro-nia-notion-proof-lab';
export const NIA_LAB_ENVELOPE_TYPE = 'NIA_ACTGW_DISCOVERY_READ_V1';
export const NIA_LAB_QUEUE = 'cerebro-nia-actgw-private-lab-eu';
const TITLE = 'NIA · Uso responsable de Notion Business en CEREBRO';
const TOPICS = new Set(['documentation','knowledge','research','meeting-notes','notion-skills','notion-events']);
const KEYS = ['audience','capability','context','event_type','expires_at_ms','idempotency_key','issued_at_ms','issuer','nonce','payload','schema_version','signature_hex'];
const CTX = ['company_id','engine_id','environment','version'];
const PKEYS = ['already_handled','topic'];
const textBytes = value => new TextEncoder().encode(value);

function record(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}
function exactKeys(obj, required, optional=[]) {
  return record(obj) && required.every(k=>Object.hasOwn(obj,k)) &&
    Object.keys(obj).every(k=>required.includes(k)||optional.includes(k));
}
function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
}
function unsigned(e) {
  const {signature_hex,...rest}=e;
  return rest;
}
function hex(arr) {
  return [...arr].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function bytesFromHex(s) {
  if (typeof s!=='string'||!/^[0-9a-f]{64}$/.test(s)) return null;
  const bytes=new Uint8Array(s.length/2);
  for(let i=0;i<bytes.length;i++) bytes[i]=Number.parseInt(s.slice(2*i,2*i+2),16);
  return bytes;
}
async function key(secret,usage) {
  if(typeof secret!=='string'||secret.length<48) return null;
  return crypto.subtle.importKey('raw',textBytes(secret),{name:'HMAC',hash:'SHA-256'},false,[usage]);
}
function envelopeAllowed(e,now) {
  if(!exactKeys(e,KEYS)||e.schema_version!==1||e.event_type!==NIA_LAB_ENVELOPE_TYPE||
    e.issuer!==NIA_LAB_ISSUER||e.audience!==NIA_LAB_AUDIENCE||
    e.capability!==NIA_CAPABILITY||
    !exactKeys(e.context,CTX)||e.context.company_id!=='fenix'||
    e.context.engine_id!=='ACTGW-001'||e.context.environment!=='PREPROD'||
    e.context.version!=='0.2.0'||!exactKeys(e.payload,['topic'],['already_handled'])||
    typeof e.payload.topic!=='string'||!TOPICS.has(e.payload.topic)||
    (e.payload.already_handled!==undefined&&typeof e.payload.already_handled!=='boolean')||
    typeof e.idempotency_key!=='string'||!/^[A-Za-z0-9_-]{12,90}$/.test(e.idempotency_key)||
    typeof e.nonce!=='string'||!/^[a-f0-9-]{36}$/.test(e.nonce)||
    !Number.isSafeInteger(e.issued_at_ms)||!Number.isSafeInteger(e.expires_at_ms)||
    e.expires_at_ms-e.issued_at_ms<1||e.expires_at_ms-e.issued_at_ms>60000||
    e.issued_at_ms>now+5000||e.expires_at_ms<now||
    !bytesFromHex(e.signature_hex)) return false;
  return true;
}
export async function signNiaDiscoveryLabV1({secret,topic='documentation',already_handled=false,
 nonce, idempotency_key, now=Date.now()}={}) {
  if(typeof nonce!=='string'||typeof idempotency_key!=='string')
    throw new Error('NIA_TRUSTED_ISSUER_INPUT_REQUIRED');
  const e={
    schema_version:1,event_type:NIA_LAB_ENVELOPE_TYPE,issuer:NIA_LAB_ISSUER,
    audience:NIA_LAB_AUDIENCE,
    context:{company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'0.2.0'},
    capability:NIA_CAPABILITY,nonce,idempotency_key,issued_at_ms:now,expires_at_ms:now+60000,
    payload:{topic,already_handled},signature_hex:'0'.repeat(64)
  };
  if(!envelopeAllowed(e,now)) throw new Error('NIA_ISSUER_INVALID_ENVELOPE');
  const k=await key(secret,'sign');
  if(!k) throw new Error('NIA_ISSUER_KEY_UNAVAILABLE');
  e.signature_hex=hex(new Uint8Array(await crypto.subtle.sign('HMAC',k,textBytes(stable(unsigned(e))))));
  return e;
}
export async function dispatchNiaVerifiedLabV1({envelope,queue,secret,nonceStore,notionProvider,
 enabled=false,now=Date.now()}={}) {
  const deny=reason=>({status:'DENIED',reason,executed:false});
  if(enabled!==true) return deny('NIA_DISPATCH_OFF');
  if(queue!==NIA_LAB_QUEUE) return deny('WRONG_QUEUE');
  if(!envelopeAllowed(envelope,now)) return deny('INVALID_ENVELOPE');
  const k=await key(secret,'verify');
  if(!k) return deny('ISSUER_KEY_UNAVAILABLE');
  const ok=await crypto.subtle.verify('HMAC',k,bytesFromHex(envelope.signature_hex),
    textBytes(stable(unsigned(envelope))));
  if(!ok) return deny('SIGNATURE_INVALID');
  // Cloudflare KV is eventually consistent. Require an atomic claim implementation (D1 unique / DO).
  if(!nonceStore||typeof nonceStore.claim!=='function') return deny('ATOMIC_REPLAY_LEDGER_REQUIRED');
  if(!await nonceStore.claim(envelope.nonce,Math.ceil((envelope.expires_at_ms-now)/1000))) return deny('REPLAY_DENIED');
  if(!notionProvider||typeof notionProvider.readSkillPage!=='function') return deny('NOTION_READ_PROVIDER_UNAVAILABLE');
  const gw=new ActionGatewayV1({environment:'PREPROD'});
  bindNiaDiscoveryToActionGatewayV0({actionGateway:gw,notionProvider,expectedCompanyId:'fenix'});
  const reply=await gw.execute({
    context:{...envelope.context},capability:NIA_CAPABILITY,
    idempotency_key:envelope.idempotency_key,
    payload:{...envelope.payload}, authorized:true, // ONLY after HMAC + atomic claim
    risk:'LOW',estimated_additional_cost_eur:0,
    requires_prod_write:false,autonomous_prod:false,trading_access:false
  });
  const audit=gw.auditLog();
  const status=reply?.result?.status;
  return {
    status: reply.status==='ACTION_EXECUTED' && ['NIA_DISCOVERED','NOOP','NIA_UNAVAILABLE','NIA_DENIED'].includes(status)
      ? 'DISPATCH_RECORDED' : 'GATE_REJECTED',
    capability:NIA_CAPABILITY,provider_status:status||'DENIED',
    skill_id:status==='NIA_DISCOVERED'?NIA_SKILL_ID:null,
    audit_events:audit.length,ai_session_started:false,content_exported:false,
    additional_cost_eur:0,executed:false
  };
}
