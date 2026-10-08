import {stableIdempotencyKey,validateLearningRecord} from './continuous-improvement-contract.mjs';

const PERSISTENCE_SCOPE='LOCAL_PREPROD_LRN_LEDGER_ONLY';

export function preparePreprodLearningCandidate({
  shadow_record,preprod_version,bridge_status,policy_pass=false,security_pass=false,local_persistence_enabled=false
}){
  const sourceCheck=validateLearningRecord(shadow_record);
  if(!sourceCheck.ok) return Object.freeze({ok:false,reasons:sourceCheck.errors,human_required:null,candidate:null,prod_authorized:false});
  const reasons=[];
  if(shadow_record.environment!=='LAB') reasons.push('SOURCE_MUST_BE_LAB_SHADOW');
  if(bridge_status!=='SHADOW_BRIDGE_GREEN') reasons.push('SHADOW_BRIDGE_NOT_GREEN');
  if(!policy_pass) reasons.push('POLICY_GATE');
  if(!security_pass) reasons.push('SECURITY_GATE');
  if(!local_persistence_enabled) reasons.push('LOCAL_PERSISTENCE_NOT_ENABLED');
  if(!preprod_version||typeof preprod_version!=='string') reasons.push('PREPROD_VERSION_REQUIRED');
  const highRisk=['HIGH','CRITICAL'].includes(shadow_record.risk_class);
  if(highRisk){
    return Object.freeze({ok:false,reasons:[...reasons,'HIGH_RISK_REQUIRES_HUMAN'],human_required:'HIGH_RISK',candidate:null,prod_authorized:false,prod_write_authorized:false});
  }
  if(reasons.length) return Object.freeze({ok:false,reasons,human_required:null,candidate:null,prod_authorized:false,prod_write_authorized:false});
  const sourceLearningId=shadow_record.learning_id;
  const candidate={
    ...shadow_record,
    learning_id:`learn-preprod:${stableIdempotencyKey({source_learning_id:sourceLearningId,company_id:shadow_record.company_id,engine_id:shadow_record.engine_id,preprod_version}).slice(0,24)}`,
    environment:'PREPROD',version:preprod_version,
    source_learning_id:sourceLearningId,
    evidence_refs:[...new Set([...shadow_record.evidence_refs,`shadow-learning:${sourceLearningId}`])],
    promotion_state:'CANDIDATE',
    reason:'SHADOW_VALIDATED_FOR_LOCAL_PREPROD_PERSISTENCE',
    persistent_publish_authorized:true,
    persistence_scope:PERSISTENCE_SCOPE,
    rsi_publish_authorized:false,
    prod_authorized:false,
    prod_write_authorized:false,
    paid_fallback:false,
    trading_access:false
  };
  const check=validateLearningRecord(candidate);
  if(!check.ok) return Object.freeze({ok:false,reasons:check.errors,human_required:null,candidate:null,prod_authorized:false,prod_write_authorized:false});
  return Object.freeze({ok:true,reasons:[],human_required:null,candidate:Object.freeze(candidate),next_gate:'LOCAL_PREPROD_LRN_LEDGER',prod_authorized:false,prod_write_authorized:false});
}

export function persistPreparedCandidate({prepared,ledger}){
  if(!prepared?.ok||!prepared?.candidate) throw new Error('prepared PREPROD learning candidate required');
  if(!ledger||typeof ledger.persist!=='function') throw new Error('learning ledger required');
  const result=ledger.persist(prepared.candidate);
  return Object.freeze({...result,next_gate:'EXPERIMENT_OR_EVALUATION',rsi_publish_authorized:false,prod_authorized:false,prod_write_authorized:false});
}
