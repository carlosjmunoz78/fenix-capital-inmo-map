import crypto from 'node:crypto';

const ENGINE_ID='MOTION-001';
const ENVIRONMENT='PREPROD';
export const MOTION_STATES=Object.freeze(['IDLE','LISTENING','PROCESSING','SPEAKING','HUMAN_REQUIRED','DEGRADED','ERROR']);
const STATES=new Set(MOTION_STATES);
const TRANSITIONS=Object.freeze({
  IDLE:new Set(['LISTENING','PROCESSING','HUMAN_REQUIRED','DEGRADED','ERROR']),
  LISTENING:new Set(['IDLE','PROCESSING','HUMAN_REQUIRED','DEGRADED','ERROR']),
  PROCESSING:new Set(['IDLE','SPEAKING','HUMAN_REQUIRED','DEGRADED','ERROR']),
  SPEAKING:new Set(['IDLE','LISTENING','PROCESSING','HUMAN_REQUIRED','DEGRADED','ERROR']),
  HUMAN_REQUIRED:new Set(['IDLE','LISTENING','PROCESSING','DEGRADED','ERROR']),
  DEGRADED:new Set(['IDLE','LISTENING','PROCESSING','HUMAN_REQUIRED','ERROR']),
  ERROR:new Set(['IDLE','DEGRADED'])
});
const CANONICAL_HUMAN=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
function text(v,label){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);return v.trim()}
function num(v,label,{min=-Infinity,max=Infinity}={}){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw new Error(`${label} invalid`);return n}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function round(v,d=4){const p=10**d;return Math.round((v+Number.EPSILON)*p)/p}
function avg(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0}
function hash(v){return crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex')}
function state(v){const s=text(v,'state').toUpperCase();if(!STATES.has(s))throw new Error('unsupported motion state');return s}

export function transitionPresence(current,next,{human_required_reason=null,reduced_motion=false,performance_mode='AUTO'}={}){
  const from=state(current),to=state(next);
  if(from!==to&&!TRANSITIONS[from].has(to))throw new Error(`invalid transition ${from}->${to}`);
  if(to==='HUMAN_REQUIRED'){
    const reason=text(human_required_reason,'human_required_reason');if(!CANONICAL_HUMAN.has(reason))throw new Error('noncanonical HUMAN_REQUIRED reason');
  }
  const profile=presenceProfile(to,{reduced_motion,performance_mode,human_required_reason});
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_MOTION_TRANSITION',engine_id:ENGINE_ID,environment:ENVIRONMENT,from,to,human_required_reason:to==='HUMAN_REQUIRED'?human_required_reason:null,profile,content_payload:null,secret_payload:null,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
}

export function presenceProfile(rawState,{reduced_motion=false,performance_mode='AUTO',human_required_reason=null,audio_level=0}={}){
  const s=state(rawState);const mode=text(performance_mode,'performance_mode').toUpperCase();if(!['AUTO','FULL','CONSERVE'].includes(mode))throw new Error('performance_mode unsupported');
  const a=clamp(num(audio_level,'audio_level',{min:0,max:1}),0,1);
  const reduced=Boolean(reduced_motion);
  const base={scale:1,glow:0.45,pulse_hz:0,orbit_hz:0,spectrum:0,particle_density:0.35,blur_px:18,brightness:1,attention:'NORMAL'};
  const byState={
    IDLE:{glow:0.34,pulse_hz:0.08,orbit_hz:0.04,particle_density:0.18},
    LISTENING:{scale:1.025,glow:0.72,pulse_hz:0.55,orbit_hz:0.10,spectrum:0.36,particle_density:0.44,attention:'ACTIVE'},
    PROCESSING:{scale:1.015,glow:0.88,pulse_hz:0.32,orbit_hz:0.42,spectrum:0.18,particle_density:0.62,attention:'FOCUSED'},
    SPEAKING:{scale:1.03+0.025*a,glow:0.78+0.18*a,pulse_hz:0.45+1.2*a,orbit_hz:0.12,spectrum:0.28+0.72*a,particle_density:0.48+0.30*a,attention:'ACTIVE'},
    HUMAN_REQUIRED:{scale:1.01,glow:0.76,pulse_hz:0.24,orbit_hz:0.06,spectrum:0,particle_density:0.28,brightness:1.04,attention:'REQUIRED'},
    DEGRADED:{scale:1,glow:0.28,pulse_hz:0.12,orbit_hz:0.02,spectrum:0,particle_density:0.08,brightness:0.82,attention:'DEGRADED'},
    ERROR:{scale:1,glow:0.22,pulse_hz:0,orbit_hz:0,spectrum:0,particle_density:0,brightness:0.72,attention:'ERROR'}
  };
  let p={...base,...byState[s]};
  if(reduced){p={...p,scale:1,pulse_hz:0,orbit_hz:0,spectrum:0,particle_density:0,blur_px:Math.min(p.blur_px,12)};}
  if(mode==='CONSERVE'){p={...p,orbit_hz:Math.min(p.orbit_hz,0.08),particle_density:Math.min(p.particle_density,0.12),blur_px:Math.min(p.blur_px,12)};}
  if(s==='HUMAN_REQUIRED'&&!CANONICAL_HUMAN.has(human_required_reason??''))throw new Error('HUMAN_REQUIRED requires canonical reason');
  return Object.freeze({state:s,reduced_motion:reduced,performance_mode:mode,audio_level:round(a),css:{scale:round(p.scale),glow:round(p.glow),pulse_hz:round(p.pulse_hz),orbit_hz:round(p.orbit_hz),spectrum:round(p.spectrum),particle_density:round(p.particle_density),blur_px:round(p.blur_px),brightness:round(p.brightness)},attention:p.attention,rapid_flashing:false,functionality_dependency:false});
}

export function normalizeMotionSample(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('motion sample object required');
  const sample={
    schema_version:'1.0.0',engine_id:ENGINE_ID,environment:ENVIRONMENT,
    company_id:text(raw.company_id,'company_id'),session_id:text(raw.session_id,'session_id'),variant:text(raw.variant??'CURRENT','variant'),
    occurred_at:new Date(text(raw.occurred_at,'occurred_at')).toISOString(),state:state(raw.state),
    input_to_visual_latency_ms:num(raw.input_to_visual_latency_ms??0,'input_to_visual_latency_ms',{min:0,max:10000}),
    speech_visual_sync_error_ms:num(raw.speech_visual_sync_error_ms??0,'speech_visual_sync_error_ms',{min:0,max:10000}),
    dropped_frames:num(raw.dropped_frames??0,'dropped_frames',{min:0,max:100000}),
    total_frames:num(raw.total_frames??1,'total_frames',{min:1,max:1000000}),
    frame_time_p95_ms:num(raw.frame_time_p95_ms??16.7,'frame_time_p95_ms',{min:0,max:1000}),
    cpu_budget_proxy:num(raw.cpu_budget_proxy??0,'cpu_budget_proxy',{min:0,max:1}),
    battery_impact_proxy:num(raw.battery_impact_proxy??0,'battery_impact_proxy',{min:0,max:1}),
    reduced_motion_requested:Boolean(raw.reduced_motion_requested),reduced_motion_complied:Boolean(raw.reduced_motion_complied),
    visual_state_recognized:raw.visual_state_recognized==null?null:Boolean(raw.visual_state_recognized),
    preference_score:raw.preference_score==null?null:num(raw.preference_score,'preference_score',{min:-2,max:2}),
    raw_content_persisted:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  };
  if(Number.isNaN(Date.parse(sample.occurred_at)))throw new Error('occurred_at invalid');
  return Object.freeze(sample);
}

export function analyzeMotionSession(rawSamples,{variant='CURRENT'}={}){
  if(!Array.isArray(rawSamples)||rawSamples.length===0)throw new Error('motion samples required');
  const samples=rawSamples.map(normalizeMotionSample).filter(s=>s.variant===variant||variant==='CURRENT');
  if(samples.length===0)throw new Error('no samples for variant');const company_id=samples[0].company_id,session_id=samples[0].session_id;
  if(samples.some(s=>s.company_id!==company_id||s.session_id!==session_id))throw new Error('mixed session/company samples rejected');
  const dropped=samples.reduce((n,s)=>n+s.dropped_frames,0),frames=samples.reduce((n,s)=>n+s.total_frames,0);
  const rm=samples.filter(s=>s.reduced_motion_requested),recognized=samples.filter(s=>s.visual_state_recognized!=null),prefs=samples.map(s=>s.preference_score).filter(Number.isFinite);
  const metrics={
    input_to_visual_latency_ms:round(avg(samples.map(s=>s.input_to_visual_latency_ms)),1),
    speech_visual_sync_error_ms:round(avg(samples.map(s=>s.speech_visual_sync_error_ms)),1),
    dropped_frame_rate:round(dropped/Math.max(frames,1)),frame_time_p95_ms:round(Math.max(...samples.map(s=>s.frame_time_p95_ms)),1),
    cpu_budget_proxy:round(avg(samples.map(s=>s.cpu_budget_proxy))),battery_impact_proxy:round(avg(samples.map(s=>s.battery_impact_proxy))),
    reduced_motion_compliance:rm.length?round(rm.filter(s=>s.reduced_motion_complied).length/rm.length):1,
    visual_state_recognition_rate:recognized.length?round(recognized.filter(s=>s.visual_state_recognized).length/recognized.length):1,
    explicit_preference_score:prefs.length?round(avg(prefs)):0
  };
  const report={schema_version:'1.0.0',state_type:'CEREBRO_MOTION_SESSION_ANALYSIS',engine_id:ENGINE_ID,environment:ENVIRONMENT,company_id,session_id,variant,sample_count:samples.length,metrics,candidates:[],raw_content_persisted:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  report.candidates=buildMotionCandidates(report);report.analysis_sha256=hash(report);return Object.freeze(report);
}

export function buildMotionCandidates(report){
  const m=report.metrics??{},out=[];const push=(code,priority,hypothesis,metric,target)=>out.push(Object.freeze({candidate_id:`motion-candidate:${hash(`${report.session_id}|${code}`).slice(0,20)}`,code,priority,hypothesis,metric,target,environment:'PREPROD_CANDIDATE',old_vs_new_required:true,independent_evaluation_required:true,tribunal_required:true,auto_promote:false,prod_authorized:false}));
  if(m.input_to_visual_latency_ms>100)push('REDUCE_VISUAL_LATENCY','HIGH','Move visual state transition onto the immediate UI event path and defer noncritical effects.','input_to_visual_latency_ms','<=100');
  if(m.speech_visual_sync_error_ms>120)push('IMPROVE_AUDIO_SYNC','HIGH','Drive speaking motion from Web Audio amplitude rather than timer-only animation.','speech_visual_sync_error_ms','<=120');
  if(m.dropped_frame_rate>0.03)push('REDUCE_FRAME_DROPS','HIGH','Lower particles/blur and prefer transform/opacity-only animation under load.','dropped_frame_rate','<=0.02');
  if(m.frame_time_p95_ms>24)push('LOWER_FRAME_COST','HIGH','Enter adaptive conserve mode when p95 frame time exceeds the motion budget.','frame_time_p95_ms','<=24');
  if(m.cpu_budget_proxy>0.65||m.battery_impact_proxy>0.55)push('ADAPT_RESOURCE_BUDGET','MEDIUM','Reduce nonessential effects on constrained mobile devices.','resource_budget_proxy','within_budget');
  if(m.reduced_motion_compliance<1)push('FIX_ACCESSIBILITY','CRITICAL','Disable continuous motion when prefers-reduced-motion is requested.','reduced_motion_compliance','=1');
  if(m.visual_state_recognition_rate<0.85)push('CLARIFY_VISUAL_STATES','MEDIUM','Increase state distinction using motion intensity and labels without relying on color alone.','visual_state_recognition_rate','>=0.90');
  if(m.explicit_preference_score<=-0.75)push('REJECT_CURRENT_MOTION','HIGH','Do not promote this visual variant; generate a calmer alternative.','explicit_preference_score','>0');
  return Object.freeze(out.sort((a,b)=>a.code.localeCompare(b.code)));
}
function score(m){const lat=1-clamp((m.input_to_visual_latency_ms??0)/250,0,1),sync=1-clamp((m.speech_visual_sync_error_ms??0)/300,0,1),frames=1-clamp((m.dropped_frame_rate??0)/0.12,0,1),ft=1-clamp(((m.frame_time_p95_ms??16.7)-16.7)/35,0,1),resource=1-clamp(((m.cpu_budget_proxy??0)+(m.battery_impact_proxy??0))/2,0,1),pref=clamp(((m.explicit_preference_score??0)+2)/4,0,1);return round(100*(0.16*lat+0.16*sync+0.16*frames+0.12*ft+0.10*resource+0.14*(m.reduced_motion_compliance??1)+0.10*(m.visual_state_recognition_rate??1)+0.06*pref),2)}
export function compareMotionVariants(oldReport,newReport,{minimum_samples=5,minimum_gain=2}={}){
  for(const [label,r] of [['old',oldReport],['new',newReport]])if(!r||r.engine_id!==ENGINE_ID||r.environment!==ENVIRONMENT)throw new Error(`${label} motion report invalid`);if(oldReport.company_id!==newReport.company_id)throw new Error('company mismatch');const oldScore=score(oldReport.metrics),newScore=score(newReport.metrics),gain=round(newScore-oldScore,2),sufficient=(oldReport.sample_count??0)>=minimum_samples&&(newReport.sample_count??0)>=minimum_samples;let decision='HOLD';if(sufficient&&gain>=minimum_gain)decision='NEW_WINS';else if(sufficient&&gain<=-minimum_gain)decision='OLD_WINS';return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_MOTION_OLD_VS_NEW',engine_id:ENGINE_ID,environment:ENVIRONMENT,old_score:oldScore,new_score:newScore,gain,sufficient_sample:sufficient,decision,promotion_authorized:false,requires_eva_001:true,requires_jdg_001:true,prod_authorized:false,additional_cost_eur:0});
}
export function buildMotionLearningEvents(report){
  if(!report||report.engine_id!==ENGINE_ID)throw new Error('MOTION report required');const base={company_id:report.company_id,engine_id:ENGINE_ID,environment:'PREPROD',version:'0.1.0',prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};const metric={...base,event_id:`evt:motion:${hash(`${report.analysis_sha256}|metrics`).slice(0,24)}`,signal_family:'METRIC_OBSERVATION',event_type:'MOTION_SESSION_METRICS',payload:{session_id_hash:hash(report.session_id),metrics:report.metrics,raw_content_persisted:false}};const candidates=report.candidates.map(c=>({...base,event_id:`evt:motion:${hash(`${report.analysis_sha256}|${c.code}`).slice(0,24)}`,signal_family:'ENGINE_EVENT',event_type:'MOTION_IMPROVEMENT_CANDIDATE',payload:{candidate:c,session_id_hash:hash(report.session_id)}}));return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_MOTION_LEARNING_EVENT_REPORT',events:Object.freeze([metric,...candidates]),prod_authorized:false,trading_access:false,additional_cost_eur:0});
}
