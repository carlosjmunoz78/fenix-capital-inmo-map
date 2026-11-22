// FACT-001 LAB Recovery Guard: transport-agnostic, no side effects on import.
// This module does not install a runner, open a socket, rotate OAuth or alter PROD.
import { createHash } from 'node:crypto';
import { getCapability } from './catalog.mjs';

const SAFE_CODE=new Set(['ETIMEDOUT','ECONNRESET','EAI_AGAIN','HTTP_408','HTTP_429','HTTP_500','HTTP_502','HTTP_503','HTTP_504']);
const AUTH_CODE=new Set(['HTTP_401','HTTP_403','OAUTH_EXPIRED','AUTH_REQUIRED']);
const DONE=new Set(['COMPLETED','ALREADY_EXISTS_VERIFIED']);
const SCOPES=['company_id','engine_id','environment','version'];
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const valid=s=>typeof s==='string'&&s.length>0&&s.length<=128&&/^[a-zA-Z0-9_.:@/-]+$/.test(s);
function canonical(value,depth=0){
  if(depth>12)throw Error('PAYLOAD_DEPTH_DENIED');
  if(Array.isArray(value))return value.map(x=>canonical(x,depth+1));
  if(plain(value)){const obj={};for(const k of Object.keys(value).sort()){if(k==='__proto__'||k==='constructor')throw Error('KEY_DENIED');obj[k]=canonical(value[k],depth+1);}return obj;}
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;
  throw Error('UNSUPPORTED_INPUT');
}
const hash=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
function publicResult(status,extra={}){return {status,...extra};}
function failureCode(e){const code=String(e?.code||'').slice(0,40);return SAFE_CODE.has(code)||AUTH_CODE.has(code)?code:'UNCLASSIFIED';}
function assertJob(identity,command){
 if(!plain(identity)||!['chatgpt','cerebro'].includes(identity.client_id)||!valid(identity.identity_ref)||!valid(identity.actor_id))throw Error('IDENTITY_NOT_TRUSTED');
 if(!plain(command)||!plain(command.context)||!SCOPES.every(k=>valid(command.context[k])))throw Error('SCOPE_DENIED');
 if(command.context.environment!=='LAB')throw Error('LAB_ONLY');
 if(!valid(command.idempotency_key)||!valid(command.capability)||!plain(command.input??{}))throw Error('COMMAND_DENIED');
 const action=getCapability(command.capability);
 if(!action||action.status!=='IMPLEMENTED_LAB')throw Error('CAPABILITY_DENIED');
 const retryableRead=action.sideEffect===false&&action.method==='GET';
 const scope=Object.fromEntries(SCOPES.map(k=>[k,command.context[k]]));
 // No credentials or full payload persisted. Key includes the client identity.
 const key=hash({client_id:identity.client_id,identity_ref:identity.identity_ref,scope,request_id:command.idempotency_key});
 const fingerprint=hash({capability:command.capability,scope,input:command.input??{}});
 if(JSON.stringify(command).length>16000)throw Error('COMMAND_TOO_LARGE');
 return {key,fingerprint,retryableRead,sideEffect:action.sideEffect===true,operation:action.id,scope,client_id:identity.client_id};
}

/**
 * Store contract:
 * durable===true (backed by transactional D1/Postgres with unique key and CAS);
 * claim({key,fingerprint,now,leaseMs,retryableRead,maxAttempts}) returns:
 *   CLAIMED {attempt}, COMPLETED, PENDING, BACKOFF {retryAt}, RECONCILE, CONFLICT or EXHAUSTED.
 * settle({key,fingerprint,attempt,now,status,retryAt?}) uses CAS on attempt+state.
 * Store NEVER saves tool input, response body, bearer, OAuth token or exception.
 */
export function createRecoveryGuard({store,invoke,audit,now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),maxAttempts=3,baseDelayMs=1000,leaseMs=15000}={}){
 if(store?.durable!==true||typeof store.claim!=='function'||typeof store.settle!=='function')throw Error('DURABLE_ATOMIC_STORE_REQUIRED');
 if(typeof invoke!=='function'||typeof audit!=='function'||typeof now!=='function'||typeof sleep!=='function')throw Error('RECOVERY_CALLBACKS_REQUIRED');
 if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3||!Number.isInteger(baseDelayMs)||baseDelayMs<100||baseDelayMs>10000||!Number.isInteger(leaseMs)||leaseMs<1000||leaseMs>60000)throw Error('RECOVERY_LIMITS_DENIED');
 async function once({identity,command}){
  // identity comes only from verified MCP/Gateway adapter, never from request JSON.
  let job;try{job=assertJob(identity,command);}catch{return publicResult('DENIED',{reason:'INVALID_AUTH_OR_SCOPE'});}
  const record=await store.claim({...job,now:now(),leaseMs,maxAttempts});
  const status=record?.status;
  if(status!=='CLAIMED'){
   const mapped={COMPLETED:'ALREADY_COMPLETED',PENDING:'IN_PROGRESS',BACKOFF:'RETRY_NOT_DUE',RECONCILE:'RECONCILIATION_REQUIRED',CONFLICT:'IDEMPOTENCY_CONFLICT',EXHAUSTED:'RETRIES_EXHAUSTED'};
   return publicResult(mapped[status]||'BLOCKED',{retry_at:status==='BACKOFF'?record.retryAt:undefined});
  }
  const attempt=record.attempt;
  if(!Number.isInteger(attempt)||attempt<1||attempt>maxAttempts)throw Error('STORE_ATTEMPT_INVALID');
  const emit=(outcome,reason)=>audit({event:'CONNECTOR_RECOVERY',company_id:job.scope.company_id,engine_id:job.scope.engine_id,environment:job.scope.environment,version:job.scope.version,client_id:job.client_id,capability:job.operation,request_key:job.key,attempt,outcome,reason});
  try{
   const output=await invoke({identity,command});
   if(DONE.has(output?.status)){
    await store.settle({key:job.key,fingerprint:job.fingerprint,attempt,now:now(),status:'COMPLETED'});
    emit('COMPLETED','OK');
    return output; // live result only; never stored in the ledger
   }
   const human=output?.status==='HUMAN_REQUIRED';
   await store.settle({key:job.key,fingerprint:job.fingerprint,attempt,now:now(),status:job.sideEffect?'RECONCILE':'STOPPED'});
   emit(job.sideEffect?'RECONCILE':'STOPPED',human?'HUMAN_REQUIRED':'UNVERIFIED_RESPONSE');
   return job.sideEffect?publicResult('RECONCILIATION_REQUIRED'):publicResult('STOPPED',{reason:human?'HUMAN_REQUIRED':'UNVERIFIED_RESPONSE'});
  }catch(error){
   const code=failureCode(error);
   if(AUTH_CODE.has(code)){
    await store.settle({key:job.key,fingerprint:job.fingerprint,attempt,now:now(),status:'STOPPED'});
    emit('AUTH_REQUIRED','AUTH_REQUIRED');
    return publicResult('AUTH_REQUIRED'); // provider OAuth may need manual reauthorization
   }
   if(!job.retryableRead){
    await store.settle({key:job.key,fingerprint:job.fingerprint,attempt,now:now(),status:'RECONCILE'});
    emit('RECONCILE',code);
    return publicResult('RECONCILIATION_REQUIRED');
   }
   if(!SAFE_CODE.has(code)||attempt>=maxAttempts){
    await store.settle({key:job.key,fingerprint:job.fingerprint,attempt,now:now(),status:'EXHAUSTED'});
    emit('EXHAUSTED',code);
    return publicResult('RETRIES_EXHAUSTED');
   }
   const retryAt=now()+Math.min(baseDelayMs*2**(attempt-1),30000);
   await store.settle({key:job.key,fingerprint:job.fingerprint,attempt,now:now(),status:'BACKOFF',retryAt});
   emit('RETRY_SCHEDULED',code);
   return publicResult('RETRY_SCHEDULED',{retry_at:retryAt});
  }
 }
 return {
  once,
  async drive({identity,command}){
   for(let i=0;i<maxAttempts;i++){
    const out=await once({identity,command});
    if(out.status!=='RETRY_SCHEDULED')return out;
    await sleep(Math.max(0,out.retry_at-now()));
   }
   return publicResult('RETRIES_EXHAUSTED');
  }
 };
}

/**
 * Explicit LAB simulator. Durable=false so it CANNOT be passed to createRecoveryGuard
 * as a production ledger. Actual deployment requires transactional CAS storage.
 */
export function volatileTestLedger(){
 const rows=new Map();
 return {durable:false,rows};
}
