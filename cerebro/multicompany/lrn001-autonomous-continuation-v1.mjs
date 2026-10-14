import {createHash} from 'node:crypto';
import {buildUniversalLearningEventReport} from '../runtime/universal-learning-ingress.mjs';

export const LRN001_MULTICOMPANY_ENVIRONMENT='PREPROD';
export const LRN001_MULTICOMPANY_VERSION='1.0.0';
export const LRN001_MULTICOMPANY_ENGINE_ID='LRN-001';
export const LRN001_ACCEPTED_SIGNAL_TYPES=Object.freeze(['ENGINE_RESULT','ENGINE_ERROR','ENGINE_EVENT','METRIC_OBSERVATION','COST_OBSERVATION','HUMAN_CORRECTION','TRIBUNAL_DECISION','OBSERVABILITY_ALERT']);
export const HUMAN_REQUIRED_CODES=Object.freeze(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const HUMAN_REQUIRED_SET=new Set(HUMAN_REQUIRED_CODES);
const ACCEPTED_SET=new Set(LRN001_ACCEPTED_SIGNAL_TYPES);
const RAW_OR_PII_KEY=/(?:^|_)(?:message|text|transcript|prompt|completion|raw|raw_content|user_message|assistant_message|conversation_content|audio_bytes|email|phone|mobile|dni|nif|iban|customer_payload)(?:$|_)/i;
const VERDICTS=new Set(['NEW_BETTER','OLD_BETTER','EQUIVALENT','REJECTED','HOLD']);
const CONTINUATION_STATES=new Set(['PENDING_CONTROLLED_EVALUATION','PREPROD_CONTINUATION_ELIGIBLE','REJECTED_BY_HARD_GATES','REJECTED_NOT_NEW_BETTER','REJECTED_SCORE_REGRESSION','HUMAN_REQUIRED']);

function sha256(value){return createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value),'utf8').digest('hex');}
function reqString(value,label,{max=500}={}){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);const out=value.trim();if(out.length>max)throw new Error(`${label} too long`);return out;}
function finite(value,label){const n=Number(value);if(!Number.isFinite(n))throw new Error(`${label} must be finite`);return n;}
function iso(value,label='evidence_at'){const raw=reqString(value,label,{max:80});if(Number.isNaN(Date.parse(raw)))throw new Error(`${label} invalid`);return new Date(raw).toISOString();}
function rejectRawOrPii(value,path='root',depth=0){
  if(depth>8)throw new Error('SECURITY_INCIDENT:PAYLOAD_TOO_DEEP');
  if(value==null||typeof value!=='object')return;
  if(Array.isArray(value)){for(let i=0;i<value.length;i++)rejectRawOrPii(value[i],`${path}[${i}]`,depth+1);return;}
  for(const [key,item] of Object.entries(value)){
    if(RAW_OR_PII_KEY.test(key))throw new Error(`SECURITY_INCIDENT:RAW_OR_PII_FORBIDDEN:${path}.${key}`);
    rejectRawOrPii(item,`${path}.${key}`,depth+1);
  }
}
function assertActivation(activation,company_id){
  if(!activation||activation.engine_id!=='ENGACT-001'||activation.company_id!==company_id)throw new Error('POLICY_CONFLICT:ENGACT_SCOPE');
  if(activation.environment!=='PREPROD'||activation.human_required_code)throw new Error('POLICY_CONFLICT:ENGACT_NOT_GREEN');
  if(activation.prod_authorized===true||activation.prod_write_authorized===true||activation.trading_access===true||Number(activation.additional_cost_eur||0)!==0)throw new Error('POLICY_CONFLICT:ENGACT_AUTHORITY');
  if(activation.payload?.next_gate!=='MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED')throw new Error('POLICY_CONFLICT:ENGACT_NEXT_GATE');
}
function assertSignalScope(signal,company_id){
  if(!signal||typeof signal!=='object'||Array.isArray(signal))throw new Error('learning signal object required');
  if(signal.company_id!==company_id)throw new Error('POLICY_CONFLICT:MIXED_COMPANY_LEARNING_BATCH');
  const type=reqString(signal.signal_type,'signal_type',{max:80}).toUpperCase();
  if(!ACCEPTED_SET.has(type))throw new Error(`POLICY_CONFLICT:UNSUPPORTED_SIGNAL_TYPE:${type}`);
  rejectRawOrPii(signal);
}
function evaluateSafety(events){
  if(events.some((event)=>event.risk_class==='HIGH'||event.severity==='CRITICAL'))return 'HIGH_RISK';
  if(events.some((event)=>Number(event.confidence)<0.70))return 'LOW_CONFIDENCE';
  return null;
}
function normalizeEvaluation(value){
  if(value==null)return null;
  if(typeof value!=='object'||Array.isArray(value))throw new Error('evaluation must be object');
  rejectRawOrPii(value,'evaluation');
  const old_score=finite(value.old_score,'evaluation.old_score');
  const new_score=finite(value.new_score,'evaluation.new_score');
  const hard_gates_green=value.hard_gates_green===true;
  const tribunal_verdict=reqString(value.tribunal_verdict,'evaluation.tribunal_verdict',{max:40}).toUpperCase();
  if(!VERDICTS.has(tribunal_verdict))throw new Error('evaluation.tribunal_verdict invalid');
  const evaluation_ref=value.evaluation_ref?reqString(value.evaluation_ref,'evaluation.evaluation_ref',{max:500}):null;
  const tribunal_ref=value.tribunal_ref?reqString(value.tribunal_ref,'evaluation.tribunal_ref',{max:500}):null;
  const rollback_ref=value.rollback_ref?reqString(value.rollback_ref,'evaluation.rollback_ref',{max:500}):null;
  return Object.freeze({old_score,new_score,score_delta:new_score-old_score,hard_gates_green,tribunal_verdict,evaluation_ref,tribunal_ref,rollback_ref});
}
function continuationDecision({events,evaluation}){
  const human=evaluateSafety(events);
  if(human)return {state:'HUMAN_REQUIRED',human_required_code:human,action:'HOLD_FOR_HUMAN_EXCEPTION'};
  if(!evaluation||!evaluation.evaluation_ref||!evaluation.tribunal_ref||!evaluation.rollback_ref)return {state:'PENDING_CONTROLLED_EVALUATION',human_required_code:null,action:'RUN_OLD_VS_NEW_AND_TRIBUNAL'};
  if(!evaluation.hard_gates_green)return {state:'REJECTED_BY_HARD_GATES',human_required_code:null,action:'REJECT_CANDIDATE'};
  if(evaluation.tribunal_verdict!=='NEW_BETTER')return {state:'REJECTED_NOT_NEW_BETTER',human_required_code:null,action:'KEEP_OLD'};
  if(!(evaluation.new_score>evaluation.old_score))return {state:'REJECTED_SCORE_REGRESSION',human_required_code:null,action:'KEEP_OLD'};
  return {state:'PREPROD_CONTINUATION_ELIGIBLE',human_required_code:null,action:'CONTINUE_PREPROD_LEARNING_CYCLE'};
}

export function buildMultiCompanyLrn001Continuation({company_id,evidence_at,activation,signals,evaluation=null,environment='PREPROD'}={}){
  const tenant=reqString(company_id,'company_id',{max:160});
  if(environment!==LRN001_MULTICOMPANY_ENVIRONMENT)throw new Error('PREPROD_ONLY');
  const at=iso(evidence_at);
  assertActivation(activation,tenant);
  if(!Array.isArray(signals)||signals.length===0||signals.length>100)throw new Error('signals must contain 1..100 items');
  for(const signal of signals)assertSignalScope(signal,tenant);
  const report=buildUniversalLearningEventReport({signals});
  const companies=new Set(report.events.map((event)=>event.company_id));
  if(companies.size!==1||!companies.has(tenant))throw new Error('POLICY_CONFLICT:MIXED_COMPANY_NORMALIZED_EVENTS');
  const normalizedEvaluation=normalizeEvaluation(evaluation);
  const decision=continuationDecision({events:report.events,evaluation:normalizedEvaluation});
  if(!CONTINUATION_STATES.has(decision.state))throw new Error('invalid continuation state');
  if(decision.human_required_code&&!HUMAN_REQUIRED_SET.has(decision.human_required_code))throw new Error('invalid human_required_code');
  const event_ids=report.events.map((event)=>event.event_id).sort((a,b)=>a.localeCompare(b));
  const event_digest=sha256({company_id:tenant,event_ids});
  const evidence_sha256=sha256({company_id:tenant,engine_id:LRN001_MULTICOMPANY_ENGINE_ID,evidence_at:at,event_digest,evaluation:normalizedEvaluation,decision});
  const next_gate=decision.state==='PREPROD_CONTINUATION_ELIGIBLE'?'MULTICOMPANY_PHYSICAL_E2E_ACCEPTANCE_REQUIRED':'MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED';
  const result={
    company_id:tenant,engine_id:LRN001_MULTICOMPANY_ENGINE_ID,environment:LRN001_MULTICOMPANY_ENVIRONMENT,version:LRN001_MULTICOMPANY_VERSION,evidence_at:at,
    activation_evidence_sha256:activation.evidence_sha256??activation.result_sha256??null,event_count:report.events.length,event_ids,event_digest,evidence_sha256,
    continuation_state:decision.state,candidate_action:decision.action,human_required_code:decision.human_required_code,evaluation:normalizedEvaluation,
    next_gate,read_only:true,learning_candidate_only:true,canonical_knowledge_write_authorized:false,persistent_publish_authorized:false,publish_authorized:false,
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  };
  result.result_sha256=sha256(result);
  return Object.freeze(result);
}

export function lrn001PersistenceEnvelope(result,{idempotency_key,recorded_by}={}){
  if(!result||result.engine_id!==LRN001_MULTICOMPANY_ENGINE_ID||result.environment!=='PREPROD'||!CONTINUATION_STATES.has(result.continuation_state))throw new Error('invalid LRN-001 continuation result');
  if(result.prod_authorized!==false||result.prod_write_authorized!==false||result.trading_access!==false||Number(result.additional_cost_eur)!==0)throw new Error('POLICY_CONFLICT:LRN001_AUTHORITY');
  const key=reqString(idempotency_key,'idempotency_key',{max:300});
  const actor=reqString(recorded_by,'recorded_by',{max:200});
  const evaluation=result.evaluation;
  return Object.freeze({company_id:result.company_id,engine_id:'LRN-001',environment:'PREPROD',version:result.version,evidence_at:result.evidence_at,event_count:result.event_count,event_digest:result.event_digest,evidence_sha256:result.evidence_sha256,result_sha256:result.result_sha256,continuation_state:result.continuation_state,old_score:evaluation?.old_score??null,new_score:evaluation?.new_score??null,hard_gates_green:evaluation?.hard_gates_green??false,tribunal_verdict:evaluation?.tribunal_verdict??null,evaluation_ref:evaluation?.evaluation_ref??null,tribunal_ref:evaluation?.tribunal_ref??null,rollback_ref:evaluation?.rollback_ref??null,human_required_code:result.human_required_code,idempotency_key:key,recorded_by:actor,canonical_knowledge_write_authorized:false,publish_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
}
