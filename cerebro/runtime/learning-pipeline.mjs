import {stableIdempotencyKey,validateCanonicalContext,validateLearningRecord} from './continuous-improvement-contract.mjs';

function instant(value,label){
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) throw new Error(`invalid ${label}`);
  return d.toISOString();
}

function uniqueStrings(values){
  if(!Array.isArray(values)) return [];
  return [...new Set(values.filter((v)=>typeof v==='string'&&v.trim()).map((v)=>v.trim()))];
}

export function normalizeEvent(event){
  if(!event||typeof event!=='object') throw new Error('event required');
  const required=['event_id','company_id','engine_id','environment','version','occurred_at','source_type'];
  for(const key of required) if(event[key]===undefined||event[key]===null||event[key]==='') throw new Error(`missing:${key}`);
  const context={company_id:String(event.company_id),engine_id:String(event.engine_id),environment:String(event.environment),version:String(event.version)};
  const contextCheck=validateCanonicalContext(context);
  if(!contextCheck.ok) throw new Error(`invalid event context:${contextCheck.errors.join(',')}`);
  const normalized={
    event_id:String(event.event_id),...context,occurred_at:instant(event.occurred_at,'occurred_at'),source_type:String(event.source_type),
    payload:event.payload??{},evidence_refs:uniqueStrings(event.evidence_refs)
  };
  normalized.dedupe_key=stableIdempotencyKey({company_id:normalized.company_id,engine_id:normalized.engine_id,environment:normalized.environment,version:normalized.version,event_id:normalized.event_id});
  return Object.freeze(normalized);
}

export function observeOutcome({event,expected,actual,observed_at}){
  const e=normalizeEvent(event);
  if(expected===undefined||actual===undefined) throw new Error('expected and actual required');
  const observedAt=instant(observed_at,'observed_at');
  return Object.freeze({
    outcome_id:stableIdempotencyKey({dedupe_key:e.dedupe_key,observed_at:observedAt}),
    event_id:e.event_id,company_id:e.company_id,engine_id:e.engine_id,environment:e.environment,version:e.version,
    expected,actual,delta:typeof expected==='number'&&typeof actual==='number'?actual-expected:null,
    observed_at:observedAt,evidence_refs:e.evidence_refs,prod_write:false
  });
}

export function createEvidence({outcome,refs,confidence,provenance={}}){
  if(!outcome?.outcome_id) throw new Error('outcome required');
  const safeRefs=uniqueStrings(refs);
  if(safeRefs.length===0) throw new Error('evidence refs required');
  if(typeof confidence!=='number'||!Number.isFinite(confidence)||confidence<0||confidence>1) throw new Error('invalid confidence');
  const context={company_id:outcome.company_id,engine_id:outcome.engine_id,environment:outcome.environment,version:outcome.version};
  const check=validateCanonicalContext(context);
  if(!check.ok) throw new Error(`invalid evidence context:${check.errors.join(',')}`);
  return Object.freeze({
    evidence_id:stableIdempotencyKey({outcome_id:outcome.outcome_id,refs:[...safeRefs].sort(),provenance}),
    ...context,outcome_id:outcome.outcome_id,refs:safeRefs,confidence,provenance:{...provenance},provenance_locked:true,
    persistent_publish_authorized:false,prod_write:false
  });
}

export function proposeCandidate({
  event,outcome,evidence,hypothesis,expected_metric_delta,risk_class='LOW',created_by=null,reason='OBSERVED_OUTCOME',causal_claim=false
}){
  if(!outcome?.outcome_id) throw new Error('outcome required');
  if(!evidence?.provenance_locked) throw new Error('evidence must be provenance locked');
  if(typeof hypothesis!=='string'||!hypothesis.trim()) throw new Error('hypothesis required');
  if(!expected_metric_delta||typeof expected_metric_delta!=='object') throw new Error('expected_metric_delta required');
  if(causal_claim) throw new Error('causal claims require separate experiment evidence');
  const e=normalizeEvent(event);
  if(e.company_id!==outcome.company_id||e.engine_id!==outcome.engine_id||e.environment!==outcome.environment||e.version!==outcome.version) throw new Error('event/outcome context mismatch');
  if(e.company_id!==evidence.company_id||e.engine_id!==evidence.engine_id||e.environment!==evidence.environment||e.version!==evidence.version) throw new Error('event/evidence context mismatch');
  const learning={
    learning_id:`learn:${stableIdempotencyKey({event:e.dedupe_key,outcome:outcome.outcome_id,evidence:evidence.evidence_id,hypothesis}).slice(0,24)}`,
    company_id:e.company_id,engine_id:e.engine_id,environment:e.environment,version:e.version,
    source_event_ids:[e.event_id],source_type:e.source_type,observed_at:outcome.observed_at,hypothesis:hypothesis.trim(),
    expected_metric_delta,actual_metric_delta:outcome.delta,confidence:evidence.confidence,risk_class,
    evidence_refs:[...new Set([...e.evidence_refs,...evidence.refs,`evidence:${evidence.evidence_id}`])],promotion_state:'CANDIDATE',
    created_by:created_by??e.engine_id,reason,judge_decision:null,outcome_id:outcome.outcome_id,evidence_id:evidence.evidence_id,
    causal_claim:false,persistent_publish_authorized:false,prod_authorized:false,prod_write_authorized:false
  };
  const validation=validateLearningRecord(learning);
  if(!validation.ok) throw new Error(`invalid learning candidate:${validation.errors.join(',')}`);
  return Object.freeze(learning);
}

export function dedupeByKey(records,key='dedupe_key'){
  const seen=new Set();
  return (records??[]).filter((record)=>{
    const value=record?.[key];
    if(!value||seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}
