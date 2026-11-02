import crypto from 'node:crypto';
import { PersistentEventBus } from '../runtime/persistent-runtime.mjs';

export const AUD001_IMMUTABLE_AUDIT_V1_CONTRACT=Object.freeze({engine_id:'AUD-001',version:'1.0.0',environment:'PREPROD',storage:'EXISTING_PERSISTENT_EVENT_RUNTIME',mode:'APPEND_ONLY_HASH_CHAIN',required_fields:['who','what','when','before','after','reason','target_engine_id','result'],retention_mode:'NO_AUTOMATIC_DELETE_V1',secrets_allowed:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const sensitive=/(secret|token|password|passwd|api[_-]?key|authorization|cookie)/i;
function ensureNoSecrets(value,path='record'){if(!value||typeof value!=='object')return;for(const [k,v] of Object.entries(value)){if(sensitive.test(k))throw new Error(`AUD001_SECRET_FIELD_DENIED:${path}.${k}`);ensureNoSecrets(v,`${path}.${k}`);}}
function required(v,label){if(typeof v!=='string'||!v.trim())throw new Error(`AUD001_REQUIRED:${label}`);return v.trim();}

export class Aud001ImmutableAuditV1{
  #bus;
  constructor({journal_file}={}){this.#bus=new PersistentEventBus({file_path:required(journal_file,'journal_file')});}
  append({context,who,what,when,before=null,after=null,reason,target_engine_id,result=null}){
    if(!context||context.engine_id!=='AUD-001'||context.environment!=='PREPROD')throw new Error('AUD001_PREPROD_CONTEXT_REQUIRED');
    const base={who:required(who,'who'),what:required(what,'what'),when:required(when,'when'),before:structuredClone(before),after:structuredClone(after),reason:required(reason,'reason'),target_engine_id:required(target_engine_id,'target_engine_id'),result:structuredClone(result)};
    if(Number.isNaN(Date.parse(base.when)))throw new Error('AUD001_INVALID_WHEN');ensureNoSecrets(base);
    const rows=this.records(context.company_id);const prev_hash=rows.at(-1)?.record_hash??'GENESIS';
    const record={schema_version:'1.0.0',company_id:context.company_id,audit_engine_id:'AUD-001',...base,prev_hash};record.record_hash=digest(record);
    this.#bus.publish({type:'AUDIT_RECORD',context,idempotency_key:`audit:${record.record_hash}`,payload:record});return structuredClone(record);
  }
  records(company_id){return this.#bus.listForCompany(required(company_id,'company_id')).filter(e=>e.type==='AUDIT_RECORD').map(e=>structuredClone(e.payload));}
  verify(company_id){const rows=this.records(company_id);let prev='GENESIS';for(const r of rows){const claimed=r.record_hash;const copy={...r};delete copy.record_hash;if(r.prev_hash!==prev||digest(copy)!==claimed)return Object.freeze({status:'BROKEN',records:rows.length});prev=claimed;}return Object.freeze({status:'VERIFIED',records:rows.length,head_hash:prev});}
  contract(){return AUD001_IMMUTABLE_AUDIT_V1_CONTRACT;}
}
