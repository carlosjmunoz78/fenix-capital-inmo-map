const PREPROD='PREPROD';

function nonEmpty(value){return typeof value==='string'&&value.trim().length>0;}
function uniq(values){return [...new Set((values??[]).filter(nonEmpty).map((v)=>v.trim()))].sort();}
function clamp(n,min,max){return Math.max(min,Math.min(max,n));}

export function cohenKappa({human_labels,judge_labels}={}){
  if(!Array.isArray(human_labels)||!Array.isArray(judge_labels)||human_labels.length!==judge_labels.length||human_labels.length===0){
    throw new Error('equal non-empty label arrays required');
  }
  const labels=uniq([...human_labels,...judge_labels]);
  const n=human_labels.length;
  const agree=human_labels.reduce((sum,label,i)=>sum+(label===judge_labels[i]?1:0),0)/n;
  let expected=0;
  for(const label of labels){
    const ph=human_labels.filter((v)=>v===label).length/n;
    const pj=judge_labels.filter((v)=>v===label).length/n;
    expected+=ph*pj;
  }
  const kappa=expected===1?1:(agree-expected)/(1-expected);
  return Object.freeze({agreement:Number(agree.toFixed(6)),expected_agreement:Number(expected.toFixed(6)),kappa:Number(kappa.toFixed(6)),sample_size:n});
}

export function judgeCalibrationGate({human_labels,judge_labels,minimum_kappa=0.60}={}){
  const metrics=cohenKappa({human_labels,judge_labels});
  const threshold=clamp(Number(minimum_kappa),0,1);
  const pass=metrics.kappa>=threshold;
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SKILL_JUDGE_CALIBRATION',environment:PREPROD,
    decision:pass?'PASS':'HOLD',minimum_kappa:threshold,...metrics,
    calibrated_judge_authorized:pass,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

export function buildAdversarialScenarioMatrix({personas=[],failure_cases=[],max_scenarios=100}={}){
  const p=uniq(personas);const f=uniq(failure_cases);
  if(!p.length||!f.length) throw new Error('personas and failure_cases required');
  const out=[];
  for(const persona of p){
    for(const failure_case of f){
      if(out.length>=max_scenarios) break;
      out.push(Object.freeze({scenario_id:`${String(out.length+1).padStart(3,'0')}`,persona,failure_case,dataset_kind:'SYNTHETIC_ADVERSARIAL'}));
    }
    if(out.length>=max_scenarios) break;
  }
  return Object.freeze({schema_version:'1.0.0',environment:PREPROD,scenario_count:out.length,scenarios:Object.freeze(out),prod_authorized:false,additional_cost_eur:0});
}

export function buildControlledAblationPlan({champion_id,parameters=[],dead_end_parameters=[],history=[]}={}){
  if(!nonEmpty(champion_id)) throw new Error('champion_id required');
  const candidates=uniq(parameters);
  const dead=new Set(uniq(dead_end_parameters));
  for(const item of history??[]){if(item?.decision==='REJECTED'&&nonEmpty(item?.parameter)) dead.add(item.parameter.trim());}
  const next=candidates.find((parameter)=>!dead.has(parameter));
  if(!next){
    return Object.freeze({schema_version:'1.0.0',environment:PREPROD,champion_id,decision:'NO_UNTESTED_PARAMETER',next_parameter:null,change_count:0,prod_authorized:false,additional_cost_eur:0});
  }
  return Object.freeze({
    schema_version:'1.0.0',environment:PREPROD,champion_id,decision:'TEST_ONE_VARIABLE',next_parameter:next,change_count:1,
    preserve_parameters:Object.freeze(candidates.filter((p)=>p!==next)),dead_end_parameters:Object.freeze([...dead].sort()),
    evidence_rule:'SAME_DATASET_SAME_CRITERIA_CHAMPION_VS_CHALLENGER',rollback_required:true,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

export function buildSkillHealthSnapshot({skills=[],now=new Date().toISOString(),stale_after_days=90}={}){
  if(!Array.isArray(skills)) throw new Error('skills must be array');
  const nowMs=Date.parse(now);if(!Number.isFinite(nowMs)) throw new Error('valid now required');
  const staleMs=Math.max(1,Number(stale_after_days))*86400000;
  const rows=skills.map((skill)=>{
    if(!nonEmpty(skill?.skill_id)) throw new Error('skill_id required');
    const last=Date.parse(skill.last_used_at??skill.updated_at??skill.installed_at??'');
    const provenance=Boolean(nonEmpty(skill.source)&&nonEmpty(skill.version)&&nonEmpty(skill.fingerprint));
    const spec=skill.spec_valid===true;
    const stale=!Number.isFinite(last)||(nowMs-last)>staleMs;
    const effective=skill.eval_effectiveness??'UNKNOWN';
    const healthy=provenance&&spec&&!stale&&effective!=='INEFFECTIVE';
    return Object.freeze({skill_id:skill.skill_id,healthy,provenance_complete:provenance,spec_valid:spec,stale,eval_effectiveness:effective});
  });
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SKILL_HEALTH_SNAPSHOT',environment:PREPROD,
    total:rows.length,healthy:rows.filter((r)=>r.healthy).length,needs_attention:rows.filter((r)=>!r.healthy).length,
    rows:Object.freeze(rows),prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  });
}

export function externalPatternDisposition(){
  return Object.freeze({
    schema_version:'1.0.0',environment:PREPROD,
    sources:Object.freeze([
      Object.freeze({source:'ivaylogb/agent-eval-loop',license:'MIT',reuse:'PATTERNS_AND_COMPATIBLE_CODE',value:['judge_calibration','adversarial_scenarios','regression_discipline']}),
      Object.freeze({source:'justinwetch/Skill-RSI',license:'NO_EXPLICIT_LICENSE_EVIDENCE_AT_AUDIT',reuse:'PATTERNS_ONLY',value:['one_variable_ablation','dead_end_memory','champion_challenger_history']}),
      Object.freeze({source:'rooftop-Owl/skill-factory',license:'MPL-2.0',reuse:'PATTERNS_OR_SEPARATE_FILES_WITH_LICENSE_OBLIGATIONS',value:['provenance','skill_health','lifecycle_audit','tiered_discovery']})
    ]),
    new_engine_required:false,external_runtime_required:false,paid_model_required:false,additional_cost_eur:0,
    prod_authorized:false,prod_write_authorized:false,trading_access:false
  });
}
