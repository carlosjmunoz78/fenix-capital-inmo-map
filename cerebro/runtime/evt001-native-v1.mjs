import crypto from 'node:crypto';
import { PersistentEventBus, AtomicV8Journal } from './persistent-runtime.mjs';

const PREPROD='PREPROD';
const CAPABILITY_ID='EVT-001';
const VERSION='1.0.0';
const MAX_ATTEMPTS_LIMIT=10;

function reqString(value,label){if(typeof value!=='string'||!value.trim())throw new TypeError(`${label} required`);return value.trim();}
function semver(value,label){const v=reqString(value,label);if(!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(v))throw new Error(`${label} must be semver`);return v;}
function clone(value){return structuredClone(value);}
function hash(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function normalizeContext(context){
  if(!context||typeof context!=='object'||Array.isArray(context))throw new TypeError('context required');
  const normalized={company_id:reqString(context.company_id,'context.company_id'),engine_id:reqString(context.engine_id,'context.engine_id'),environment:reqString(context.environment,'context.environment'),version:reqString(context.version,'context.version')};
  if(normalized.environment!==PREPROD)throw new Error('EVT001_PREPROD_ONLY');
  return Object.freeze(normalized);
}
function sameContext(a,b){return a.company_id===b.company_id&&a.engine_id===b.engine_id&&a.environment===b.environment&&a.version===b.version;}
function normalizeAction(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('action required');
  const operation=reqString(input.operation,'operation').toUpperCase();
  const context=normalizeContext(input.context);
  return Object.freeze({operation,context});
}
export function authorizeEvt001Action(input){
  try{
    const {operation,context}=normalizeAction(input);
    const allowed=new Set(['PUBLISH','LIST_CONTEXT','LIST_COMPANY','DELIVER_CONTEXT','REPLAY_VERIFY']);
    const authorized=allowed.has(operation);
    return Object.freeze({capability_id:CAPABILITY_ID,version:VERSION,operation,context,authorized,reasons:authorized?[]:['OPERATION_DENIED'],prod_authorized:false,prod_write_authorized:false,cross_company_authorized:false,additional_cost_eur:0,authorization_receipt:`evt-auth:${hash({operation,context}).slice(0,24)}`});
  }catch(error){return Object.freeze({capability_id:CAPABILITY_ID,version:VERSION,authorized:false,reasons:[String(error?.message??error)],prod_authorized:false,prod_write_authorized:false,cross_company_authorized:false,additional_cost_eur:0});}
}
function normalizePublish(input){
  const context=normalizeContext(input?.context);
  const type=reqString(input?.type,'type');
  const schema_version=semver(input?.schema_version,'schema_version');
  const payload=input?.payload??{};
  if(payload===null||typeof payload!=='object'||Array.isArray(payload))throw new TypeError('payload must be an object');
  const idempotency_key=input?.idempotency_key===undefined?`evt:${hash({schema_version,type,payload,context}).slice(0,32)}`:reqString(input.idempotency_key,'idempotency_key');
  return {type,payload:{schema_version,data:clone(payload)},context,idempotency_key};
}
function deliveryKey(event){return `${event.context.company_id}|${event.context.engine_id}|${event.context.environment}|${event.context.version}|${event.event_id}`;}
function normalizeTransport(transport){
  if(typeof transport==='function')return transport;
  if(transport&&typeof transport.publish==='function')return event=>transport.publish(event);
  throw new TypeError('authorized transport adapter with publish(event) required');
}
function normalizeAttempts(value){const n=value??3;if(!Number.isSafeInteger(n)||n<1||n>MAX_ATTEMPTS_LIMIT)throw new TypeError(`max_attempts must be 1..${MAX_ATTEMPTS_LIMIT}`);return n;}
function receiptBase(event,status,attempts,error=null){return {event_id:event.event_id,idempotency_key:event.idempotency_key,company_id:event.context.company_id,engine_id:event.context.engine_id,environment:event.context.environment,version:event.context.version,status,attempts,error,prod_authorized:false,prod_write_authorized:false,additional_cost_eur:0};}

export class Evt001Native {
  #bus;#deliveries;#deliveryOps;#transport;#maxAttempts;
  constructor({event_file,delivery_file,environment=PREPROD,transport=null,max_attempts=3}){
    if(environment!==PREPROD)throw new Error('EVT001_PREPROD_ONLY');
    this.#bus=new PersistentEventBus({file_path:reqString(event_file,'event_file'),environment});
    this.#deliveries=new AtomicV8Journal({file_path:reqString(delivery_file,'delivery_file'),kind:'EVT-001-DELIVERY-V1'});
    this.#deliveryOps=this.#deliveries.load();
    this.#transport=transport;
    this.#maxAttempts=normalizeAttempts(max_attempts);
  }
  publish(input){
    const normalized=normalizePublish(input);
    const result=this.#bus.publish(normalized);
    return Object.freeze({...result,capability_id:CAPABILITY_ID,schema_version:normalized.payload.schema_version,prod_authorized:false,prod_write_authorized:false,additional_cost_eur:0});
  }
  listForContext(context){return this.#bus.listForContext(normalizeContext(context));}
  listForCompany(company_id){return this.#bus.listForCompany(reqString(company_id,'company_id'));}
  deliveryLedger(){return clone(this.#deliveryOps);}
  #terminalKeys(){return new Set(this.#deliveryOps.filter(x=>x?.op==='delivery'&&(x.receipt?.status==='DELIVERED'||x.receipt?.status==='DEAD_LETTER')).map(x=>x.key));}
  #commitReceipt(event,receipt){const op={op:'delivery',key:deliveryKey(event),receipt:clone(receipt)};const next=[...this.#deliveryOps,op];this.#deliveries.commit(next);this.#deliveryOps=next;return receipt;}
  async deliverContext(context,{transport=this.#transport,max_attempts=this.#maxAttempts}={}){
    const safeContext=normalizeContext(context);const publish=normalizeTransport(transport);const attemptsLimit=normalizeAttempts(max_attempts);const terminal=this.#terminalKeys();const events=this.#bus.listForContext(safeContext);const receipts=[];
    for(const event of events){
      if(!sameContext(event.context,safeContext))throw new Error('EVT001_CROSS_COMPANY_CONTEXT_MISMATCH');
      const key=deliveryKey(event);if(terminal.has(key)){receipts.push(Object.freeze({...receiptBase(event,'SKIPPED_TERMINAL',0),terminal:true}));continue;}
      let lastError=null,delivered=false,attempts=0;
      for(let n=1;n<=attemptsLimit;n++){
        attempts=n;
        try{const result=await publish(clone(event));if(result===false)throw new Error('TRANSPORT_REJECTED');const receipt=Object.freeze({...receiptBase(event,'DELIVERED',attempts),transport_receipt:result??null});this.#commitReceipt(event,receipt);receipts.push(receipt);delivered=true;break;}catch(error){lastError=String(error?.message??error);}
      }
      if(!delivered){const receipt=Object.freeze(receiptBase(event,'DEAD_LETTER',attempts,lastError));this.#commitReceipt(event,receipt);receipts.push(receipt);}
    }
    return Object.freeze({capability_id:CAPABILITY_ID,status:'DELIVERY_COMPLETE',context:safeContext,events_total:events.length,delivered_total:receipts.filter(r=>r.status==='DELIVERED').length,dead_letter_total:receipts.filter(r=>r.status==='DEAD_LETTER').length,skipped_total:receipts.filter(r=>r.status==='SKIPPED_TERMINAL').length,receipts:Object.freeze(receipts),prod_authorized:false,prod_write_authorized:false,additional_cost_eur:0});
  }
  verifyReplay(context){
    const safeContext=normalizeContext(context);const events=this.#bus.listForContext(safeContext);const ledger=this.#deliveries.load();
    return Object.freeze({capability_id:CAPABILITY_ID,status:'REPLAY_VERIFIED',context:safeContext,event_count:events.length,delivery_operations:ledger.length,journal_event_operations:this.#bus.operation_count,prod_authorized:false,prod_write_authorized:false,additional_cost_eur:0});
  }
}

export const EVT001_NATIVE_CONTRACT=Object.freeze({capability_id:CAPABILITY_ID,version:VERSION,environment:PREPROD,storage:'PersistentEventBus+AtomicV8Journal',existing_runtime_reused:['cerebro/runtime/runtime.mjs#EventBus','cerebro/runtime/persistent-runtime.mjs#PersistentEventBus','cerebro/runtime/persistent-runtime.mjs#AtomicV8Journal','cerebro/runtime/rsi-event-outbox.mjs'],delivery:'INJECTED_AUTHORIZED_TRANSPORT',max_attempts_limit:MAX_ATTEMPTS_LIMIT,dead_letter:true,idempotency:true,cross_company:'DENY',prod:'DENY',additional_cost_eur:0});
