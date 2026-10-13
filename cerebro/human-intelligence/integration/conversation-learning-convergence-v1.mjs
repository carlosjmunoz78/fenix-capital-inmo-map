import { createHash } from 'node:crypto';
import { buildUniversalLearningEventReport } from '../../runtime/universal-learning-ingress.mjs';

const CHANNELS=new Set(['CONSOLE_TEXT','CONSOLE_VOICE','TELEGRAM_TEXT','TELEGRAM_VOICE','APP_ANA_TEXT','APP_ANA_VOICE']);
const SOURCE_ENVS=new Set(['LAB','PREPROD','SHADOW','CANARY','PROD']);
const RAW_KEYS=/(?:^|_)(?:message|text|transcript|prompt|completion|raw|raw_content|user_message|assistant_message|conversation_content|audio_bytes)(?:$|_)/i;

function reqString(value,label,{max=240,token=false}={}){
  if(typeof value!=='string'||!value.trim())throw new Error(`${label}_required`);
  const out=value.trim();
  if(out.length>max)throw new Error(`${label}_too_long`);
  if(token&&!/^[A-Za-z0-9_.:-]+$/.test(out))throw new Error(`${label}_invalid_token`);
  return out;
}
function iso(value,label='observed_at'){
  const raw=reqString(value,label,{max:80});
  if(Number.isNaN(Date.parse(raw)))throw new Error(`${label}_invalid`);
  return new Date(raw).toISOString();
}
function finite(value,label){const n=Number(value);if(!Number.isFinite(n))throw new Error(`${label}_finite_required`);return n;}
function bool(value){return value===true;}
function digest(value){return createHash('sha256').update(JSON.stringify(value),'utf8').digest('hex');}
function engineFor(channel){return channel.includes('VOICE')?'VOICE-001':'CHAT-001';}
function assertChannel(channel){const out=reqString(channel,'channel_id',{max:40,token:true});if(!CHANNELS.has(out))throw new Error('unsupported_channel');return out;}
function assertEnv(value){const out=reqString(value??'PROD','source_environment',{max:20,token:true}).toUpperCase();if(!SOURCE_ENVS.has(out))throw new Error('unsupported_source_environment');return out;}
function rejectRaw(value,{depth=0}={}){
  if(depth>8)throw new Error('observation_too_deep');
  if(value==null||typeof value!=='object')return;
  if(Array.isArray(value)){for(const item of value)rejectRaw(item,{depth:depth+1});return;}
  for(const [key,item] of Object.entries(value)){
    if(RAW_KEYS.test(key))throw new Error(`raw_conversation_content_forbidden:${key}`);
    rejectRaw(item,{depth:depth+1});
  }
}
function safeMetrics(metrics={}){
  if(metrics==null)return {};
  if(typeof metrics!=='object'||Array.isArray(metrics))throw new Error('metrics_object_required');
  const keys=Object.keys(metrics);
  if(keys.length>32)throw new Error('metrics_too_large');
  const out={};
  for(const key of keys){
    if(!/^[A-Za-z0-9_.:-]{1,80}$/.test(key))throw new Error(`metric_key_invalid:${key}`);
    const value=metrics[key];
    if(typeof value==='boolean')out[key]=value;
    else if(typeof value==='number')out[key]=finite(value,`metric:${key}`);
    else throw new Error(`metric_value_must_be_number_or_boolean:${key}`);
  }
  return out;
}
function safeCode(value,label,fallback='UNSPECIFIED'){
  if(value==null||value==='')return fallback;
  return reqString(String(value).toUpperCase(),label,{max:80,token:true});
}
function baseSafety(){return {contains_customer_data:false,contains_secrets:false,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false};}

export function buildRealConversationLearningSignals(observation={}){
  rejectRaw(observation);
  const channel_id=assertChannel(observation.channel_id);
  const source_environment=assertEnv(observation.source_environment??'PROD');
  const observation_id=reqString(observation.observation_id,'observation_id',{max:120,token:true});
  const observed_at=iso(observation.observed_at);
  const metrics=safeMetrics(observation.metrics);
  const outcome_code=safeCode(observation.outcome_code,'outcome_code');
  const reason_code=safeCode(observation.reason_code,'reason_code','REAL_CONVERSATION_OBSERVATION');
  const explicit_correction=bool(observation.explicit_correction);
  const correction_code=explicit_correction?safeCode(observation.correction_code,'correction_code','EXPLICIT_HUMAN_CORRECTION'):null;
  const identity={channel_id,observation_id,observed_at,outcome_code,reason_code,explicit_correction,correction_code,metrics};
  const sha=digest(identity);
  const common={company_id:'fenix',engine_id:engineFor(channel_id),source_environment,version:'1.0.0',observed_at,severity:'INFO',confidence:explicit_correction?0.95:0.85,risk_class:explicit_correction?'MEDIUM':'LOW',evidence_refs:[`channel:${channel_id}`,`observation:${observation_id}`,`sha256:${sha}`],...baseSafety()};
  const signals=[Object.freeze({
    signal_id:`conversation-observation:${sha.slice(0,40)}`,
    signal_type:'METRIC_OBSERVATION',
    ...common,
    reason:reason_code,
    hypothesis:'Derived conversation observations should be evaluated for measurable quality improvement without copying raw conversation content or changing canonical knowledge directly.',
    metric:{name:'conversation_outcome_quality',direction:'HIGHER',measurement:'FUTURE_EQUIVALENT_CASES_OLD_VS_NEW'},
    payload:{channel_id,outcome_code,reason_code,metrics,explicit_correction,raw_content_persisted:false,canonical_rule_auto_promote:false}
  })];
  if(explicit_correction){
    signals.push(Object.freeze({
      signal_id:`conversation-correction:${sha.slice(0,40)}`,
      signal_type:'HUMAN_CORRECTION',
      ...common,
      reason:correction_code,
      hypothesis:'An explicit human correction should reduce repeat correction rate only after controlled validation against future equivalent cases.',
      metric:{name:'repeat_human_correction_rate',direction:'LOWER',measurement:'FUTURE_EQUIVALENT_CASES'},
      payload:{channel_id,correction_code,outcome_code,metrics,raw_content_persisted:false,canonical_rule_auto_promote:false}
    }));
  }
  return Object.freeze(signals);
}

export function buildSyntheticConversationLearningSignals(observation={}){
  rejectRaw(observation);
  const source_environment=assertEnv(observation.source_environment??'LAB');
  if(!['LAB','PREPROD','SHADOW'].includes(source_environment))throw new Error('synthetic_source_environment_must_be_nonprod');
  const scenario_id=reqString(observation.scenario_id,'scenario_id',{max:120,token:true});
  const episode_id=reqString(observation.episode_id,'episode_id',{max:120,token:true});
  const variant=safeCode(observation.variant,'variant');
  const observed_at=iso(observation.observed_at);
  const verdict=safeCode(observation.verdict,'verdict','NO_VERDICT');
  const hard_gates_green=bool(observation.hard_gates_green);
  const old_score=finite(observation.old_score,'old_score');
  const new_score=finite(observation.new_score,'new_score');
  const identity={scenario_id,episode_id,variant,observed_at,verdict,hard_gates_green,old_score,new_score};
  const sha=digest(identity);
  const common={company_id:'fenix',engine_id:'SIM-001',source_environment,version:'1.0.0',observed_at,severity:'LOW',confidence:0.95,risk_class:'LOW',evidence_refs:[`scenario:${scenario_id}`,`episode:${episode_id}`,`sha256:${sha}`],...baseSafety()};
  const signals=[Object.freeze({
    signal_id:`synthetic-conversation:${sha.slice(0,40)}`,
    signal_type:'METRIC_OBSERVATION',
    ...common,
    reason:'SYNTHETIC_CONVERSATION_EVALUATION',
    hypothesis:'Synthetic conversation evidence should improve candidate selection only through controlled OLD-vs-NEW evaluation and must never become production truth by itself.',
    metric:{name:'synthetic_conversation_quality_delta',direction:'HIGHER',measurement:'PAIRED_OLD_VS_NEW'},
    payload:{scenario_id,episode_id,variant,old_score,new_score,score_delta:new_score-old_score,verdict,hard_gates_green,synthetic:true,canonical_rule_auto_promote:false}
  })];
  if(hard_gates_green&&verdict==='NEW_BETTER'){
    signals.push(Object.freeze({
      signal_id:`synthetic-tribunal:${sha.slice(0,40)}`,
      signal_type:'TRIBUNAL_DECISION',
      ...common,
      confidence:0.99,
      reason:'SYNTHETIC_NEW_BETTER_HARD_GATES_GREEN',
      hypothesis:'The synthetic candidate may proceed as a PREPROD learning candidate, subject to regression, provenance, rollback and real-world monitoring.',
      metric:{name:'candidate_decision_quality',direction:'HIGHER',measurement:'PREPROD_AND_FUTURE_REAL_EVIDENCE'},
      payload:{scenario_id,episode_id,variant,verdict,hard_gates_green,synthetic:true,direct_prod_truth_write:false,canonical_rule_auto_promote:false}
    }));
  }
  return Object.freeze(signals);
}

export function buildConversationLearningConvergenceReport({real_observations=[],synthetic_observations=[]}={}){
  if(!Array.isArray(real_observations)||!Array.isArray(synthetic_observations))throw new Error('observation_arrays_required');
  if(real_observations.length+synthetic_observations.length===0)throw new Error('at_least_one_observation_required');
  const signals=[];
  for(const observation of real_observations)signals.push(...buildRealConversationLearningSignals(observation));
  for(const observation of synthetic_observations)signals.push(...buildSyntheticConversationLearningSignals(observation));
  return buildUniversalLearningEventReport({signals});
}

export const CONVERSATION_LEARNING_CONVERGENCE_V1=Object.freeze({
  version:'1.0.0',
  real_channels:[...CHANNELS],
  real_signal_types:['METRIC_OBSERVATION','HUMAN_CORRECTION'],
  synthetic_signal_types:['METRIC_OBSERVATION','TRIBUNAL_DECISION'],
  raw_conversation_content_to_lrn:false,
  direct_canonical_knowledge_write:false,
  single_conversation_auto_promote:false,
  old_vs_new_required:true,
  tribunal_required:true,
  preprod_required:true,
  rollback_required:true,
  prod_authority_changed:false,
  trading_access:false,
  additional_cost_eur:0
});
