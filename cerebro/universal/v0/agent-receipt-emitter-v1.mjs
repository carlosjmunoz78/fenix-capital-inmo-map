/**
 * CEREBRO OPERATIVA · portable server-side receipt emitter for shared runtimes.
 * Designed for Cloudflare Workers, Supabase Deno and Node 24.
 * NEVER pass signing keys to browsers; an unsigned/undelivered event certifies nothing.
 * LAB only until the E2E job ledger, identity provenance and rollback gate are green.
 */
const KEYS=['source','company_id','environment','engine_id','executor_id','job_id',
 'receipt_id','agent_role_id','subagent_role_id','event','emitted_at','version'];
const EVENTS=new Set(['STARTED','HEARTBEAT','SUCCEEDED','FAILED']);
const PROVIDERS=new Set(['CLOUDFLARE','SUPABASE','GITHUB_ACTIONS','VERCEL','CEREBRO_JOB']);
const valid=s=>typeof s==='string'&&s.length>0&&s.length<=180&&!/[\u0000-\u001f]/.test(s);
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export async function createAgentReceiptEmitterV1({context,signingKey,sink,clock=()=>new Date().toISOString(),
 uuid=()=>crypto.randomUUID()}={}){
 if(!context||typeof context!=='object'||Array.isArray(context)||
  !PROVIDERS.has(context.source)||context.company_id!=='fenix'||context.environment!=='LAB'||
  !/^[A-Z][A-Z0-9]{1,19}-[0-9]{3}$/.test(context.engine_id||'')||
  !['executor_id','job_id','agent_role_id','version'].every(k=>valid(context[k]))||
  !(context.subagent_role_id===null||valid(context.subagent_role_id))||
  !(signingKey instanceof Uint8Array)||signingKey.length<32||signingKey.length>64||
  typeof clock!=='function'||typeof uuid!=='function'||
  (sink!==undefined&&typeof sink!=='function'))throw Error('EMITTER_CONTEXT_OR_SIGNER_INVALID');
 const key=await crypto.subtle.importKey('raw',signingKey,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 // Do not retain a mutable reference to the key bytes or expose them in return values.
 const scope=Object.freeze({...Object.fromEntries(['source','company_id','environment','engine_id',
  'executor_id','job_id','agent_role_id','subagent_role_id','version'].map(k=>[k,context[k]]))});
 return Object.freeze({
  async emit(event){
   if(!EVENTS.has(event))throw Error('UNSUPPORTED_EXECUTION_EVENT');
   const emitted_at=clock(),receipt_id=uuid();
   if(!valid(receipt_id)||!valid(emitted_at)||!Number.isFinite(Date.parse(emitted_at)))
    return {status:'UNVERIFIED',reason:'INVALID_CLOCK_OR_RECEIPT_ID'};
   const message={...scope,receipt_id,event,emitted_at};
   const ordered=Object.fromEntries(KEYS.map(k=>[k,message[k]]));
   const material='CEREBRO_AGENT_RECEIPT_V1\n'+JSON.stringify(ordered);
   const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(material));
   const envelope={receipt:ordered,signature_hex:hex(new Uint8Array(bytes)),
    signature_scheme:'HMAC-SHA256-CEREBRO-AGENT-V1'};
   if(!sink)return {status:'LOCAL_SIGNATURE_ONLY',receipt_id,certified:false};
   try{
    const receipt=await sink(envelope);
    // Even a success response is not durable verification; reader must verify
    // signature and read-back using the registered trusted source adapter.
    if(receipt?.status==='ACCEPTED'&&receipt.receipt_id===receipt_id)
     return {status:'SUBMITTED_UNVERIFIED',receipt_id,certified:false};
    return {status:'DELIVERY_NOT_ACCEPTED',receipt_id,certified:false};
   }catch{return {status:'DELIVERY_FAILED',receipt_id,certified:false};}
  }
 });
}
