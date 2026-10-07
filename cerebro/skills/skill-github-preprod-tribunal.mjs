import fs from 'node:fs';
import path from 'node:path';

const EXPECTED_CANDIDATE_ID='lobehub-skills:52441cd3d76607ffffab';
const EXPECTED_WRAPPER_ID='skillwrap:cerebro-github-v0.1.0';

export function runGitHubPreprodTribunal({preprod,judge,labReadiness,labTribunal,registry,contract,trigger}={}){
  const blockers=[];
  const pkg=preprod?.packages?.[0]??null;

  if(trigger?.confirm!=='RUN_GITHUB_PREPROD_INTEGRATION'||trigger?.scope!=='PREPROD_LOCAL_CEREBRO_RUNTIME_ONLY') blockers.push('PREPROD_AUTHORIZATION_INVALID');
  if(trigger?.target_candidate!=='github'||trigger?.target_candidate_id!==EXPECTED_CANDIDATE_ID) blockers.push('AUTHORIZED_TARGET_MISMATCH');
  if(trigger?.expected_wrapper_id!==EXPECTED_WRAPPER_ID) blockers.push('AUTHORIZED_WRAPPER_MISMATCH');
  if(trigger?.expected_human_gate!=='HIGH_RISK') blockers.push('EXPECTED_HUMAN_GATE_MISMATCH');
  if(trigger?.additional_cost_budget_eur!==0||trigger?.paid_fallback!==false) blockers.push('ZERO_COST_CONTRACT_MISMATCH');
  if(trigger?.allow_prod_data!==false||trigger?.allow_customer_data!==false||trigger?.allow_external_skill_code_execution!==false||trigger?.allow_prod_write!==false||trigger?.allow_trading_access!==false) blockers.push('UNSAFE_PREPROD_AUTHORIZATION');

  if(labReadiness?.status!=='READY_FOR_PREPROD_PROMOTION_REVIEW'||labReadiness?.ready!==true||labReadiness?.human_required!=='HIGH_RISK') blockers.push('LAB_PROMOTION_READINESS_NOT_GREEN');
  if(labReadiness?.prod_authorized!==false||labReadiness?.merge_authorized!==false||labReadiness?.autonomous_promotion_authorized!==false) blockers.push('LAB_UNSAFE_PROMOTION_AUTHORIZATION');
  if(labTribunal?.decision!=='GREEN'||labTribunal?.green!==true||(labTribunal?.blockers??[]).length!==0) blockers.push('LAB_TRIBUNAL_NOT_GREEN');
  if(labTribunal?.prod_authorized!==false||labTribunal?.autonomous_promotion_authorized!==false) blockers.push('LAB_TRIBUNAL_UNSAFE_AUTHORIZATION');

  if(preprod?.status!=='PREPROD_INTEGRATION_COMPLETE') blockers.push('PREPROD_NOT_COMPLETE');
  if(preprod?.environment!=='PREPROD'||preprod?.runtime_integration_real!==true) blockers.push('PREPROD_RUNTIME_NOT_PROVEN');
  if(preprod?.calls_executed!==9) blockers.push('PREPROD_NINE_ARM_EXECUTION_NOT_PROVEN');
  if(preprod?.actual_current_cerebro_baseline_executed!==true||preprod?.candidate_wrapper_binding_executed!==true) blockers.push('OLD_VS_NEW_BINDING_NOT_PROVEN');
  if(preprod?.physical_binding_rollback_executed!==true||preprod?.rebuild_default_disabled!==true||preprod?.final_binding_state!=='DISABLED') blockers.push('ROLLBACK_REBUILD_NOT_PROVEN');
  if(preprod?.audit_chain_valid!==true||Number(preprod?.observability_records??0)<9||Number(preprod?.audit_records??0)<9||Number(preprod?.finops_records??0)<9) blockers.push('OBSERVABILITY_AUDIT_FINOPS_INCOMPLETE');
  if(Number(preprod?.measured_additional_cost_eur)!==0) blockers.push('COST_NOT_ZERO');
  if(preprod?.prod_data_used||preprod?.customer_data_used||preprod?.external_skill_code_executed||preprod?.prod_writes||preprod?.trading_access||preprod?.paid_fallback) blockers.push('UNSAFE_PREPROD_EVIDENCE');
  if(preprod?.prod_authorized===true||preprod?.merge_authorized===true||preprod?.autonomous_promotion_authorized===true) blockers.push('PREPROD_UNSAFE_PROMOTION_AUTHORIZATION');

  if(!pkg||preprod?.packages?.length!==1) blockers.push('EXACTLY_ONE_GITHUB_PREPROD_PACKAGE_REQUIRED');
  if(pkg?.target!=='GITHUB_WRAPPER'||pkg?.wrapper_id!==EXPECTED_WRAPPER_ID) blockers.push('GITHUB_WRAPPER_PACKAGE_MISMATCH');
  if(pkg?.approved_upstream_full_name!=='openclaw/openclaw'||pkg?.approved_manifest_path!=='skills/github/SKILL.md') blockers.push('PINNED_UPSTREAM_MISMATCH');
  if(pkg?.status!=='PREPROD_PACKAGE_COMPLETE'||pkg?.rollback_proof?.ready!==true||pkg?.rollback_proof?.rebuild_default_disabled!==true) blockers.push('PACKAGE_ROLLBACK_REBUILD_NOT_GREEN');
  if((pkg?.fixture_results??[]).length!==3) blockers.push('PREPROD_FIXTURE_SET_INCOMPLETE');

  if(judge?.decision!=='GREEN_FOR_PREPROD_TRIBUNAL'||judge?.green!==true||(judge?.blockers??[]).length!==0) blockers.push('PREPROD_JUDGE_NOT_GREEN');
  if(judge?.prod_authorized!==false||judge?.merge_authorized!==false||judge?.autonomous_promotion_authorized!==false) blockers.push('PREPROD_JUDGE_UNSAFE_AUTHORIZATION');

  if(registry?.capability_id!=='cap:skill-supply-chain'||registry?.owner_engine_id!=='FACT-001') blockers.push('REGISTRY_BINDING_MISMATCH');
  if(registry?.safety?.prod_authorized!==false||registry?.safety?.prod_write_authorized!==false||registry?.safety?.autonomous_promotion_authorized!==false) blockers.push('REGISTRY_FAIL_CLOSED_SAFETY_MISSING');
  if(contract?.contract_id!=='contract:skill-supply-chain-v0'||contract?.owner_engine_id!=='FACT-001') blockers.push('CONTRACT_MISMATCH');
  if(contract?.invariants?.prod_write_default!==false||contract?.invariants?.external_skill_code_execution_default!==false||contract?.invariants?.paid_fallback_default!==false) blockers.push('CONTRACT_SAFETY_INVARIANT_MISSING');

  const green=blockers.length===0;
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'GITHUB_SKILL_PREPROD_TRIBUNAL',
    decision:green?'GREEN_FOR_HIGH_RISK_PROD_READONLY_CANARY_REVIEW':'HOLD',
    green,
    blockers:[...new Set(blockers)],
    human_required:green?'HIGH_RISK':null,
    next_gate:green?'PROD_READONLY_CANARY':null,
    target_candidate:'github',
    target_candidate_id:EXPECTED_CANDIDATE_ID,
    wrapper_id:EXPECTED_WRAPPER_ID,
    source_lab_head_sha:trigger?.expected_lab_head_sha??null,
    source_lab_run_id:trigger?.expected_lab_run_id??null,
    source_lab_artifact_id:trigger?.expected_lab_artifact_id??null,
    source_lab_artifact_digest:trigger?.expected_lab_artifact_digest??null,
    preprod_runtime_integration_proven:green,
    old_vs_new_proven:green,
    observability_audit_finops_green:green,
    physical_rollback_rebuild_green:green,
    measured_additional_cost_eur:Number(preprod?.measured_additional_cost_eur??0),
    external_skill_code_executed:false,
    prod_write:false,
    merge_authorized:false,
    prod_authorized:false,
    autonomous_promotion_authorized:false
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function load(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
if(import.meta.url===`file://${process.argv[1]}`){
  const output=argValue('--output')??'artifacts/cerebro-skill-github-preprod-tribunal.json';
  const report=runGitHubPreprodTribunal({
    preprod:load(argValue('--preprod')??'artifacts/cerebro-skill-github-preprod-integration.json'),
    judge:load(argValue('--judge')??'artifacts/cerebro-skill-github-preprod-judge.json'),
    labReadiness:load(argValue('--lab-readiness')??'artifacts/lab/cerebro-skill-github-promotion-readiness.manual.json'),
    labTribunal:load(argValue('--lab-tribunal')??'artifacts/lab/cerebro-skill-github-tribunal.manual.json'),
    registry:load(argValue('--registry')??'cerebro/registry/skill-supply-chain-v0.json'),
    contract:load(argValue('--contract')??'cerebro/contracts/skill-supply-chain-v0.json'),
    trigger:load(argValue('--trigger')??'cerebro/skills/.github-preprod-integration-trigger.json')
  });
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,decision:report.decision,green:report.green,human_required:report.human_required,next_gate:report.next_gate,blockers:report.blockers,cost_eur:report.measured_additional_cost_eur,prod_authorized:false}));
}
