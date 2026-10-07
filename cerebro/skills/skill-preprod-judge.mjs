import fs from 'node:fs';
import path from 'node:path';

function finite(value){return Number.isFinite(Number(value));}

export function judgeSkillPreprodEvidence(report){
  const blockers=[];
  const packages=[];
  if(report?.status!=='PREPROD_INTEGRATION_COMPLETE') blockers.push('PREPROD_INTEGRATION_NOT_COMPLETE');
  if(report?.environment!=='PREPROD') blockers.push('ENVIRONMENT_NOT_PREPROD');
  if(report?.runtime_integration_real!==true) blockers.push('REAL_RUNTIME_PATH_NOT_EXECUTED');
  if(report?.actual_current_cerebro_baseline_executed!==true) blockers.push('BASELINE_NOT_EXECUTED');
  if(report?.candidate_wrapper_binding_executed!==true) blockers.push('CANDIDATE_BINDING_NOT_EXECUTED');
  if(report?.physical_binding_rollback_executed!==true||report?.rebuild_default_disabled!==true) blockers.push('ROLLBACK_REBUILD_NOT_PROVEN');
  if(report?.audit_chain_valid!==true) blockers.push('AUDIT_CHAIN_INVALID');
  if(Number(report?.measured_additional_cost_eur)!==0) blockers.push('NONZERO_ADDITIONAL_COST');
  if(report?.prod_data_used===true||report?.customer_data_used===true) blockers.push('FORBIDDEN_DATA_USED');
  if(report?.external_skill_code_executed===true) blockers.push('EXTERNAL_SKILL_CODE_EXECUTED');
  if(report?.prod_writes===true||report?.trading_access===true||report?.paid_fallback===true) blockers.push('FORBIDDEN_SIDE_EFFECT_PATH');
  if(report?.prod_authorized===true||report?.merge_authorized===true||report?.autonomous_promotion_authorized===true) blockers.push('UNSAFE_PROMOTION_AUTHORIZATION');

  for(const pkg of report?.packages??[]){
    const pb=[];
    let improved=false;
    if(pkg?.status!=='PREPROD_PACKAGE_COMPLETE') pb.push('PACKAGE_NOT_COMPLETE');
    if(pkg?.runtime_path_executed!==true||pkg?.physical_binding_store_exercised!==true) pb.push('BINDING_RUNTIME_NOT_EXERCISED');
    if(pkg?.rollback_proof?.ready!==true||pkg?.rollback_proof?.rebuild_default_disabled!==true) pb.push('PACKAGE_ROLLBACK_NOT_READY');
    const fixtures=pkg?.fixture_results??[];
    if(!fixtures.length) pb.push('FIXTURE_EVIDENCE_MISSING');
    for(const fixture of fixtures){
      const b=fixture?.baseline??{},c=fixture?.candidate??{};
      if(c.valid_evaluation!==true||b.valid_evaluation!==true) pb.push(`UNSCORABLE:${fixture.fixture_id}`);
      if(!finite(c.constraint_compliance)||Number(c.constraint_compliance)!==100) pb.push(`CONSTRAINT_COVERAGE:${fixture.fixture_id}`);
      if(Number(c.constraint_compliance)<Number(b.constraint_compliance)) pb.push(`WORSE_CONSTRAINTS:${fixture.fixture_id}`);
      if(Number(c.task_correctness_proxy)<Number(b.task_correctness_proxy)) pb.push(`WORSE_CORRECTNESS:${fixture.fixture_id}`);
      if(Number(c.evidence_quality_proxy)<Number(b.evidence_quality_proxy)) pb.push(`WORSE_EVIDENCE:${fixture.fixture_id}`);
      if((c.policy_violations??[]).length||Number(c.side_effect_count??0)!==0) pb.push(`POLICY_OR_SIDE_EFFECT:${fixture.fixture_id}`);
      if(c.prod_write===true||c.external_action_executed===true||c.external_skill_code_executed===true) pb.push(`FORBIDDEN_EXECUTION:${fixture.fixture_id}`);
      if(Number(c.constraint_compliance)>Number(b.constraint_compliance)||Number(c.evidence_quality_proxy)>Number(b.evidence_quality_proxy)||Number(c.task_correctness_proxy)>Number(b.task_correctness_proxy)) improved=true;
    }
    if(!improved) pb.push('NO_MEASURABLE_PRIMARY_IMPROVEMENT');
    packages.push({package_id:pkg?.package_id??null,target:pkg?.target??null,decision:pb.length?'HOLD':'GREEN',blockers:[...new Set(pb)],fixtures:fixtures.length,rollback_ready:pkg?.rollback_proof?.ready===true});
  }
  if(!packages.length) blockers.push('PACKAGES_MISSING');
  if(packages.some(x=>x.decision!=='GREEN')) blockers.push('ONE_OR_MORE_PACKAGES_NOT_GREEN');
  const green=blockers.length===0;
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'DETERMINISTIC_PREPROD_INDEPENDENT_JUDGE',
    decision:green?'GREEN_FOR_PREPROD_TRIBUNAL':'NOT_READY',
    green,
    blockers:[...new Set(blockers)],
    packages,
    external_model_judge_used:false,
    external_skill_code_executed:false,
    merge_authorized:false,
    prod_authorized:false,
    autonomous_promotion_authorized:false
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const input=argValue('--preprod')??'artifacts/cerebro-skill-preprod-integration.json';
  const output=argValue('--output')??'artifacts/cerebro-skill-preprod-judge.json';
  const report=judgeSkillPreprodEvidence(JSON.parse(fs.readFileSync(input,'utf8')));
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,decision:report.decision,green:report.green,blockers:report.blockers,prod_authorized:false}));
}
