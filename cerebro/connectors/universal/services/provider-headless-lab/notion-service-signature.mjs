// FACT-001 · Candidate private Cloudflare Worker -> Supabase Notion LAB transport.
// Pure WebCrypto, NO route, NO secrets, NO network, NO mutation on import.
// HMAC authenticates a service TRANSPORT only. A separate owner-order gate must
// attest the operation and a D1 CAS claim must authorize the exact synthetic child.
const VERSION='FACT001-NOTION-SERVICE-V1';
const AUDIENCE='cerebro-fact001-notion-headless-lab';
const SCOPE='fenix-capital/FACT-001/LAB/1.0.0';
const METHOD='POST',PATH='/notion-lab-service';
const encoder=new TextEncoder();
const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
const asBytes=x=>x instanceof Uint8Array&&x.length>=32&&x.length<=128;
const validNonce=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{24,80}$/.test(x);
const validTimestamp=x=>Number.isSafeInteger(x)&&x>1700000000000;
const validBody=x=>typeof x==='string'&&x.length>0&&x.length<=2000;
const validOrderRef=x=>typeof x==='string'&&/^FACT001-OWNER-[A-Z0-9-]{10,80}$/.test(x);
const SHA=async data=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(data))));
async function importKey(secret){
 if(!asBytes(secret))throw Error('NOTION_SERVICE_SIGNING_KEY_INVALID');
 return crypto.subtle.importKey('raw',secret,{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
function message({timestamp,nonce,bodyHash,orderRef}){
 return [VERSION,AUDIENCE,SCOPE,METHOD,PATH,String(timestamp),nonce,orderRef,bodyHash].join('\n');
}
function assertEnvelope(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
   JSON.stringify(Object.keys(input).sort())!==JSON.stringify(['body','nonce','orderRef','signature','timestamp'].sort())||
   !validTimestamp(input.timestamp)||!validNonce(input.nonce)||!validBody(input.body)||
   !validOrderRef(input.orderRef)||typeof input.signature!=='string'||
   !/^[0-9a-f]{64}$/.test(input.signature))throw Error('NOTION_SERVICE_ENVELOPE_INVALID');
}
export async function signNotionLabService({secret,body,timestamp,nonce,orderRef}={}){
 if(!validBody(body)||!validTimestamp(timestamp)||!validNonce(nonce)||!validOrderRef(orderRef))
  throw Error('NOTION_SERVICE_SIGNING_INPUT_DENIED');
 const key=await importKey(secret),bodyHash=await SHA(body);
 const sig=await crypto.subtle.sign('HMAC',key,encoder.encode(message({timestamp,nonce,bodyHash,orderRef})));
 return Object.freeze({body,timestamp,nonce,orderRef,signature:hex(new Uint8Array(sig))});
}
export async function verifyNotionLabService({secret,envelope,now=Date.now(),claimNonce,verifyOwnerOrder}={}){
 if(!Number.isSafeInteger(now)||typeof claimNonce!=='function'||typeof verifyOwnerOrder!=='function')
  return {verified:false,reason:'SERVICE_VERIFIER_NOT_READY'};
 try{assertEnvelope(envelope);}catch{return {verified:false,reason:'ENVELOPE_DENIED'};}
 if(Math.abs(now-envelope.timestamp)>60000)return {verified:false,reason:'SERVICE_SIGNATURE_EXPIRED'};
 let key;try{key=await importKey(secret);}catch{return {verified:false,reason:'SIGNING_KEY_UNAVAILABLE'};}
 const bodyHash=await SHA(envelope.body);
 const sig=Uint8Array.from(envelope.signature.match(/../g),h=>parseInt(h,16));
 const valid=await crypto.subtle.verify('HMAC',key,sig,encoder.encode(message({...envelope,bodyHash})));
 if(!valid)return {verified:false,reason:'SIGNATURE_INVALID'};
 let order;try{order=JSON.parse(envelope.body);}catch{return {verified:false,reason:'ORDER_FORMAT_DENIED'};}
 if(!order||typeof order!=='object'||Array.isArray(order)||
   order.company_id!=='fenix-capital'||order.engine_id!=='FACT-001'||
   order.environment!=='LAB'||order.version!=='1.0.0'||
   order.client_id!=='cerebro'||order.source!=='owner_order'||
   order.owner_order_ref!==envelope.orderRef)return {verified:false,reason:'ORDER_SCOPE_DENIED'};
 // Must be independently verified: transport signature alone is NOT an owner order.
 if(await verifyOwnerOrder(order)!==true)return {verified:false,reason:'OWNER_ORDER_NOT_ATTESTED'};
 const claim=await claimNonce({nonce:envelope.nonce,orderRef:envelope.orderRef,timestamp:envelope.timestamp,
  bodyHash,ttlMs:180000});
 if(claim!==true)return {verified:false,reason:'NONCE_REPLAY_OR_STORE_FAILURE'};
 return {verified:true,client_id:'cerebro',source:'owner_order',authority:'owner_signed_command',
  identity_ref:'fact001-hmac-lab-v1',actor_id:'carlosjmunoz78',scope:SCOPE,
  payload_sha256:bodyHash,credentials_exposed:false,provider_mutation_authorized:false};
}
