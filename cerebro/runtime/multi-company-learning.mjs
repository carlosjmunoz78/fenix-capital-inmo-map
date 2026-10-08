import {stableIdempotencyKey,validateCanonicalContext} from './continuous-improvement-contract.mjs';

const SCOPES=Object.freeze(['COMPANY','GLOBAL_CANDIDATE']);

export function scopedKnowledge({
  company_id,engine_id,environment='PREPROD',version='0.1.0',rule_id,scope='COMPANY',context_signature,evidence_refs,
  contains_secrets=false,contains_raw_company_data=false
}){
  const context={company_id,engine_id,environment,version};
  const check=validateCanonicalContext(context,{allowProd:false});
  if(!check.ok) throw new Error(`invalid knowledge context:${check.errors.join(',')}`);
  if(!rule_id||!context_signature) throw new Error('scope identity required');
  if(!SCOPES.includes(scope)) throw new Error('invalid scope');
  if(!Array.isArray(evidence_refs)||evidence_refs.length===0) throw new Error('evidence required');
  if(contains_secrets) throw new Error('company secrets forbidden in transferable knowledge');
  if(scope==='GLOBAL_CANDIDATE'&&contains_raw_company_data) throw new Error('raw company data forbidden in global candidate');
  return Object.freeze({
    knowledge_id:stableIdempotencyKey({...context,rule_id,scope,context_signature}),
    ...context,rule_id,scope,context_signature,evidence_refs:[...new Set(evidence_refs)],contains_secrets:false,
    contains_raw_company_data:Boolean(contains_raw_company_data),cross_company_secrets:false,prod_authorized:false
  });
}

export function transferCandidate({source,target_company_id,target_context_signature,source_contains_secrets=false,source_contains_raw_company_data=false,context_compatible=false}){
  if(!source?.knowledge_id||!target_company_id||!target_context_signature) throw new Error('transfer contract incomplete');
  if(source_contains_secrets||source.contains_secrets===true) return Object.freeze({allowed:false,reason:'SECRET_ISOLATION',prod_authorized:false});
  if(source_contains_raw_company_data||source.contains_raw_company_data===true) return Object.freeze({allowed:false,reason:'RAW_COMPANY_DATA_ISOLATION',prod_authorized:false});
  if(!context_compatible||source.context_signature!==target_context_signature) return Object.freeze({allowed:false,reason:'CONTEXT_MISMATCH',prod_authorized:false});
  if(source.scope!=='GLOBAL_CANDIDATE') return Object.freeze({allowed:false,reason:'SOURCE_NOT_TRANSFERABLE',prod_authorized:false});
  if(source.company_id===target_company_id) return Object.freeze({allowed:false,reason:'SAME_COMPANY_NOT_TRANSFER',prod_authorized:false});
  return Object.freeze({
    allowed:true,state:'TRANSFER_CANDIDATE',source_knowledge_id:source.knowledge_id,source_company_id:source.company_id,
    target_company_id,target_context_signature,engine_id:source.engine_id,environment:source.environment,version:source.version,
    requires_local_validation:true,may_copy_raw_company_data:false,may_copy_secrets:false,prod_authorized:false,prod_write_authorized:false
  });
}

export function validateLocalTransfer({transfer,local_evidence_refs,local_validation_passed=false}){
  if(!transfer?.allowed) return Object.freeze({accepted:false,reason:'TRANSFER_NOT_ALLOWED',prod_authorized:false});
  if(!Array.isArray(local_evidence_refs)||local_evidence_refs.length===0) return Object.freeze({accepted:false,reason:'LOCAL_EVIDENCE_REQUIRED',prod_authorized:false});
  if(!local_validation_passed) return Object.freeze({accepted:false,reason:'LOCAL_VALIDATION_REQUIRED',prod_authorized:false});
  return Object.freeze({accepted:true,state:'LOCALLY_VALIDATED_CANDIDATE',target_company_id:transfer.target_company_id,local_evidence_refs:[...new Set(local_evidence_refs)],prod_authorized:false,prod_write_authorized:false});
}

export function tenantIsolation({request_company_id,record_company_id}){
  const allowed=request_company_id===record_company_id;
  return Object.freeze({allowed,reason:allowed?null:'CROSS_COMPANY_DENY'});
}
