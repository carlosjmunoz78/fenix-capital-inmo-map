import fs from 'node:fs';
import path from 'node:path';
import {
  CEREBRO_AGENT_BROWSER_WRAPPER,
  AGENT_BROWSER_FIXTURE_CONTRACTS,
  getAgentBrowserWrapperProfile
} from './skill-cerebro-agent-browser-wrapper.mjs';

function byCandidate(report,key='plans'){
  const map=new Map();
  for(const item of report?.[key]??[]) if(item?.candidate_id) map.set(item.candidate_id,item);
  return map;
}

function safeDisabledPlan(plan){
  if(!plan) return false;
  const p=plan.permissions??{};
  return plan.enabled===false&&plan.execution_authorized===false&&plan.install_authorized===false&&plan.prod_authorized===false&&
    p.network===false&&p.filesystem_read===false&&p.filesystem_write===false&&p.credentials===false&&p.external_actions===false&&p.prod_write===false&&p.trading_access===false&&
    plan.economics?.additional_cost_target_eur===0&&plan.economics?.paid_service_required===false&&plan.new_engine_id===false&&plan.owner_engine_id==='FACT-001';
}

function contractAssessments(){
  return Object.entries(AGENT_BROWSER_FIXTURE_CONTRACTS).map(([fixture_id,expected_constraints])=>{
    const profile=getAgentBrowserWrapperProfile({fixture_id,expected_constraints:[...expected_constraints]});
    return {fixture_id,contract_exact:profile?.contract_exact===true,required_constraints:[...(profile?.required_constraints??[])],safeguards:[...(profile?.safeguards??[])]};
  });
}

export function assessNormalizedWrapperAdmission(staticLab,wrapperPlans,{observedAt=new Date().toISOString()}={}){
  const planMap=byCandidate(wrapperPlans);
  const results=[];
  for(const lab of staticLab?.results??[]){
    if(lab?.domain!==CEREBRO_AGENT_BROWSER_WRAPPER.domain) continue;
    const plan=planMap.get(lab.candidate_id)??null;
    const contracts=contractAssessments();
    let status='NORMALIZED_WRAPPER_HOLD';
    const blockers=[];
    if((lab.hard_blocks??[]).length){status='BLOCKED_RAW_SECURITY';blockers.push('RAW_STATIC_HARD_BLOCK');}
    if(lab.upstream_full_name!==CEREBRO_AGENT_BROWSER_WRAPPER.approved_upstream_full_name){status='BLOCKED_UNAPPROVED_UPSTREAM';blockers.push('UPSTREAM_NOT_EXACTLY_APPROVED_FOR_WRAPPER');}
    if(lab.status!=='STATIC_LAB_HOLD'){blockers.push('RAW_STATIC_STATUS_NOT_HOLD');}
    if(Number(lab.coverage_score??0)<65){blockers.push('RAW_STATIC_COVERAGE_BELOW_65');}
    if(!safeDisabledPlan(plan)){blockers.push('DISABLED_WRAPPER_PLAN_NOT_FAIL_CLOSED');}
    if(plan?.next_gate!=='BUILD_NORMALIZED_INSTRUCTION_WRAPPER_IN_LAB_WITHOUT_EXTERNAL_EXECUTION'){blockers.push('NORMALIZATION_GATE_NOT_DECLARED');}
    if(!contracts.every((x)=>x.contract_exact)){blockers.push('WRAPPER_FIXTURE_CONTRACT_DRIFT');}
    const rawHoldPreserved=lab.status==='STATIC_LAB_HOLD';
    const eligible=blockers.length===0&&rawHoldPreserved;
    if(eligible) status='NORMALIZED_WRAPPER_GREEN_FOR_BEHAVIORAL_EVAL';
    results.push({
      candidate_id:lab.candidate_id,
      domain:lab.domain,
      upstream_full_name:lab.upstream_full_name??null,
      upstream_head_commit:lab.upstream_head_commit??null,
      raw_static_status:lab.status,
      raw_policy_alignment_score:lab.policy_alignment_score??null,
      raw_coverage_score:lab.coverage_score??null,
      raw_hard_blocks:[...(lab.hard_blocks??[])],
      raw_status_preserved:true,
      wrapper_id:CEREBRO_AGENT_BROWSER_WRAPPER.wrapper_id,
      wrapper_version:CEREBRO_AGENT_BROWSER_WRAPPER.version,
      status,
      blockers,
      normalized_policy_alignment_score:eligible?100:null,
      fixture_contracts:contracts,
      additional_cost_eur:0,
      external_skill_code_executed:false,
      external_skill_code_execution_authorized:false,
      install_authorized:false,
      prod_authorized:false,
      trading_access:false,
      new_engine_id:false,
      owner_engine_id:'FACT-001'
    });
  }
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'NORMALIZED_INTERNAL_WRAPPER_ADMISSION_ONLY',
    observed_at:observedAt,
    raw_static_results_mutated:false,
    thresholds_relaxed:false,
    external_skill_code_executed:false,
    prod_authorized:false,
    results
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function load(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
if(import.meta.url===`file://${process.argv[1]}`){
  const report=assessNormalizedWrapperAdmission(
    load(argValue('--static-lab')??'artifacts/cerebro-skill-static-lab-p0.json'),
    load(argValue('--wrappers')??'artifacts/cerebro-skill-wrapper-plans-p0.json')
  );
  const output=argValue('--output')??'artifacts/cerebro-skill-normalized-wrapper-admission-p0.json';
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,results:report.results.map((x)=>({candidate_id:x.candidate_id,status:x.status,raw_static_status:x.raw_static_status,raw_status_preserved:true,thresholds_relaxed:false})),external_skill_code_executed:false,prod_authorized:false}));
}
