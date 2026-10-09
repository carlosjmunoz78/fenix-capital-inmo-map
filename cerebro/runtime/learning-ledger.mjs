import {serialize,deserialize} from 'node:v8';
import {AtomicV8Journal} from './persistent-runtime.mjs';
import {stableIdempotencyKey,validateLearningRecord} from './continuous-improvement-contract.mjs';

const KIND='LRN-001';
const PREPROD='PREPROD';
const PERSISTENCE_SCOPE='LOCAL_PREPROD_LRN_LEDGER_ONLY';
const ADDITIVE_PROVENANCE_FIELDS=Object.freeze(['signal_id','source_environment']);

function clone(value){return deserialize(serialize(value));}
function missing(value){return value===undefined||value===null||value==='';}
function sameValue(left,right){return stableIdempotencyKey({value:left??null})===stableIdempotencyKey({value:right??null});}
function differingFields(left,right){
  const leftObject=left??{};const rightObject=right??{};
  return [...new Set([...Object.keys(leftObject),...Object.keys(rightObject)])]
    .flatMap((field)=>{
      const leftHas=Object.hasOwn(leftObject,field);const rightHas=Object.hasOwn(rightObject,field);
      if(leftHas!==rightHas) return [`${field}#presence`];
      return sameValue(leftObject[field],rightObject[field])?[]:[field];
    })
    .sort();
}
function compatibleRepeat(prior,incoming){
  const left=clone(prior);const right=clone(incoming);const compatibilityFields=[];
  if(left.observed_at!==right.observed_at) compatibilityFields.push('observed_at');
  delete left.observed_at;delete right.observed_at;
  for(const field of ADDITIVE_PROVENANCE_FIELDS){
    const before=left[field];const after=right[field];
    if(sameValue(before,after)) continue;
    if(missing(before)&&!missing(after)){
      compatibilityFields.push(field);
      delete left[field];delete right[field];
      continue;
    }
    return Object.freeze({ok:false,compatibility_fields:[],conflict_fields:differingFields(prior,incoming)});
  }
  const ok=stableIdempotencyKey(left)===stableIdempotencyKey(right);
  return Object.freeze({ok,compatibility_fields:ok?compatibilityFields.sort():[],conflict_fields:ok?[]:differingFields(prior,incoming)});
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
      const compatibility=compatibleRepeat(prior.record,safe);
      if(compatibility.ok){
        return Object.freeze({accepted:false,duplicate:true,semantic_duplicate:true,compatibility_fields:compatibility.compatibility_fields,preserved_observed_at:prior.record.observed_at,sequence:prior.sequence,learning_id:safe.learning_id,record_hash:prior.record_hash,prod_authorized:false});
      }
      throw new Error(`learning_id conflict with different payload fields:${compatibility.conflict_fields.join(',')||'unknown'}`);
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
  duplicate_policy:'FIRST_SEEN_IMMUTABLE; OBSERVED_AT_MAY_CHANGE; SIGNAL_ID_AND_SOURCE_ENVIRONMENT_MAY_ONLY_BE_ADDED_TO_LEGACY_RECORDS; ALL_OTHER_SAME_ID_MUTATIONS_FAIL_CLOSED',
  additive_provenance_fields:ADDITIVE_PROVENANCE_FIELDS,
  conflict_diagnostics:'FIELD_NAMES_AND_PRESENCE_ONLY_NO_PAYLOAD_VALUES',
  supabase_required:false,
  additional_cost_target_eur:0,
  customer_data_required:false,
  prod_writes:false,
  autonomous_prod:false,
  trading_access:false
});