import {serialize,deserialize} from 'node:v8';
import {AtomicV8Journal} from './persistent-runtime.mjs';
import {stableIdempotencyKey,validateLearningRecord} from './continuous-improvement-contract.mjs';

const KIND='LRN-001';
const PREPROD='PREPROD';
const PERSISTENCE_SCOPE='LOCAL_PREPROD_LRN_LEDGER_ONLY';

function clone(value){return deserialize(serialize(value));}
function semanticLearningHash(record){
  const safe=clone(record);
  delete safe.observed_at;
  return stableIdempotencyKey(safe);
}
function validateStored(item,index){
  if(!item||item.kind!==KIND) throw new Error('invalid LRN-001 record');
  if(item.sequence!==index+1) throw new Error('learning ledger sequence mismatch');
  if(!item.record||item.record.environment!==PREPROD) throw new Error('learning ledger accepts exact PREPROD records only');
  const check=validateLearningRecord(item.record);
  if(!check.ok) throw new Error(`invalid learning record:${check.errors.join(',')}`);
  if(item.record.persistent_publish_authorized!==true||item.record.persistence_scope!==PERSISTENCE_SCOPE) throw new Error('learning record lacks local PREPROD persistence authorization');
  if(item.record.prod_authorized===true||item.record.prod_write_authorized===true) throw new Error('PROD-authorized learning records forbidden');
  const expected=stableIdempotencyKey(item.record);
  if(item.record_hash!==expected) throw new Error('learning record hash mismatch');
}

export class LearningLedgerV0{
  #journal;
  #records;

  constructor({file_path,environment=PREPROD}){
    if(environment!==PREPROD) throw new Error('LRN-001 persistent V0 accepts exact PREPROD only');
    this.#journal=new AtomicV8Journal({file_path,kind:KIND});
    this.#records=this.#journal.load();
    this.#records.forEach((item,index)=>validateStored(item,index));
  }

  persist(record){
    if(!record||record.environment!==PREPROD) throw new Error('learning record must use exact PREPROD');
    const check=validateLearningRecord(record);
    if(!check.ok) throw new Error(`invalid learning record:${check.errors.join(',')}`);
    if(record.persistent_publish_authorized!==true||record.persistence_scope!==PERSISTENCE_SCOPE) throw new Error('local PREPROD persistence authorization required');
    if(record.prod_authorized===true||record.prod_write_authorized===true) throw new Error('PROD-authorized learning records forbidden');
    const safe=clone(record);
    const recordHash=stableIdempotencyKey(safe);
    const prior=this.#records.find((item)=>item.record.learning_id===safe.learning_id);
    if(prior){
      if(prior.record_hash===recordHash){
        return Object.freeze({accepted:false,duplicate:true,semantic_duplicate:false,sequence:prior.sequence,learning_id:safe.learning_id,record_hash:prior.record_hash,prod_authorized:false});
      }
      if(semanticLearningHash(prior.record)===semanticLearningHash(safe)){
        return Object.freeze({accepted:false,duplicate:true,semantic_duplicate:true,preserved_observed_at:prior.record.observed_at,sequence:prior.sequence,learning_id:safe.learning_id,record_hash:prior.record_hash,prod_authorized:false});
      }
      throw new Error('learning_id conflict with different payload');
    }
    const item={kind:KIND,sequence:this.#records.length+1,record:safe,record_hash:recordHash};
    const candidate=[...this.#records,item];
    candidate.forEach((entry,index)=>validateStored(entry,index));
    this.#journal.commit(candidate);
    this.#records=candidate;
    return Object.freeze({accepted:true,duplicate:false,semantic_duplicate:false,sequence:item.sequence,learning_id:safe.learning_id,record_hash:recordHash,prod_authorized:false});
  }

  list(){return clone(this.#records.map((item)=>item.record));}

  listForContext({company_id,engine_id,environment=PREPROD,version}){
    if(environment!==PREPROD) throw new Error('LRN-001 context must use exact PREPROD');
    return clone(this.#records.filter((item)=>item.record.company_id===company_id&&item.record.engine_id===engine_id&&item.record.environment===environment&&(version==null||item.record.version===version)).map((item)=>item.record));
  }

  get operation_count(){return this.#records.length;}
  get journal_path(){return this.#journal.file_path;}
}

export const LEARNING_LEDGER_V0_CONTRACT=Object.freeze({
  kind:KIND,
  environment:PREPROD,
  persistence:'local-atomic-v8-journal',
  persistence_scope:PERSISTENCE_SCOPE,
  duplicate_policy:'EXACT_OR_OBSERVED_AT_ONLY_SEMANTIC_DUPLICATE_PRESERVES_FIRST_SEEN_RECORD',
  supabase_required:false,
  additional_cost_target_eur:0,
  customer_data_required:false,
  prod_writes:false,
  autonomous_prod:false,
  trading_access:false
});
