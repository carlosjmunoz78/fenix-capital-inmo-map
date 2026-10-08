import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stableIdempotencyKey,RISK_CLASSES} from './continuous-improvement-contract.mjs';

export const UNIVERSAL_SIGNAL_TYPES=Object.freeze([
  'ENGINE_RESULT',
  'ENGINE_ERROR',
  'ENGINE_EVENT',
  'METRIC_OBSERVATION',
  'COST_OBSERVATION',
  'HUMAN_CORRECTION',
  'TRIBUNAL_DECISION',
  'OBSERVABILITY_ALERT'
]);

const SIGNAL_TYPE_SET=new Set(UNIVERSAL_SIGNAL_TYPES);
const SOURCE_ENVIRONMENTS=new Set(['LAB','PREPROD','SHADOW','CANARY','PROD']);
const DIRECTIONS=new Set(['HIGHER','LOWER','TARGET','STABLE']);
const FORBIDDEN_KEY=/(?:^|_)(?:password|passwd|pwd|secret|token|access_token|refresh_token|api_key|apikey|authorization|cookie|private_key|client_secret|iban|account_number|card_number)(?:$|_)/i;

function reqString(value,label,{max=500}={}){
  if(typeof value!=='string'||!value.trim()) throw new Error(`${label} required`);
  const out=value.trim();
  if(out.length>max) throw new Error(`${label} too long`);
  return out;
}
function optionalString(value,label,{max=2000}={}){
  if(value==null) return null;
  if(typeof value!=='string') throw new Error(`${label} must be string`);
  const out=value.trim();
  if(!out) return null;
  if(out.length>max) throw new Error(`${label} too long`);
  return out;
}
function finiteNumber(value,label){
  const out=Number(value);
  if(!Number.isFinite(out)) throw new Error(`${label} must be finite`);
  return out;
}
function canonicalObservedAt(value){
  const raw=reqString(value,'observed_at',{max:80});
  if(Number.isNaN(Date.parse(raw))) throw new Error('observed_at must be ISO-compatible');
  return new Date(raw).toISOString();
}
function assertAuthorityDenied(signal){
  if(signal.prod_authorized!==false||signal.prod_write_authorized!==false||signal.trading_access!==false) throw new Error('UNIVERSAL_INGRESS_AUTHORITY_EXPANSION');
  if(signal.contains_customer_data!==false) throw new Error('UNIVERSAL_INGRESS_CUSTOMER_DATA_FORBIDDEN');
  if(signal.contains_secrets!==false) throw new Error('UNIVERSAL_INGRESS_SECRETS_FORBIDDEN');
  const cost=finiteNumber(signal.additional_cost_eur??0,'additional_cost_eur');
  if(cost!==0) throw new Error('UNIVERSAL_INGRESS_NONZERO_INCREMENTAL_COST');
}
function assertSafeJson(value,{depth=0}={}){
  if(depth>8) throw new Error('UNIVERSAL_INGRESS_PAYLOAD_TOO_DEEP');
  if(value===null||typeof value==='boolean') return;
  if(typeof value==='string'){
    if(value.length>4000) throw new Error('UNIVERSAL_INGRESS_STRING_TOO_LONG');
    return;
  }
  if(typeof value==='number'){
    if(!Number.isFinite(value)) throw new Error('UNIVERSAL_INGRESS_NONFINITE_NUMBER');
    return;
  }
  if(Array.isArray(value)){
    if(value.length>100) throw new Error('UNIVERSAL_INGRESS_ARRAY_TOO_LARGE');
    for(const item of value) assertSafeJson(item,{depth:depth+1});
    return;
  }
  if(typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype) throw new Error('UNIVERSAL_INGRESS_JSON_OBJECT_REQUIRED');
  const keys=Object.keys(value);
  if(keys.length>100) throw new Error('UNIVERSAL_INGRESS_OBJECT_TOO_LARGE');
  for(const key of keys){
    if(FORBIDDEN_KEY.test(key)) throw new Error(`UNIVERSAL_INGRESS_FORBIDDEN_KEY:${key}`);
    assertSafeJson(value[key],{depth:depth+1});
  }
}
function normalizeEvidenceRefs(value,signalId){
  const refs=Array.isArray(value)?value:[];
  const out=[...new Set(refs.map((item)=>reqString(item,'evidence_ref',{max:1000})))]
    .sort((a,b)=>a.localeCompare(b));
  return out.length?out:[`signal:${signalId}`];
}
function defaultRisk(type,severity){
  if(type==='ENGINE_ERROR') return severity==='CRITICAL'||severity==='HIGH'?'HIGH':'MEDIUM';
  if(type==='OBSERVABILITY_ALERT') return severity==='CRITICAL'||severity==='HIGH'?'HIGH':'MEDIUM';
  if(type==='HUMAN_CORRECTION') return 'MEDIUM';
  if(type==='COST_OBSERVATION') return 'MEDIUM';
  return 'LOW';
}
function defaultConfidence(type){
  if(type==='HUMAN_CORRECTION') return 0.9;
  if(type==='TRIBUNAL_DECISION') return 0.95;
  if(type==='ENGINE_RESULT') return 0.85;
  if(type==='ENGINE_ERROR') return 0.85;
  if(type==='METRIC_OBSERVATION'||type==='COST_OBSERVATION') return 0.8;
  return 0.75;
}
function defaultHypothesis(type,engineId,reason){
  const tail=reason?` Evidence reason: ${reason}`:'';
  switch(type){
    case 'ENGINE_RESULT': return `Observed result from ${engineId} should be compared with prior outcomes to reinforce or revise its current strategy.${tail}`;
    case 'ENGINE_ERROR': return `Observed error from ${engineId} may reveal a repeatable failure pattern that should be corrected without weakening existing contracts.${tail}`;
    case 'ENGINE_EVENT': return `Operational event from ${engineId} may contain evidence useful for improving its strategy, contracts, or orchestration.${tail}`;
    case 'METRIC_OBSERVATION': return `Metric evidence from ${engineId} should be evaluated for a measurable OLD-vs-NEW improvement opportunity.${tail}`;
    case 'COST_OBSERVATION': return `Cost evidence from ${engineId} should be evaluated for a lower-cost equivalent path without reducing quality or authority controls.${tail}`;
    case 'HUMAN_CORRECTION': return `A human correction affecting ${engineId} should be learned as evidence so the same correction is less likely to be required again.${tail}`;
    case 'TRIBUNAL_DECISION': return `Tribunal evidence affecting ${engineId} should update future candidate selection and evaluation behavior.${tail}`;
    case 'OBSERVABILITY_ALERT': return `Observability evidence from ${engineId} may indicate a reliability or performance pattern requiring controlled improvement.${tail}`;
    default: return `Operational evidence from ${engineId} should be evaluated as a controlled improvement candidate.${tail}`;
  }
}
function defaultMetric(type,metric){
  if(metric!=null){
    if(typeof metric!=='object'||Array.isArray(metric)) throw new Error('metric must be object');
    const name=reqString(metric.name,'metric.name',{max:160});
    const direction=reqString(metric.direction??'TARGET','metric.direction',{max:20}).toUpperCase();
    if(!DIRECTIONS.has(direction)) throw new Error('metric.direction invalid');
    return Object.freeze({name,direction,measurement:reqString(metric.measurement??'SOURCE_EVIDENCE_AND_OLD_VS_NEW','metric.measurement',{max:500})});
  }
  if(type==='ENGINE_ERROR'||type==='OBSERVABILITY_ALERT') return Object.freeze({name:'failure_rate',direction:'LOWER',measurement:'CONTROLLED_OLD_VS_NEW'});
  if(type==='COST_OBSERVATION') return Object.freeze({name:'additional_cost_eur',direction:'LOWER',measurement:'QUALITY_GATES_MUST_NOT_DEGRADE'});
  if(type==='HUMAN_CORRECTION') return Object.freeze({name:'repeat_human_correction_rate',direction:'LOWER',measurement:'FUTURE_EQUIVALENT_CASES'});
  if(type==='TRIBUNAL_DECISION') return Object.freeze({name:'candidate_decision_quality',direction:'HIGHER',measurement:'FUTURE_TRIBUNAL_EVIDENCE'});
  return Object.freeze({name:'operational_quality',direction:'HIGHER',measurement:'CONTROLLED_OLD_VS_NEW'});
}

export function normalizeUniversalLearningSignal(signal){
  if(!signal||typeof signal!=='object'||Array.isArray(signal)) throw new Error('learning signal object required');
  assertAuthorityDenied(signal);
  assertSafeJson(signal);
  const signal_id=reqString(signal.signal_id,'signal_id',{max:240});
  const signal_type=reqString(signal.signal_type,'signal_type',{max:80}).toUpperCase();
  if(!SIGNAL_TYPE_SET.has(signal_type)) throw new Error(`unsupported signal_type:${signal_type}`);
  const company_id=reqString(signal.company_id,'company_id',{max:160});
  const engine_id=reqString(signal.engine_id,'engine_id',{max:160});
  const source_environment=reqString(signal.source_environment,'source_environment',{max:20}).toUpperCase();
  if(!SOURCE_ENVIRONMENTS.has(source_environment)) throw new Error(`unsupported source_environment:${source_environment}`);
  const version=reqString(signal.version,'version',{max:80});
  const observed_at=canonicalObservedAt(signal.observed_at);
  const severity=reqString(signal.severity??'INFO','severity',{max:20}).toUpperCase();
  if(!['INFO','LOW','MEDIUM','HIGH','CRITICAL'].includes(severity)) throw new Error('severity invalid');
  const confidence=signal.confidence==null?defaultConfidence(signal_type):finiteNumber(signal.confidence,'confidence');
  if(confidence<0||confidence>1) throw new Error('confidence must be 0..1');
  const risk_class=reqString(signal.risk_class??defaultRisk(signal_type,severity),'risk_class',{max:20}).toUpperCase();
  if(!RISK_CLASSES.includes(risk_class)) throw new Error('risk_class invalid');
  const reason=optionalString(signal.reason,'reason')??signal_type;
  const hypothesis=optionalString(signal.hypothesis,'hypothesis')??defaultHypothesis(signal_type,engine_id,reason);
  const evidence_refs=normalizeEvidenceRefs(signal.evidence_refs,signal_id);
  const expected_metric_delta=defaultMetric(signal_type,signal.metric);
  const payload=signal.payload==null?{}:structuredClone(signal.payload);
  assertSafeJson(payload);
  const event_id=`evt:universal:${stableIdempotencyKey({signal_id,signal_type,company_id,engine_id,source_environment,version}).slice(0,24)}`;
  return Object.freeze({
    schema_version:'1.0.0',
    event_id,
    event_type:`CEREBRO_${signal_type}`,
    signal_id,
    source_type:signal_type,
    company_id,
    engine_id,
    environment:'PREPROD_CANDIDATE',
    source_environment,
    version,
    observed_at,
    severity,
    confidence,
    risk_class,
    reason,
    learning_hypothesis:hypothesis,
    expected_metric_delta,
    evidence_refs,
    payload,
    local_validation_required:true,
    publish_authorized:false,
    persistent_publish_authorized:false,
    rsi_publish_authorized:false,
    contains_customer_data:false,
    contains_secrets:false,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0
  });
}

export function buildUniversalLearningEventReport(input){
  const rawSignals=Array.isArray(input)?input:(Array.isArray(input?.signals)?input.signals:[input]);
  if(rawSignals.length===0) throw new Error('at least one learning signal required');
  if(rawSignals.length>100) throw new Error('universal ingress accepts at most 100 signals per batch');
  const events=rawSignals.map(normalizeUniversalLearningSignal).sort((a,b)=>a.event_id.localeCompare(b.event_id));
  const ids=new Set();
  for(const event of events){
    if(ids.has(event.event_id)) throw new Error(`duplicate normalized event:${event.event_id}`);
    ids.add(event.event_id);
  }
  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_RSI_UNIVERSAL_LEARNING_EVENT_REPORT',
    events_total:events.length,
    events,
    local_validation_required:true,
    publish_authorized:false,
    persistent_publish_authorized:false,
    rsi_publish_authorized:false,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0
  });
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){
  try{
    const inputPath=reqString(arg('--input'),'--input',{max:1000});
    const outputPath=reqString(arg('--output'),'--output',{max:1000});
    const input=JSON.parse(fs.readFileSync(path.resolve(inputPath),'utf8'));
    const report=buildUniversalLearningEventReport(input);
    fs.mkdirSync(path.dirname(path.resolve(outputPath)),{recursive:true});
    fs.writeFileSync(path.resolve(outputPath),`${JSON.stringify(report,null,2)}\n`,'utf8');
    console.log(JSON.stringify({status:'UNIVERSAL_INGRESS_GREEN',events_total:report.events_total,output:path.resolve(outputPath),prod_authorized:false,trading_access:false,additional_cost_eur:0}));
  }catch(error){
    console.error(error?.stack??String(error));
    process.exitCode=4;
  }
}
