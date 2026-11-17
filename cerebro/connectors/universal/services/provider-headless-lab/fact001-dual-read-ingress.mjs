// FACT-001 · P5: shared read-only dual-client ingress candidate.
// No service deployment, credentials, API requests, cron, provider writes or D1 creation.
// Authentication is EXTERNAL: the verifier must validate a REAL user OAuth or service JWS.
// Only prepares a signed inventory job with one atomic audit+queue write in the supplied
// durable store. Production, mutation, unauthenticated sources and expensive jobs denied.
import {createHash} from 'node:crypto';
export const ADMITTED_PROVIDERS=Object.freeze(['cloudflare','github','supabase','vercel','notion']);
export const ADMISSION_SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'});
const simple=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const exact=(x,fields)=>simple(x)&&Object.keys(x).sort().join(',')===fields.slice().sort().join(',');
const stable=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const permittedOrder=['company_id','engine_id','environment','version','source','provider','operation','request_id','idempotency_key','max_cost_eur'];
const id=x=>typeof x==='string'&&/^[A-Za-z0-9-]{10,80}$/.test(x);
const reject=(code)=>({status:'BLOCKED',code,executed:false,provider_writes:0});
export function createFact001DualReadIngress({authenticate,queue,costGuard}={}){
 if(typeof authenticate!=='function'||queue?.durable!==true||typeof queue.writeAtomic!=='function'||
  typeof costGuard!=='function')throw Error('ADMISSION_TRUSTED_ATOMIC_DEPENDENCIES_REQUIRED');
 return Object.freeze({async accept({order,transport}={}){
  if(!exact(order,permittedOrder)||Object.entries(ADMISSION_SCOPE).some(([k,v])=>order[k]!==v)||
   !['owner_order','automation'].includes(order.source)||!ADMITTED_PROVIDERS.includes(order.provider)||
   order.operation!=='provider.inventory.read'||!id(order.request_id)||!id(order.idempotency_key)||
   order.max_cost_eur!==0)return reject('ORDER_SCOPE_DENIED');
  let principal;try{principal=await authenticate(transport);}catch{return reject('AUTH_INVALID');}
  if(!simple(principal)||principal.verified!==true||
    !['chatgpt-human','cerebro-service'].includes(principal.client_id)||
    typeof principal.identity_ref!=='string'||principal.identity_ref.length<4||principal.identity_ref.length>128||
    typeof principal.actor_id!=='string'||principal.actor_id.length<2||principal.actor_id.length>128)
   return reject('IDENTITY_DENIED');
  if(order.source==='owner_order'&&(principal.authority!=='owner_signed_command'||principal.actor_id!=='carlosjmunoz78'))
   return reject('OWNER_SIGNATURE_REQUIRED');
  if(order.source==='automation'&&(
    principal.client_id!=='cerebro-service'||principal.authority!=='registered_automation'||
    principal.automation_active!==true))
   return reject('REGISTERED_AUTOMATION_REQUIRED');
  if(await costGuard({scope:ADMISSION_SCOPE,provider:order.provider,max_cost_eur:0})!==true)
   return reject('MONEY_LIMIT');
  const key=stable({scope:ADMISSION_SCOPE,principal:principal.identity_ref,source:order.source,key:order.idempotency_key});
  const fingerprint=stable({scope:ADMISSION_SCOPE,source:order.source,provider:order.provider,operation:order.operation,request_id:order.request_id});
  try{
   const result=await queue.writeAtomic({
     idempotency_hash:key,fingerprint,scope:ADMISSION_SCOPE,operation:order.operation,
     provider:order.provider,request_id:order.request_id,actor_ref:stable(principal.identity_ref),
     source:order.source,client_id:principal.client_id,max_cost_eur:0,
     state:'PENDING_VERIFIED_EXECUTOR',provider_writes:0,audit_event:'FACT001_INGRESS_QUEUED'
   });
   if(result?.status==='QUEUED'||result?.status==='ALREADY_QUEUED')
    return {status:result.status,request_id:order.request_id,provider:order.provider,
       job_dispatch_enabled:false,provider_writes:0,queued_in_durable_store:true};
   if(result?.status==='CONFLICT')return reject('IDEMPOTENCY_CONFLICT');
   return reject('ATOMIC_QUEUE_UNVERIFIED');
  }catch{return reject('ATOMIC_QUEUE_UNAVAILABLE');}
 }});
}
