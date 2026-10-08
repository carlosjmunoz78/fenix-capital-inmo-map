import crypto from 'node:crypto';

export const RSI_RECOVERY_SOURCE=Object.freeze({
  source_pr:416,
  source_head:'a79d51dccb794ab0718d6959554185bfab3ca0b4',
  recovered_against_main:'63e4a02341d8884b4df21c7c2a94562b06844059',
  recovery_mode:'PORT_WITH_CHANGES'
});

export const ENVIRONMENTS=Object.freeze(['LAB','PREPROD','PROD']);
export const RISK_CLASSES=Object.freeze(['LOW','MEDIUM','HIGH','CRITICAL']);
export const JUDGE_DECISIONS=Object.freeze(['PASS','FAIL','MORE_EVIDENCE','HUMAN_REQUIRED']);
export const PROMOTION_STATES=Object.freeze(['CANDIDATE','SHADOW','PREPROD','CANARY','ACTIVE','REJECTED','ROLLED_BACK']);
export const KNOWLEDGE_STATES=Object.freeze(['CURRENT','VALIDATED','UNCERTAIN','STALE','SUPERSEDED','REJECTED','HISTORICAL']);
export const HUMAN_REQUIRED_CODES=Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

const REQUIRED_LEARNING_FIELDS=Object.freeze([
  'learning_id','company_id','engine_id','environment','version','source_event_ids',
  'source_type','observed_at','hypothesis','expected_metric_delta','confidence',
  'risk_class','evidence_refs','promotion_state','created_by','reason'
]);

const REQUIRED_IMPROVEMENT_FIELDS=Object.freeze([
  'company_id','engine_id','environment','version','baseline_version','candidate_version',
  'scope','hypothesis','affected_contracts','tests_before','tests_after',
  'evaluation_before','evaluation_after','cost_before','cost_after','risks',
  'rollback','rebuild','judge','promotion_decision'
]);

function nonEmptyString(value){return typeof value==='string'&&value.trim().length>0;}

function canonicalize(value){
  if(value===null||typeof value==='string'||typeof value==='boolean') return value;
  if(typeof value==='number'){
    if(!Number.isFinite(value)) throw new TypeError('idempotency input numbers must be finite');
    return value;
  }
  if(Array.isArray(value)) return value.map(canonicalize);
  if(typeof value!=='object') throw new TypeError('idempotency input must be JSON-compatible');
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null) throw new TypeError('idempotency input objects must be plain objects');
  return Object.fromEntries(Object.keys(value).sort().map((key)=>{
    if(value[key]===undefined) throw new TypeError('idempotency input must not contain undefined');
    return [key,canonicalize(value[key])];
  }));
}

export function stableIdempotencyKey(parts){
  if(!parts||typeof parts!=='object'||Array.isArray(parts)) throw new TypeError('parts must be a plain object');
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(parts))).digest('hex');
}

export function validateCanonicalContext(value,{allowProd=true}={}){
  const errors=[];
  if(!value||typeof value!=='object') return {ok:false,errors:['context must be an object']};
  for(const key of ['company_id','engine_id','environment','version']) if(!nonEmptyString(value[key])) errors.push(`missing:${key}`);
  if(!ENVIRONMENTS.includes(value.environment)) errors.push('invalid:environment');
  if(!allowProd&&value.environment==='PROD') errors.push('prod_context_not_allowed');
  return {ok:errors.length===0,errors};
}

export function validateLearningRecord(record){
  const errors=[];
  if(!record||typeof record!=='object') return {ok:false,errors:['record must be an object']};
  for(const key of REQUIRED_LEARNING_FIELDS){
    if(record[key]===undefined||record[key]===null||record[key]==='') errors.push(`missing:${key}`);
  }
  errors.push(...validateCanonicalContext(record).errors);
  if(!RISK_CLASSES.includes(record.risk_class)) errors.push('invalid:risk_class');
  if(!PROMOTION_STATES.includes(record.promotion_state)) errors.push('invalid:promotion_state');
  if(!Array.isArray(record.source_event_ids)||record.source_event_ids.length===0) errors.push('invalid:source_event_ids');
  if(!Array.isArray(record.evidence_refs)||record.evidence_refs.length===0) errors.push('invalid:evidence_refs');
  if(typeof record.confidence!=='number'||!Number.isFinite(record.confidence)||record.confidence<0||record.confidence>1) errors.push('invalid:confidence');
  if(record.judge_decision!=null&&!JUDGE_DECISIONS.includes(record.judge_decision)) errors.push('invalid:judge_decision');
  if(record.judge_decision==='HUMAN_REQUIRED'&&!HUMAN_REQUIRED_CODES.includes(record.human_required)) errors.push('invalid:human_required');
  return {ok:errors.length===0,errors:[...new Set(errors)]};
}

export function validateImprovementPackage(pkg){
  const errors=[];
  if(!pkg||typeof pkg!=='object') return {ok:false,errors:['package must be an object']};
  for(const key of REQUIRED_IMPROVEMENT_FIELDS){
    if(pkg[key]===undefined||pkg[key]===null||pkg[key]==='') errors.push(`missing:${key}`);
  }
  errors.push(...validateCanonicalContext(pkg).errors);
  if(pkg.baseline_version===pkg.candidate_version) errors.push('candidate_must_differ_from_baseline');
  if(!Array.isArray(pkg.affected_contracts)||pkg.affected_contracts.length===0) errors.push('invalid:affected_contracts');
  if(!Array.isArray(pkg.risks)) errors.push('invalid:risks');
  if(pkg.judge?.independent!==true) errors.push('judge_not_independent');
  if(!pkg.rollback?.ref) errors.push('rollback_not_ready');
  if(!pkg.rebuild?.ref) errors.push('rebuild_not_ready');
  return {ok:errors.length===0,errors:[...new Set(errors)]};
}

export function canPromote({record,improvementPackage,independentJudge=false,rollbackReady=false,rebuildReady=false,policyLocked=false}={}){
  const recordCheck=validateLearningRecord(record);
  const packageCheck=validateImprovementPackage(improvementPackage);
  const blockers=[...recordCheck.errors,...packageCheck.errors];
  if(!independentJudge) blockers.push('judge_not_independent');
  if(!rollbackReady) blockers.push('rollback_not_ready');
  if(!rebuildReady) blockers.push('rebuild_not_ready');
  if(!policyLocked) blockers.push('policy_or_permissions_mutable_by_candidate');
  if(record?.judge_decision!=='PASS') blockers.push('judge_not_pass');
  if(!['PREPROD','CANARY','ACTIVE'].includes(record?.promotion_state)) blockers.push('promotion_state_not_promotable');
  return Object.freeze({
    ok:blockers.length===0,
    blockers:[...new Set(blockers)],
    next_gate:blockers.length===0?'PROMOTION_PIPELINE_REVIEW':'HOLD',
    prod_authorized:false,
    prod_write_authorized:false,
    permissions_elevated:false,
    budget_elevated:false
  });
}

export function checkpointContract({company_id,engine_id,environment='PREPROD',version='0.1.0',cursor,last_event_at}){
  const contextCheck=validateCanonicalContext({company_id,engine_id,environment,version});
  if(!contextCheck.ok) throw new Error(`invalid checkpoint context:${contextCheck.errors.join(',')}`);
  const checkpoint={company_id,engine_id,environment,version,cursor:cursor??null,last_event_at:last_event_at??null};
  return Object.freeze({...checkpoint,idempotency_key:stableIdempotencyKey(checkpoint)});
}
