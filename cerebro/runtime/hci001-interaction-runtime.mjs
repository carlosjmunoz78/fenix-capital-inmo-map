import crypto from 'node:crypto';

const ENGINE_ID='HCI-001';
const ENVIRONMENT='PREPROD';
const HUMAN_REQUIRED=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const EVENT_TYPES=new Set(['TURN_COMPLETED','CLARIFICATION','CORRECTION','REPETITION','INTERRUPTION','MODALITY_SWITCH','EXPLICIT_FEEDBACK','TASK_COMPLETED','ABANDONED']);
const MODALITIES=new Set(['TEXT','VOICE','MIXED']);
const CHANNELS=new Set(['CONSOLE','TELEGRAM','EMAIL','APP','WEB','OTHER']);

function text(v,label){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);return v.trim()}
function finite(v,label,{min=-Infinity,max=Infinity}={}){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw new Error(`${label} invalid`);return n}
function bool(v){return v===true}
function hash(v){return crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex')}
function ratio(a,b){return b>0?a/b:0}
function round(v,d=4){const p=10**d;return Math.round((v+Number.EPSILON)*p)/p}
function avg(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function safeEnum(v,set,label){const x=text(v,label).toUpperCase();if(!set.has(x))throw new Error(`${label} unsupported`);return x}

export function normalizeInteractionEvent(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('interaction event object required');
  const event_type=safeEnum(raw.event_type,EVENT_TYPES,'event_type');
  const occurred_at=text(raw.occurred_at,'occurred_at');
  if(Number.isNaN(Date.parse(occurred_at)))throw new Error('occurred_at invalid');
  const event={
    schema_version:'1.0.0',engine_id:ENGINE_ID,environment:ENVIRONMENT,
    company_id:text(raw.company_id,'company_id'),session_id:text(raw.session_id,'session_id'),
    event_id:text(raw.event_id??`hci:${hash(`${raw.company_id}|${raw.session_id}|${event_type}|${occurred_at}`).slice(0,24)}`,'event_id'),
    occurred_at:new Date(occurred_at).toISOString(),event_type,
    channel:safeEnum(raw.channel??'OTHER',CHANNELS,'channel'),modality:safeEnum(raw.modality??'TEXT',MODALITIES,'modality'),
    turn_id:raw.turn_id==null?null:text(raw.turn_id,'turn_id'),
    latency_ms:raw.latency_ms==null?null:finite(raw.latency_ms,'latency_ms',{min:0,max:300000}),
    assistant_chars:raw.assistant_chars==null?null:finite(raw.assistant_chars,'assistant_chars',{min:0,max:100000}),
    user_chars:raw.user_chars==null?null:finite(raw.user_chars,'user_chars',{min:0,max:100000}),
    interruption_success:raw.interruption_success==null?null:bool(raw.interruption_success),
    task_completed:raw.task_completed==null?null:bool(raw.task_completed),
    preference_score:raw.preference_score==null?null:finite(raw.preference_score,'preference_score',{min:-2,max:2}),
    reason_code:raw.reason_code==null?null:text(raw.reason_code,'reason_code'),
    contains_raw_content:false,sensitive_trait_inference:false,
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  };
  if(event.reason_code?.startsWith('HUMAN_REQUIRED:')){
    const reason=event.reason_code.slice('HUMAN_REQUIRED:'.length);if(!HUMAN_REQUIRED.has(reason))throw new Error('noncanonical HUMAN_REQUIRED reason');
  }
  return Object.freeze(event);
}

export function analyzeInteractionSession(rawEvents,{variant='CURRENT'}={}){
  if(!Array.isArray(rawEvents)||rawEvents.length===0)throw new Error('events required');
  const events=rawEvents.map(normalizeInteractionEvent).sort((a,b)=>a.occurred_at.localeCompare(b.occurred_at)||a.event_id.localeCompare(b.event_id));
  const session_id=events[0].session_id,company_id=events[0].company_id;
  if(events.some(e=>e.session_id!==session_id||e.company_id!==company_id))throw new Error('mixed session/company events rejected');
  const count=t=>events.filter(e=>e.event_type===t).length;
  const turns=count('TURN_COMPLETED');
  const interruptions=events.filter(e=>e.event_type==='INTERRUPTION');
  const latencies=events.map(e=>e.latency_ms).filter(Number.isFinite);
  const aChars=events.filter(e=>e.event_type==='TURN_COMPLETED').map(e=>e.assistant_chars).filter(Number.isFinite);
  const uChars=events.filter(e=>e.event_type==='TURN_COMPLETED').map(e=>e.user_chars).filter(Number.isFinite);
  const prefs=events.map(e=>e.preference_score).filter(Number.isFinite);
  const completed=count('TASK_COMPLETED')>0||events.some(e=>e.task_completed===true);
  const abandoned=count('ABANDONED')>0;
  const clarification_rate=ratio(count('CLARIFICATION'),Math.max(turns,1));
  const correction_rate=ratio(count('CORRECTION'),Math.max(turns,1));
  const repetition_rate=ratio(count('REPETITION'),Math.max(turns,1));
  const modality_switch_rate=ratio(count('MODALITY_SWITCH'),Math.max(turns,1));
  const interruption_success_rate=interruptions.length?ratio(interruptions.filter(e=>e.interruption_success===true).length,interruptions.length):1;
  const explicit_preference_score=prefs.length?avg(prefs):0;
  const user_effort_proxy=clamp(0.30*clarification_rate+0.28*correction_rate+0.20*repetition_rate+0.10*modality_switch_rate+0.12*(abandoned?1:0),0,1);
  const task_completion_understanding_rate=completed&&!abandoned?1:0;
  const report={
    schema_version:'1.0.0',state_type:'CEREBRO_HCI_SESSION_ANALYSIS',engine_id:ENGINE_ID,environment:ENVIRONMENT,
    company_id,session_id,variant:text(variant,'variant'),sample:{events:events.length,turns},
    metrics:{
      time_to_understanding_ms:round(avg(latencies),1),clarification_rate:round(clarification_rate),correction_rate:round(correction_rate),
      repetition_rate:round(repetition_rate),interruption_success_rate:round(interruption_success_rate),
      response_length_fit:{assistant_chars_avg:round(avg(aChars),1),user_chars_avg:round(avg(uChars),1)},
      modality_switch_rate:round(modality_switch_rate),user_effort_proxy:round(user_effort_proxy),
      explicit_preference_score:round(explicit_preference_score),task_completion_understanding_rate
    },
    candidates:[],raw_content_persisted:false,sensitive_trait_inference:false,
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  };
  report.candidates=buildImprovementCandidates(report);
  report.analysis_sha256=hash(report);
  return Object.freeze(report);
}

export function buildImprovementCandidates(report){
  const m=report.metrics??{};const out=[];
  const push=(code,priority,hypothesis,metric,target)=>out.push(Object.freeze({candidate_id:`hci-candidate:${hash(`${report.session_id}|${code}`).slice(0,20)}`,code,priority,hypothesis,metric,target,environment:'PREPROD_CANDIDATE',old_vs_new_required:true,independent_evaluation_required:true,tribunal_required:true,auto_promote:false,prod_authorized:false}));
  if(m.clarification_rate>=0.25)push('REDUCE_AMBIGUITY','HIGH','Use a shorter first answer with one explicit next action before optional detail.','clarification_rate','<0.20');
  if(m.correction_rate>=0.15)push('IMPROVE_CONFIRMATION','HIGH','Restate uncertain entities/intent briefly before committing to an interpretation.','correction_rate','<0.10');
  if(m.repetition_rate>=0.20)push('IMPROVE_CONTEXT_REUSE','MEDIUM','Carry forward recent resolved context and avoid asking for information already supplied.','repetition_rate','<0.15');
  if(m.interruption_success_rate<0.90)push('IMPROVE_BARGE_IN','HIGH','Stop output immediately on interruption and preserve the interrupted turn context.','interruption_success_rate','>=0.95');
  if(m.user_effort_proxy>=0.30)push('REDUCE_USER_EFFORT','HIGH','Prefer direct answer/action summary and hide implementation detail unless requested.','user_effort_proxy','<0.25');
  if((m.response_length_fit?.assistant_chars_avg??0)>1800)push('SHORTEN_DEFAULT_OUTPUT','MEDIUM','Reduce default spoken/text response length while preserving critical facts and actions.','assistant_chars_avg','<=1200');
  if(m.explicit_preference_score<=-0.75)push('REJECT_CURRENT_EXPERIENCE','HIGH','Do not promote this interaction variant; generate an alternative experience candidate.','explicit_preference_score','>0');
  return Object.freeze(out.sort((a,b)=>a.code.localeCompare(b.code)));
}

function score(metrics){
  const latencyPenalty=clamp((metrics.time_to_understanding_ms??0)/12000,0,1);
  const pref=clamp(((metrics.explicit_preference_score??0)+2)/4,0,1);
  return round(100*(0.18*(1-(metrics.clarification_rate??0))+0.17*(1-(metrics.correction_rate??0))+0.12*(1-(metrics.repetition_rate??0))+0.12*(metrics.interruption_success_rate??1)+0.15*(1-(metrics.user_effort_proxy??0))+0.12*(metrics.task_completion_understanding_rate??0)+0.08*pref+0.06*(1-latencyPenalty)),2);
}

export function compareInteractionVariants(oldReport,newReport,{minimum_turns=3,minimum_gain=2}={}){
  for(const [label,r] of [['old',oldReport],['new',newReport]])if(!r||r.engine_id!==ENGINE_ID||r.environment!==ENVIRONMENT)throw new Error(`${label} report invalid`);
  if(oldReport.company_id!==newReport.company_id)throw new Error('company mismatch');
  const oldScore=score(oldReport.metrics),newScore=score(newReport.metrics);const sufficient=(oldReport.sample?.turns??0)>=minimum_turns&&(newReport.sample?.turns??0)>=minimum_turns;
  const gain=round(newScore-oldScore,2);let decision='HOLD';if(sufficient&&gain>=minimum_gain)decision='NEW_WINS';else if(sufficient&&gain<=-minimum_gain)decision='OLD_WINS';
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_HCI_OLD_VS_NEW',engine_id:ENGINE_ID,environment:ENVIRONMENT,old_score:oldScore,new_score:newScore,gain,sufficient_sample:sufficient,decision,promotion_authorized:false,requires_eva_001:true,requires_jdg_001:true,prod_authorized:false,additional_cost_eur:0});
}

export function buildHciLearningEvents(report){
  if(!report||report.engine_id!==ENGINE_ID)throw new Error('HCI report required');
  const base={company_id:report.company_id,engine_id:ENGINE_ID,environment:'PREPROD',version:'0.1.0',prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  const metric={...base,event_id:`evt:hci:${hash(`${report.analysis_sha256}|metrics`).slice(0,24)}`,signal_family:'METRIC_OBSERVATION',event_type:'HCI_SESSION_METRICS',payload:{session_id_hash:hash(report.session_id),metrics:report.metrics,raw_content_persisted:false}};
  const candidates=report.candidates.map(c=>({...base,event_id:`evt:hci:${hash(`${report.analysis_sha256}|${c.code}`).slice(0,24)}`,signal_family:'ENGINE_EVENT',event_type:'HCI_IMPROVEMENT_CANDIDATE',payload:{candidate:c,session_id_hash:hash(report.session_id)}}));
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_HCI_LEARNING_EVENT_REPORT',events:Object.freeze([metric,...candidates]),prod_authorized:false,trading_access:false,additional_cost_eur:0});
}
