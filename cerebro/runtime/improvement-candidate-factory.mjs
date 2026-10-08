import {serialize,deserialize} from 'node:v8';
import {AtomicV8Journal} from './persistent-runtime.mjs';
import {LearningLedgerV0} from './learning-ledger.mjs';
import {stableIdempotencyKey,validateLearningRecord} from './continuous-improvement-contract.mjs';

const KIND='RSI-IMPROVEMENT-CANDIDATE-V0';
const PREPROD='PREPROD';
const MIN_AUTONOMOUS_CONFIDENCE=0.60;

function clone(value){return deserialize(serialize(value));}
function reqString(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function normalizeMetric(value){
  if(!value||typeof value!=='object'||Array.isArray(value)) throw new Error('expected_metric_delta required');
  const name=reqString(value.name??value.metric,'expected_metric_delta.name');
  const direction=reqString(value.direction??'TARGET','expected_metric_delta.direction').toUpperCase();
  if(!['HIGHER','LOWER','TARGET','STABLE'].includes(direction)) throw new Error('expected_metric_delta.direction invalid');
  return Object.freeze({name,direction,measurement:reqString(value.measurement??'CONTROLLED_OLD_VS_NEW','expected_metric_delta.measurement')});
}
function changeIntentFor(sourceType){
  switch(sourceType){
    case 'ENGINE_ERROR': return 'REDUCE_REPEAT_FAILURE_WITHOUT_WEAKENING_CONTRACTS';
    case 'OBSERVABILITY_ALERT': return 'IMPROVE_RELIABILITY_OR_PERFORMANCE_WITHOUT_AUTHORITY_EXPANSION';
    case 'COST_OBSERVATION': return 'REDUCE_INCREMENTAL_COST_WITHOUT_QUALITY_DEGRADATION';
    case 'HUMAN_CORRECTION': return 'REDUCE_REPEAT_HUMAN_CORRECTION_FOR_EQUIVALENT_CASES';
    case 'TRIBUNAL_DECISION': return 'IMPROVE_FUTURE_CANDIDATE_SELECTION_FROM_TRIBUNAL_EVIDENCE';
    case 'METRIC_OBSERVATION': return 'IMPROVE_MEASURED_ENGINE_OUTCOME';
    case 'ENGINE_RESULT': return 'REINFORCE_OR_REVISE_ENGINE_STRATEGY_FROM_OBSERVED_OUTCOME';
    case 'ENGINE_EVENT': return 'IMPROVE_ENGINE_STRATEGY_OR_ORCHESTRATION_FROM_EVENT_EVIDENCE';
    default: return 'CONTROLLED_ENGINE_IMPROVEMENT_FROM_LEARNING_EVIDENCE';
  }
}
function validateCandidate(candidate){
  const errors=[];
  if(!candidate||typeof candidate!=='object') return {ok:false,errors:['candidate must be object']};
  for(const key of ['candidate_id','company_id','engine_id','environment','baseline_version','baseline_version_source','candidate_version','source_learning_id','hypothesis','change_intent','created_at','state','next_gate']){
    if(candidate[key]===undefined||candidate[key]===null||candidate[key]==='') errors.push(`missing:${key}`);
  }
  if(candidate.environment!==PREPROD) errors.push('environment_must_be_preprod');
  if(candidate.baseline_version===candidate.candidate_version) errors.push('candidate_must_differ_from_baseline');
  if(!Array.isArray(candidate.evidence_refs)||candidate.evidence_refs.length===0) errors.push('evidence_refs_required');
  if(candidate.state!=='CANDIDATE') errors.push('state_must_be_candidate');
  if(candidate.prod_authorized!==false||candidate.prod_write_authorized!==false||candidate.trading_access!==false) errors.push('authority_expansion_forbidden');
  if(candidate.additional_cost_eur!==0) errors.push('incremental_cost_must_be_zero');
  return {ok:errors.length===0,errors};
}

export function buildVersionedImprovementCandidate(learning){
  const check=validateLearningRecord(learning);
  if(!check.ok) return Object.freeze({ok:false,reasons:check.errors,human_required:null,candidate:null});
  if(learning.environment!==PREPROD) return Object.freeze({ok:false,reasons:['LEARNING_MUST_BE_PREPROD'],human_required:null,candidate:null});
  if(learning.promotion_state!=='CANDIDATE') return Object.freeze({ok:false,reasons:['LEARNING_NOT_CANDIDATE'],human_required:null,candidate:null});
  if(['HIGH','CRITICAL'].includes(learning.risk_class)) return Object.freeze({ok:false,reasons:['HIGH_RISK_REQUIRES_HUMAN'],human_required:'HIGH_RISK',candidate:null});
  if(learning.confidence<MIN_AUTONOMOUS_CONFIDENCE) return Object.freeze({ok:false,reasons:['LOW_CONFIDENCE_REQUIRES_HUMAN'],human_required:'LOW_CONFIDENCE',candidate:null});
  const hasSourceVersion=typeof learning.source_version==='string'&&learning.source_version.trim().length>0;
  const baselineVersion=reqString(hasSourceVersion?learning.source_version:learning.version,'baseline_version');
  const baselineVersionSource=hasSourceVersion?'SOURCE_EVIDENCE_VERSION':'LEARNING_CONTEXT_VERSION_REQUIRES_OLD_CONTRACT_RESOLUTION';
  const metric=normalizeMetric(learning.expected_metric_delta);
  const fingerprint=stableIdempotencyKey({
    company_id:learning.company_id,engine_id:learning.engine_id,source_learning_id:learning.learning_id,
    baseline_version:baselineVersion,baseline_version_source:baselineVersionSource,hypothesis:learning.hypothesis,metric,evidence_refs:[...learning.evidence_refs].sort()
  });
  const candidateVersion=`${baselineVersion}-rsi-cand.${fingerprint.slice(0,8)}`;
  const candidate={
    schema_version:'1.0.0',state_type:'CEREBRO_VERSIONED_IMPROVEMENT_CANDIDATE',candidate_id:`cand:${fingerprint.slice(0,24)}`,
    company_id:learning.company_id,engine_id:learning.engine_id,environment:PREPROD,
    baseline_version:baselineVersion,baseline_version_source:baselineVersionSource,baseline_verification_required:!hasSourceVersion,
    candidate_version:candidateVersion,learning_runtime_version:learning.version,
    source_learning_id:learning.learning_id,source_event_ids:[...learning.source_event_ids],source_type:learning.source_type,
    source_environment:learning.source_environment??null,hypothesis:learning.hypothesis,change_intent:changeIntentFor(learning.source_type),
    target_metric:metric,confidence:learning.confidence,risk_class:learning.risk_class,evidence_refs:[...new Set(learning.evidence_refs)].sort(),
    created_at:learning.observed_at,state:'CANDIDATE',next_gate:'OLD_VS_NEW_EXPERIMENT',
    experiment_contract:{required:true,old_version:baselineVersion,new_version:candidateVersion,baseline_resolution_required:!hasSourceVersion,dataset_kinds:['HISTORICAL','SYNTHETIC'],prod_writes:false,customer_data_required:false},
    preservation_contract:{preserve_existing:true,contract_resolution_required:true,rollback_required:true,rebuild_required:true,policy_mutation_allowed:false,permission_elevation_allowed:false,budget_elevation_allowed:false},
    auto_experiment_eligible:true,promotion_authorized:false,persistent_publish_authorized:true,persistence_scope:'LOCAL_PREPROD_IMPROVEMENT_CANDIDATE_LEDGER_ONLY',
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  };
  const candidateCheck=validateCandidate(candidate);
  if(!candidateCheck.ok) return Object.freeze({ok:false,reasons:candidateCheck.errors,human_required:null,candidate:null});
  return Object.freeze({ok:true,reasons:[],human_required:null,candidate:Object.freeze(candidate)});
}

export class ImprovementCandidateLedgerV0{
  #journal;
  #records;
  constructor({file_path}){
    this.#journal=new AtomicV8Journal({file_path,kind:KIND});
    this.#records=this.#journal.load();
    this.#records.forEach((item,index)=>{
      if(item.kind!==KIND||item.sequence!==index+1) throw new Error('candidate ledger sequence mismatch');
      const check=validateCandidate(item.record);if(!check.ok) throw new Error(`invalid candidate record:${check.errors.join(',')}`);
      if(item.record_hash!==stableIdempotencyKey(item.record)) throw new Error('candidate record hash mismatch');
    });
  }
  persist(candidate){
    const check=validateCandidate(candidate);if(!check.ok) throw new Error(`invalid candidate:${check.errors.join(',')}`);
    const safe=clone(candidate);const recordHash=stableIdempotencyKey(safe);
    const prior=this.#records.find(item=>item.record.candidate_id===safe.candidate_id);
    if(prior){
      if(prior.record_hash!==recordHash) throw new Error('candidate_id conflict with different payload');
      return Object.freeze({accepted:false,duplicate:true,sequence:prior.sequence,candidate_id:safe.candidate_id,record_hash:recordHash});
    }
    const item={kind:KIND,sequence:this.#records.length+1,record:safe,record_hash:recordHash};
    this.#journal.commit([...this.#records,item]);this.#records=[...this.#records,item];
    return Object.freeze({accepted:true,duplicate:false,sequence:item.sequence,candidate_id:safe.candidate_id,record_hash:recordHash});
  }
  list(){return clone(this.#records.map(item=>item.record));}
  get operation_count(){return this.#records.length;}
  get journal_path(){return this.#journal.file_path;}
}

export function materializeImprovementCandidates({learning_ledger_file,candidate_ledger_file,company_id}){
  const company=reqString(company_id,'company_id');
  const learningLedger=new LearningLedgerV0({file_path:reqString(learning_ledger_file,'learning_ledger_file'),environment:PREPROD});
  const candidateLedger=new ImprovementCandidateLedgerV0({file_path:reqString(candidate_ledger_file,'candidate_ledger_file')});
  const persisted=[];const held=[];let skippedCrossCompany=0;
  for(const learning of learningLedger.list()){
    if(learning.company_id!==company){skippedCrossCompany+=1;continue;}
    const built=buildVersionedImprovementCandidate(learning);
    if(!built.ok){held.push({source_learning_id:learning.learning_id,reasons:built.reasons,human_required:built.human_required});continue;}
    persisted.push(candidateLedger.persist(built.candidate));
  }
  return Object.freeze({
    status:held.length?'CANDIDATES_PARTIAL_HELD':'CANDIDATES_GREEN',
    source_learning_total:learningLedger.list().filter(item=>item.company_id===company).length,
    persisted_total:persisted.filter(item=>item.accepted).length,duplicates_total:persisted.filter(item=>item.duplicate).length,
    held_total:held.length,human_required:[...new Set(held.map(item=>item.human_required).filter(Boolean))],held:Object.freeze(held),
    skipped_cross_company:skippedCrossCompany,candidate_ledger_file:candidateLedger.journal_path,candidate_total:candidateLedger.operation_count,
    next_gate:'OLD_VS_NEW_EXPERIMENT',prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

export const IMPROVEMENT_CANDIDATE_FACTORY_V0_CONTRACT=Object.freeze({
  environment:PREPROD,min_autonomous_confidence:MIN_AUTONOMOUS_CONFIDENCE,persistence:'local-atomic-v8-journal',
  candidate_state:'CANDIDATE',next_gate:'OLD_VS_NEW_EXPERIMENT',additional_cost_target_eur:0,prod_writes:false,autonomous_prod:false,trading_access:false
});
