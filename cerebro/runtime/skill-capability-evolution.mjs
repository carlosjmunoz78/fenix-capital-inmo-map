import {serialize,deserialize} from 'node:v8';
import {AtomicV8Journal} from './persistent-runtime.mjs';
import {LearningLedgerV0} from './learning-ledger.mjs';
import {HUMAN_REQUIRED_CODES,stableIdempotencyKey} from './continuous-improvement-contract.mjs';

const PREPROD='PREPROD';
const KIND='CEREBRO-SKILL-CAPABILITY-REGISTRY-V0';
const VALID_RISK=new Set(['LOW','MEDIUM','HIGH','CRITICAL']);
const HIGHER_BETTER=new Set(['success_rate','quality','accuracy','confidence','coverage']);
const LOWER_BETTER=new Set(['latency_ms','cost_eur','error_rate','policy_violations','safety_violations']);

function clone(value){return deserialize(serialize(value));}
function nonEmpty(value){return typeof value==='string'&&value.trim().length>0;}
function strings(value,label,{allowEmpty=false}={}){
  if(!Array.isArray(value)||(!allowEmpty&&value.length===0)) throw new Error(`${label} must be ${allowEmpty?'an':'a non-empty'} array`);
  const out=[...new Set(value.map((item)=>{if(!nonEmpty(item))throw new Error(`${label} must contain non-empty strings`);return item.trim();}))].sort();
  if(!allowEmpty&&!out.length) throw new Error(`${label} must not be empty`);
  return out;
}

export function validateSkillManifest(raw){
  const errors=[];
  if(!raw||typeof raw!=='object'||Array.isArray(raw)) return {ok:false,errors:['manifest must be object']};
  if(!nonEmpty(raw.company_id)) errors.push('missing:company_id');
  if(raw.environment!==PREPROD) errors.push('environment_must_be_preprod');
  for(const key of ['skill_id','skill_version']) if(!nonEmpty(raw[key])) errors.push(`missing:${key}`);
  if(!Array.isArray(raw.capabilities)||!raw.capabilities.length||raw.capabilities.some((x)=>!nonEmpty(x))) errors.push('invalid:capabilities');
  for(const key of ['inputs','outputs','tags','permissions']) if(raw[key]!=null&&(!Array.isArray(raw[key])||raw[key].some((x)=>!nonEmpty(x)))) errors.push(`invalid:${key}`);
  if(!VALID_RISK.has(raw.risk_class??'LOW')) errors.push('invalid:risk_class');
  if(Number(raw.additional_cost_eur??0)!==0) errors.push('additional_cost_must_be_zero');
  if(raw.prod_authorized===true||raw.prod_write_authorized===true||raw.trading_access===true) errors.push('authority_expansion_forbidden');
  if(raw.human_required!=null&&!HUMAN_REQUIRED_CODES.includes(raw.human_required)) errors.push('invalid:human_required');
  return {ok:errors.length===0,errors:[...new Set(errors)]};
}

export function normalizeSkillManifest(raw){
  const check=validateSkillManifest(raw);if(!check.ok) throw new Error(`invalid skill manifest:${check.errors.join(',')}`);
  const contract={
    schema_version:'1.0.0',state_type:'CEREBRO_SKILL_CAPABILITY_MANIFEST',company_id:raw.company_id.trim(),
    engine_id:'SKILL-REGISTRY',environment:PREPROD,version:'0.1.0',skill_id:raw.skill_id.trim(),skill_version:raw.skill_version.trim(),
    capabilities:strings(raw.capabilities,'capabilities'),inputs:strings(raw.inputs??[],'inputs',{allowEmpty:true}),
    outputs:strings(raw.outputs??[],'outputs',{allowEmpty:true}),tags:strings(raw.tags??[],'tags',{allowEmpty:true}),
    permissions:strings(raw.permissions??[],'permissions',{allowEmpty:true}),risk_class:raw.risk_class??'LOW',
    source:nonEmpty(raw.source)?raw.source.trim():'UNIVERSAL_INTAKE',additional_cost_eur:0,
    prod_authorized:false,prod_write_authorized:false,trading_access:false
  };
  const fingerprint=stableIdempotencyKey(contract);
  return Object.freeze({...contract,skill_fingerprint:fingerprint,idempotency_key:`skill:${fingerprint}`,registered_at:nonEmpty(raw.registered_at)?raw.registered_at:new Date().toISOString()});
}

function validateStored(item,index){
  if(item?.kind!==KIND||item.sequence!==index+1) throw new Error('skill registry sequence mismatch');
  const check=validateSkillManifest(item.record);if(!check.ok) throw new Error(`invalid stored skill:${check.errors.join(',')}`);
  if(item.record_hash!==stableIdempotencyKey(item.record)) throw new Error('skill record hash mismatch');
}

export class SkillCapabilityRegistryV0{
  #journal;#records;
  constructor({file_path}){
    this.#journal=new AtomicV8Journal({file_path,kind:KIND});
    this.#records=this.#journal.load();
    this.#records.forEach(validateStored);
  }
  register(raw){
    const record=normalizeSkillManifest(raw);const hash=stableIdempotencyKey(record);
    const prior=this.#records.find((item)=>item.record.company_id===record.company_id&&item.record.skill_id===record.skill_id&&item.record.skill_version===record.skill_version);
    if(prior){
      if(prior.record.skill_fingerprint!==record.skill_fingerprint) throw new Error('skill version conflict with different contract');
      return Object.freeze({accepted:false,duplicate:true,sequence:prior.sequence,record:clone(prior.record),record_hash:prior.record_hash});
    }
    const item={kind:KIND,sequence:this.#records.length+1,record:clone(record),record_hash:hash};
    this.#journal.commit([...this.#records,item]);this.#records=[...this.#records,item];
    return Object.freeze({accepted:true,duplicate:false,sequence:item.sequence,record:clone(record),record_hash:hash});
  }
  list({company_id}={}){return clone(this.#records.filter((item)=>!company_id||item.record.company_id===company_id).map((item)=>item.record));}
}

function engineDescriptor(raw,companyId){
  if(!raw||typeof raw!=='object'||!nonEmpty(raw.engine_id)||!nonEmpty(raw.version)) throw new Error('engine descriptor requires engine_id and version');
  if(raw.company_id&&raw.company_id!==companyId) return null;
  return {
    engine_id:raw.engine_id.trim(),version:raw.version.trim(),
    capabilities:strings(raw.capabilities??[],'engine.capabilities',{allowEmpty:true}),
    inputs:strings(raw.inputs??[],'engine.inputs',{allowEmpty:true}),
    outputs:strings(raw.outputs??[],'engine.outputs',{allowEmpty:true}),
    tags:strings(raw.tags??[],'engine.tags',{allowEmpty:true}),autonomy_state:raw.autonomy_state??'ASSISTED'
  };
}
function overlap(a,b){const set=new Set(a);return b.filter((x)=>set.has(x)).length;}
function score(skill,engine){
  const raw=overlap(skill.capabilities,engine.capabilities)*5+overlap(skill.outputs,engine.inputs)*4+overlap(skill.inputs,engine.outputs)*3+overlap(skill.tags,engine.tags)*2;
  const max=Math.max(1,skill.capabilities.length*5+skill.outputs.length*4+skill.inputs.length*3+skill.tags.length*2);
  return Math.min(1,raw/max);
}

export function analyzeSkillImpact({skill,engines=[],minimum_score=0.20}={}){
  const manifest=normalizeSkillManifest(skill);if(!Array.isArray(engines)) throw new Error('engines must be array');
  const impacts=engines.map((e)=>engineDescriptor(e,manifest.company_id)).filter(Boolean).map((engine)=>Object.freeze({
    company_id:manifest.company_id,engine_id:engine.engine_id,environment:PREPROD,version:engine.version,
    impact_score:Number(score(manifest,engine).toFixed(6)),action:'EXTEND_EXISTING_ENGINE',autonomy_state:engine.autonomy_state
  })).filter((item)=>item.impact_score>=minimum_score).sort((a,b)=>b.impact_score-a.impact_score||a.engine_id.localeCompare(b.engine_id));
  const gap=impacts.length===0;
  const fingerprint=stableIdempotencyKey({skill_fingerprint:manifest.skill_fingerprint,impacts:impacts.map(({engine_id,version,impact_score})=>({engine_id,version,impact_score}))});
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SKILL_IMPACT_ANALYSIS',company_id:manifest.company_id,engine_id:'SKILL-IMPACT',environment:PREPROD,version:'0.1.0',
    skill_id:manifest.skill_id,skill_version:manifest.skill_version,skill_fingerprint:manifest.skill_fingerprint,analysis_id:`impact:${fingerprint.slice(0,24)}`,
    impacts:Object.freeze(impacts),gap_detected:gap,factory_action:gap?'FACT001_REGISTRY_CANDIDATE_REQUIRED':'EXTEND_EXISTING_ENGINE',factory_first:true,
    create_new_engine_authorized:false,next_gate:gap?'FACT001_CAPABILITY_GAP_REVIEW':'OLD_VS_NEW_EXPERIMENT',
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

export function buildOldVsNewPlans({skill,impact_analysis}={}){
  const manifest=normalizeSkillManifest(skill);
  if(!impact_analysis||impact_analysis.skill_fingerprint!==manifest.skill_fingerprint) throw new Error('impact_analysis does not match skill');
  return Object.freeze(impact_analysis.impacts.map((impact)=>Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SKILL_OLD_VS_NEW_PLAN',
    experiment_id:`skill-exp:${stableIdempotencyKey({skill:manifest.skill_fingerprint,engine:impact.engine_id,baseline:impact.version}).slice(0,24)}`,
    company_id:manifest.company_id,engine_id:impact.engine_id,environment:PREPROD,version:'0.1.0',
    baseline_version:impact.version,candidate_version:`${impact.version}-skill-${manifest.skill_fingerprint.slice(0,8)}`,
    skill_id:manifest.skill_id,skill_version:manifest.skill_version,impact_score:impact.impact_score,
    dataset_kinds:['HISTORICAL','SYNTHETIC'],same_dataset_required:true,policy_locked:true,permissions_locked:true,
    rollback_required:true,rebuild_required:true,next_gate:'EVALUATION_TRIBUNAL',
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  })));
}

function metricDelta(name,baseline,candidate){
  const b=Number(baseline?.[name]),c=Number(candidate?.[name]);
  if(!Number.isFinite(b)||!Number.isFinite(c)) return null;
  return {name,baseline:b,candidate:c,benefit:(c-b)*(LOWER_BETTER.has(name)?-1:1)};
}

export function evaluateOldVsNew({plan,baseline_metrics,candidate_metrics}={}){
  if(!plan||plan.environment!==PREPROD) throw new Error('PREPROD plan required');
  if(!baseline_metrics||!candidate_metrics) throw new Error('baseline_metrics and candidate_metrics required');
  const names=[...new Set([...Object.keys(baseline_metrics),...Object.keys(candidate_metrics)])].filter((name)=>HIGHER_BETTER.has(name)||LOWER_BETTER.has(name));
  const deltas=names.map((name)=>metricDelta(name,baseline_metrics,candidate_metrics)).filter(Boolean);
  const safetyRegression=Number(candidate_metrics.policy_violations??0)>Number(baseline_metrics.policy_violations??0)||Number(candidate_metrics.safety_violations??0)>Number(baseline_metrics.safety_violations??0);
  const costRegression=Number(candidate_metrics.cost_eur??0)>Number(baseline_metrics.cost_eur??0);
  const measurable=deltas.filter((d)=>!['policy_violations','safety_violations','cost_eur'].includes(d.name));
  const improves=measurable.some((d)=>d.benefit>0);const regressions=measurable.filter((d)=>d.benefit<0);
  const pass=!safetyRegression&&!costRegression&&improves&&!regressions.length;
  const reasons=[...(safetyRegression?['SAFETY_OR_POLICY_REGRESSION']:[]),...(costRegression?['COST_REGRESSION']:[]),...(!improves?['NO_MEASURED_IMPROVEMENT']:[]),...(regressions.length?['METRIC_REGRESSION']:[])];
  const fingerprint=stableIdempotencyKey({experiment_id:plan.experiment_id,baseline_metrics,candidate_metrics});
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SKILL_OLD_VS_NEW_RESULT',result_id:`skill-result:${fingerprint.slice(0,24)}`,
    company_id:plan.company_id,engine_id:plan.engine_id,environment:PREPROD,version:'0.1.0',experiment_id:plan.experiment_id,
    baseline_version:plan.baseline_version,candidate_version:plan.candidate_version,skill_id:plan.skill_id,skill_version:plan.skill_version,
    deltas:Object.freeze(deltas),decision:pass?'PASS':'FAIL',rollback_required:!pass,reasons:Object.freeze(reasons),
    next_gate:pass?'LEARNING_AND_TRIBUNAL':'ROLLBACK',prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

export function buildSkillLearningRecord({skill,plan,result,observed_at=new Date().toISOString()}={}){
  const manifest=normalizeSkillManifest(skill);
  if(result?.experiment_id!==plan?.experiment_id||result?.skill_id!==manifest.skill_id) throw new Error('skill/plan/result mismatch');
  const passed=result.decision==='PASS';const confidence=Math.max(0.6,Math.min(0.99,0.6+(plan.impact_score??0)*0.39));
  const id=stableIdempotencyKey({skill:manifest.skill_fingerprint,experiment_id:plan.experiment_id,result_id:result.result_id});
  return Object.freeze({
    schema_version:'1.0.0',learning_id:`skill-learning:${id.slice(0,24)}`,company_id:plan.company_id,engine_id:plan.engine_id,
    environment:PREPROD,version:'0.1.0',source_version:plan.baseline_version,source_event_ids:[result.result_id],source_type:'ENGINE_RESULT',source_environment:PREPROD,
    observed_at,hypothesis:`Skill ${manifest.skill_id}@${manifest.skill_version} ${passed?'improves':'does not improve'} ${plan.engine_id} under controlled OLD_VS_NEW evidence`,
    expected_metric_delta:{name:'skill_composite_outcome',direction:'HIGHER',measurement:'CONTROLLED_OLD_VS_NEW'},confidence,
    risk_class:manifest.risk_class,evidence_refs:[result.result_id,plan.experiment_id],promotion_state:passed?'CANDIDATE':'REJECTED',
    created_by:'CEREBRO_SKILL_CAPABILITY_EVOLUTION_V0',reason:passed?'MEASURED_SKILL_IMPROVEMENT':'MEASURED_SKILL_REGRESSION_OR_NO_GAIN',
    judge_decision:passed?'PASS':'FAIL',human_required:null,signal_id:manifest.skill_fingerprint,
    persistent_publish_authorized:true,persistence_scope:'LOCAL_PREPROD_LRN_LEDGER_ONLY',
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

export function finalizeSkillEvaluation({skill,plan,result,learning_ledger_file,observed_at}={}){
  const learning=buildSkillLearningRecord({skill,plan,result,observed_at});let persistence=null;
  if(learning_ledger_file){const ledger=new LearningLedgerV0({file_path:learning_ledger_file,environment:PREPROD});persistence=ledger.persist(learning);}
  const passed=result.decision==='PASS';
  return Object.freeze({
    status:passed?'SKILL_IMPROVEMENT_EVIDENCE_GREEN':'SKILL_IMPROVEMENT_ROLLBACK_REQUIRED',company_id:plan.company_id,engine_id:plan.engine_id,
    environment:PREPROD,version:'0.1.0',learning_record:learning,learning_persistence:persistence,
    action:passed?'EXTEND_EXISTING_ENGINE':'ROLLBACK_CANDIDATE',next_gate:passed?'EVALUATION_TRIBUNAL':'ROLLBACK',
    factory_action:'EXTEND_EXISTING_ENGINE_FIRST',factory_create_authorized:false,
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

export function ingestSkillCapability({skill,engines,registry_file,minimum_score=0.20}={}){
  if(!nonEmpty(registry_file)) throw new Error('registry_file required');
  const registry=new SkillCapabilityRegistryV0({file_path:registry_file});
  const registration=registry.register(skill);const canonicalSkill=registration.record;
  const impact=analyzeSkillImpact({skill:canonicalSkill,engines,minimum_score});
  const plans=buildOldVsNewPlans({skill:canonicalSkill,impact_analysis:impact});
  return Object.freeze({
    status:impact.gap_detected?'SKILL_REGISTERED_CAPABILITY_GAP':'SKILL_REGISTERED_EXPERIMENTS_READY',registration,impact,plans,
    next_gate:impact.next_gate,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

export const SKILL_CAPABILITY_EVOLUTION_V0_CONTRACT=Object.freeze({
  environment:PREPROD,intake:'UNIVERSAL_MANIFEST_HOOK',registry:'LOCAL_ATOMIC_V8_JOURNAL',impact_analysis:'DETERMINISTIC',
  strategy:'EXTEND_EXISTING_BEFORE_FACTORY_CREATE',evaluation:'CONTROLLED_OLD_VS_NEW',learning_sink:'LRN-001',
  factory:'FACT-001_CAPABILITY_GAP_CANDIDATE_ONLY',supervisor_gate_required:true,tribunal_gate_required:true,rollback_required:true,
  additional_cost_target_eur:0,prod_writes:false,autonomous_global_prod:false,trading_access:false
});
