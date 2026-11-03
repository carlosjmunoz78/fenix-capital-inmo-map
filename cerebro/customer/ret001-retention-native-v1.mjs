import crypto from 'node:crypto';
import {serialize,deserialize} from 'node:v8';

const PREPROD='PREPROD';
const ENGINE='RET-001';
const VERSION='ret001-retention-native-v1';
const HUMAN_REQUIRED=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const FORBIDDEN=new Set(['email','phone','telephone','mobile','name','first_name','last_name','full_name','address','postal_address','dni','nif','nie','iban','message','message_text','body','token','jwt','secret','password','api_key','recipient']);
const clone=v=>deserialize(serialize(v));
function text(v,l,max=200){if(typeof v!=='string'||!v.trim())throw new TypeError(`${l} required`);const x=v.trim();if(x.length>max)throw new TypeError(`${l} too long`);return x;}
function num(v,l,min=0,max=1){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw new TypeError(`${l} invalid`);return n;}
function integer(v,l,min=0,max=3650){const n=Number(v);if(!Number.isInteger(n)||n<min||n>max)throw new TypeError(`${l} invalid`);return n;}
function bool(v,l){if(typeof v!=='boolean')throw new TypeError(`${l} invalid`);return v;}
function assertPlain(v,l='input',seen=new WeakSet()){
  if(v===null||['string','number','boolean','undefined'].includes(typeof v)){if(typeof v==='number'&&!Number.isFinite(v))throw new TypeError(`${l} nonfinite`);return;}
  if(typeof v!=='object')throw new TypeError(`${l} unsupported`);if(seen.has(v))throw new TypeError(`${l} circular`);seen.add(v);
  try{if(Array.isArray(v)){v.forEach((x,i)=>assertPlain(x,`${l}[${i}]`,seen));return;}const p=Object.getPrototypeOf(v);if(p!==Object.prototype&&p!==null)throw new TypeError(`${l} plain object required`);for(const [k,d] of Object.entries(Object.getOwnPropertyDescriptors(v))){if(d.get||d.set)throw new TypeError(`${l}.${k} accessor forbidden`);if(!d.enumerable)continue;if(FORBIDDEN.has(k.toLowerCase()))throw new Error(`raw PII/message/secret forbidden: ${l}.${k}`);assertPlain(d.value,`${l}.${k}`,seen);}}finally{seen.delete(v);}
}
function context(v){assertPlain(v,'context');const c=Object.freeze({company_id:text(v?.company_id,'context.company_id',120),engine_id:text(v?.engine_id,'context.engine_id',80),environment:text(v?.environment,'context.environment',40),version:text(v?.version,'context.version',80)});if(c.environment!==PREPROD)throw new Error('RET001_PREPROD_ONLY');if(c.engine_id!==ENGINE)throw new Error('RET001_OWNER_MISMATCH');return c;}
function stableId(prefix,v){return `${prefix}_${crypto.createHash('sha256').update(serialize(v)).digest('hex').slice(0,24)}`;}
function riskBand(score){return score>=0.75?'CRITICAL':score>=0.5?'HIGH':score>=0.25?'MEDIUM':'LOW';}
function planFor({band,explicit_abandonment,complaint_open,no_response_days,confidence}){
  const steps=[];
  if(explicit_abandonment)steps.push('REVIEW_ABANDONMENT_REASON');
  if(complaint_open)steps.push('RESOLVE_OPEN_COMPLAINT');
  if(no_response_days>=7)steps.push('PREPARE_CONTEXTUAL_REENGAGEMENT');
  else if(no_response_days>=3)steps.push('PREPARE_GENTLE_FOLLOW_UP');
  if(['HIGH','CRITICAL'].includes(band))steps.push('PRIORITIZE_HUMAN_REVIEW_QUEUE');
  if(confidence>=0.7&&!explicit_abandonment&&!complaint_open&&band!=='CRITICAL')steps.push('PREPARE_RETENTION_PLAYBOOK');
  return [...new Set(steps.length?steps:['MONITOR_RETENTION_SIGNAL'])];
}

export function assessRetentionRisk(input={}){
  assertPlain(input);const c=context(input.context);const s=input.signals??{};assertPlain(s,'signals');
  const customer_ref=text(s.customer_ref,'signals.customer_ref',200);
  const no_response_days=integer(s.no_response_days??0,'signals.no_response_days',0,3650);
  const engagement_drop=num(s.engagement_drop??0,'signals.engagement_drop');
  const friction_score=num(s.friction_score??0,'signals.friction_score');
  const satisfaction_risk=num(s.satisfaction_risk??0,'signals.satisfaction_risk');
  const explicit_abandonment=bool(s.explicit_abandonment??false,'signals.explicit_abandonment');
  const complaint_open=bool(s.complaint_open??false,'signals.complaint_open');
  const legal_risk=bool(s.legal_risk??false,'signals.legal_risk');
  const high_risk=bool(s.high_risk??false,'signals.high_risk');
  const customer_human_request=bool(s.customer_human_request??false,'signals.customer_human_request');
  const confidence=num(s.confidence??1,'signals.confidence');
  const silence=Math.min(no_response_days/14,1);
  const score=Math.min(1,Number((silence*0.30+engagement_drop*0.20+friction_score*0.20+satisfaction_risk*0.15+(explicit_abandonment?0.1:0)+(complaint_open?0.05:0)).toFixed(6)));
  const band=riskBand(score);
  let human_required=null;
  if(legal_risk)human_required='LEGAL_REQUIRED';
  else if(customer_human_request)human_required='CUSTOMER_HUMAN_REQUEST';
  else if(high_risk||band==='CRITICAL')human_required='HIGH_RISK';
  else if(confidence<0.65)human_required='LOW_CONFIDENCE';
  if(human_required&&!HUMAN_REQUIRED.has(human_required))throw new Error('RET001_INVALID_HUMAN_REQUIRED');
  const playbook=planFor({band,explicit_abandonment,complaint_open,no_response_days,confidence});
  const action_mode=human_required?'HUMAN_REVIEW':'PLAN_ONLY';
  const assessment_id=stableId('ret',[c.company_id,customer_ref,no_response_days,engagement_drop,friction_score,satisfaction_risk,explicit_abandonment,complaint_open,legal_risk,high_risk,customer_human_request,confidence]);
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_RETENTION_ASSESSMENT',model_version:VERSION,context:Object.freeze({...c}),assessment_id,customer_ref,risk_score:score,risk_band:band,confidence,human_required,action_mode,rescue_plan:Object.freeze({playbook:Object.freeze(playbook),dispatch_authorized:false,crm_write_authorized:false,external_side_effect_executed:false}),read_only:true,source_of_truth_replaced:false,crm_write_authorized:false,db_mutation_authorized:false,external_dispatch_authorized:false,external_side_effect_executed:false,ml_used:false,ai_required:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
}

export function compareRetentionAssessment(a,b){assertPlain(a,'a');assertPlain(b,'b');const same=a?.assessment_id===b?.assessment_id&&a?.risk_score===b?.risk_score&&a?.risk_band===b?.risk_band&&a?.human_required===b?.human_required&&JSON.stringify(a?.rescue_plan?.playbook)===JSON.stringify(b?.rescue_plan?.playbook);return Object.freeze({status:same?'REPLAY_GREEN':'REPLAY_MISMATCH',replay_green:same,assessment_id:a?.assessment_id??null,comparison_assessment_id:b?.assessment_id??null,prod_authorized:false,additional_cost_eur:0});}
export async function retentionAssessmentJobHandler({context:ctx,payload}){return clone(assessRetentionRisk({...payload,context:ctx}));}
export const RET001_RETENTION_V1_CONTRACT=Object.freeze({engine_id:ENGINE,environment:PREPROD,model_version:VERSION,job_name:'retention.assess',upstream:Object.freeze(['C360-001','COM-001','NOTIF-001']),outputs:Object.freeze(['risk_score','risk_band','rescue_plan','human_required']),multi_company:true,read_only:true,wrap_existing_sources:true,source_of_truth_replacement:false,raw_pii_allowed:false,deterministic_first:true,ml_used:false,ai_required:false,external_dispatch:false,crm_writes:false,db_mutations:false,prod_writes:false,trading_access:false,additional_cost_target_eur:0});
