import {KNOWLEDGE_STATES,stableIdempotencyKey,validateCanonicalContext} from './continuous-improvement-contract.mjs';

export {KNOWLEDGE_STATES};

export function assessKnowledge({
  company_id,engine_id,environment='PREPROD',version='0.1.0',knowledge_ref,state='CURRENT',confidence,
  age_ms,ttl_ms,drift=false,contradictions=0,replacement_ref=null,evidence_refs=[]
}){
  const context={company_id,engine_id,environment,version};
  const check=validateCanonicalContext(context,{allowProd:false});
  if(!check.ok) throw new Error(`invalid knowledge context:${check.errors.join(',')}`);
  if(!knowledge_ref) throw new Error('knowledge_ref required');
  if(!KNOWLEDGE_STATES.includes(state)) throw new Error('invalid state');
  if(typeof confidence!=='number'||!Number.isFinite(confidence)||confidence<0||confidence>1) throw new Error('invalid confidence');
  if(!Number.isFinite(age_ms)||age_ms<0||!Number.isFinite(ttl_ms)||ttl_ms<=0) throw new Error('invalid time');
  if(!Number.isInteger(contradictions)||contradictions<0) throw new Error('invalid contradictions');
  if(!Array.isArray(evidence_refs)) throw new Error('evidence_refs must be an array');
  let next=state;
  let nextConfidence=confidence;
  let reason='UNCHANGED';
  if(drift||contradictions>0){
    next='UNCERTAIN';
    nextConfidence=Math.max(0,confidence-(drift?0.15:0)-Math.min(0.4,contradictions*0.1));
    reason='DRIFT_OR_CONTRADICTION';
  }
  if(age_ms>ttl_ms){
    next='STALE';
    nextConfidence=Math.min(nextConfidence,0.49);
    reason='TTL_EXPIRED';
  }
  if(replacement_ref){
    next='SUPERSEDED';
    reason='REPLACEMENT_VALIDATED';
  }
  return Object.freeze({
    assessment_id:stableIdempotencyKey({...context,knowledge_ref,state,confidence,age_ms,ttl_ms,drift,contradictions,replacement_ref,evidence_refs:[...evidence_refs].sort()}),
    ...context,knowledge_ref,prior_state:state,state:next,confidence:Number(nextConfidence.toFixed(4)),reason,replacement_ref,
    evidence_refs:[...new Set(evidence_refs)],history_preserved:true,delete_original:false,destructive_delete:false,prod_authorized:false
  });
}

export function historicalTransition({company_id,engine_id,environment='PREPROD',version='0.1.0',knowledge_ref,prior_state,next_state,evidence_ref}){
  const context={company_id,engine_id,environment,version};
  const check=validateCanonicalContext(context,{allowProd:false});
  if(!check.ok) throw new Error(`invalid history context:${check.errors.join(',')}`);
  if(!knowledge_ref) throw new Error('knowledge_ref required');
  if(!KNOWLEDGE_STATES.includes(prior_state)||!KNOWLEDGE_STATES.includes(next_state)) throw new Error('invalid state');
  if(!evidence_ref) throw new Error('evidence required');
  return Object.freeze({
    transition_id:stableIdempotencyKey({...context,knowledge_ref,prior_state,next_state,evidence_ref}),
    ...context,knowledge_ref,prior_state,next_state,evidence_ref,append_history:true,destructive_delete:false,delete_original:false,prod_authorized:false
  });
}
