import fs from 'node:fs';
import path from 'node:path';

const EXPECTED={
  candidate_id:'lobehub-skills:950cf07380d1daa6de69',
  technical_name:'skill-creator',
  upstream_repository:'openclaw/openclaw',
  pinned_commit:'dc26366b07e7d08395b83de0d767150ffcb6ad50',
  manifest_path:'skills/skill-creator/SKILL.md',
  manifest_sha256:'3b7b93823a496cedc957fc91bbc8f8be132f2edd095dcaa46cee5394c742f0e4',
  engine_id:'FACT-001',
  environment:'PREPROD'
};

const SAFETY_FALSE=[
  'prod_write','prod_mutation','auto_merge','customer_data','external_skill_code_execution',
  'trading','paid_fallback','permission_expansion','autonomous_prod_promotion'
];

function assert(errors,condition,message){if(!condition) errors.push(message);}
function exactArray(value,expected){return Array.isArray(value)&&value.length===expected.length&&value.every((v,i)=>v===expected[i]);}
function loadJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}

export function validateSkillFullClosure({closure,adoptionRegistry,staticLab,preprodReport,fileExists=(p)=>fs.existsSync(p)}={}){
  const errors=[];
  assert(errors,closure?.state_type==='CEREBRO_SKILL_FULL_SAFE_PREPROD_CLOSURE','INVALID_CLOSURE_STATE_TYPE');
  assert(errors,closure?.candidate_id===EXPECTED.candidate_id,'CANDIDATE_MISMATCH');
  assert(errors,closure?.technical_name===EXPECTED.technical_name,'TECHNICAL_NAME_MISMATCH');
  assert(errors,closure?.engine_id===EXPECTED.engine_id,'ENGINE_BINDING_MISMATCH');
  assert(errors,closure?.environment===EXPECTED.environment,'ENVIRONMENT_MUST_BE_PREPROD');
  assert(errors,closure?.company_id==='fenix','COMPANY_ID_MISMATCH');
  assert(errors,closure?.human_required==null,'UNEXPECTED_HUMAN_REQUIRED');
  assert(errors,Number(closure?.additional_cost_eur)===0,'NONZERO_ADDITIONAL_COST');
  assert(errors,closure?.promotion_authorized===false,'PROMOTION_MUST_REMAIN_FALSE');
  assert(errors,closure?.prod_authorized===false,'PROD_AUTHORITY_MUST_REMAIN_FALSE');
  assert(errors,exactArray(closure?.target_engine_bindings,[EXPECTED.engine_id]),'TARGET_BINDINGS_MUST_BE_EXACT_FACT001');
  assert(errors,closure?.runtime_cadence?.cadence_applicable===false,'SKILL_CREATOR_CADENCE_MUST_BE_REQUEST_DRIVEN');

  const p=closure?.provenance??{};
  assert(errors,p.upstream_repository===EXPECTED.upstream_repository,'UPSTREAM_REPOSITORY_MISMATCH');
  assert(errors,p.pinned_commit===EXPECTED.pinned_commit,'PINNED_COMMIT_MISMATCH');
  assert(errors,p.manifest_path===EXPECTED.manifest_path,'MANIFEST_PATH_MISMATCH');
  assert(errors,p.expected_manifest_sha256===EXPECTED.manifest_sha256,'EXPECTED_MANIFEST_HASH_MISMATCH');
  assert(errors,p.observed_manifest_sha256===EXPECTED.manifest_sha256,'OBSERVED_MANIFEST_HASH_MISMATCH');
  assert(errors,p.manifest_hash_verified===true,'MANIFEST_HASH_NOT_VERIFIED');
  assert(errors,p.license_path==='LICENSE','LICENSE_PATH_MISMATCH');
  assert(errors,p.license_spdx==='MIT','LICENSE_NOT_MIT');
  assert(errors,p.license_observed_directly_at_pinned_commit===true,'LICENSE_NOT_OBSERVED_AT_PIN');
  assert(errors,p.provenance_and_license_status==='GREEN','PROVENANCE_LICENSE_NOT_GREEN');

  assert(errors,staticLab?.candidate_id===EXPECTED.candidate_id,'STATIC_LAB_CANDIDATE_MISMATCH');
  assert(errors,staticLab?.upstream_full_name===EXPECTED.upstream_repository,'STATIC_LAB_UPSTREAM_MISMATCH');
  assert(errors,staticLab?.upstream_head_commit===EXPECTED.pinned_commit,'STATIC_LAB_PIN_MISMATCH');
  assert(errors,staticLab?.manifest_path===EXPECTED.manifest_path,'STATIC_LAB_MANIFEST_PATH_MISMATCH');
  assert(errors,staticLab?.manifest_sha256===EXPECTED.manifest_sha256,'STATIC_LAB_MANIFEST_HASH_MISMATCH');
  assert(errors,staticLab?.provenance_exact===true,'STATIC_LAB_PROVENANCE_NOT_EXACT');

  const queue=Array.isArray(adoptionRegistry?.queue)?adoptionRegistry.queue:[];
  const item=queue.find((x)=>x?.candidate_id===EXPECTED.candidate_id);
  assert(errors,Boolean(item),'QUEUE_ITEM_MISSING');
  assert(errors,item?.target_status==='FULL_SAFE_PREPROD','QUEUE_TARGET_STATUS_MISMATCH');
  assert(errors,item?.human_required==null,'QUEUE_UNEXPECTED_HUMAN_REQUIRED');
  if(item?.status==='FULL_SAFE_PREPROD'){
    assert(errors,closure?.status==='FULL_SAFE_PREPROD','QUEUE_FULL_REQUIRES_FULL_CLOSURE_STATUS');
    assert(errors,closure?.validation_status==='CI_GREEN','QUEUE_FULL_REQUIRES_CI_GREEN_MARKER');
    assert(errors,exactArray(item?.target_engine_bindings,[EXPECTED.engine_id]),'QUEUE_FULL_REQUIRES_EXACT_FACT001_BINDING');
  } else {
    assert(errors,closure?.status==='READY_FOR_FULL_SAFE_PREPROD_VALIDATION','PRE_PROMOTION_CLOSURE_STATUS_INVALID');
  }

  const wrapper=closure?.safe_internal_wrapper??{};
  assert(errors,wrapper.wrapper_id==='skillwrap:cerebro-skill-creator-v0.1.0','WRAPPER_ID_MISMATCH');
  assert(errors,wrapper.external_upstream_code_execution===false,'EXTERNAL_UPSTREAM_EXECUTION_FORBIDDEN');
  assert(errors,wrapper.policy_precedence==='CEREBRO_POLICY_WINS','POLICY_PRECEDENCE_MISMATCH');
  assert(errors,typeof wrapper.path==='string'&&fileExists(wrapper.path),'WRAPPER_PATH_MISSING');

  for(const key of SAFETY_FALSE) assert(errors,closure?.safety?.[key]===false,`UNSAFE_FLAG:${key}`);
  const required=closure?.required_closure??{};
  for(const [key,value] of Object.entries(required)) assert(errors,value===true,`REQUIRED_CLOSURE_NOT_GREEN:${key}`);
  const refs=closure?.evidence_refs??{};
  const requiredRefs=['static_lab','wrapper','old_vs_new','preprod_integration','supply_chain_registry','learning_ingress','learning_test','full_adoption_policy'];
  for(const key of requiredRefs) assert(errors,typeof refs[key]==='string'&&fileExists(refs[key]),`EVIDENCE_REF_MISSING:${key}`);

  assert(errors,preprodReport?.status==='PREPROD_INTEGRATION_COMPLETE','PREPROD_INTEGRATION_NOT_COMPLETE');
  assert(errors,preprodReport?.environment===EXPECTED.environment,'PREPROD_REPORT_ENVIRONMENT_MISMATCH');
  assert(errors,preprodReport?.engine_id===EXPECTED.engine_id,'PREPROD_REPORT_ENGINE_MISMATCH');
  assert(errors,preprodReport?.runtime_integration_real===true,'RUNTIME_INTEGRATION_NOT_REAL');
  assert(errors,preprodReport?.actual_current_cerebro_baseline_executed===true,'BASELINE_NOT_EXECUTED');
  assert(errors,preprodReport?.candidate_wrapper_binding_executed===true,'CANDIDATE_NOT_EXECUTED');
  assert(errors,preprodReport?.physical_binding_rollback_executed===true,'ROLLBACK_NOT_EXECUTED');
  assert(errors,preprodReport?.rebuild_default_disabled===true,'REBUILD_DEFAULT_DISABLED_NOT_PROVEN');
  assert(errors,preprodReport?.final_binding_state==='DISABLED','FINAL_BINDING_NOT_DISABLED');
  assert(errors,preprodReport?.audit_chain_valid===true,'AUDIT_CHAIN_INVALID');
  assert(errors,Number(preprodReport?.observability_records)>0,'OBSERVABILITY_NOT_CONNECTED');
  assert(errors,Number(preprodReport?.audit_records)>0,'AUDIT_NOT_CONNECTED');
  assert(errors,Number(preprodReport?.finops_records)>0,'FINOPS_NOT_CONNECTED');
  assert(errors,Number(preprodReport?.measured_additional_cost_eur)===0,'PREPROD_COST_NONZERO');
  assert(errors,preprodReport?.prod_data_used===false,'PROD_DATA_USED');
  assert(errors,preprodReport?.customer_data_used===false,'CUSTOMER_DATA_USED');
  assert(errors,preprodReport?.external_skill_code_executed===false,'EXTERNAL_SKILL_CODE_EXECUTED');
  assert(errors,preprodReport?.prod_writes===false,'PROD_WRITE_OCCURRED');
  assert(errors,preprodReport?.trading_access===false,'TRADING_ACCESSED');
  assert(errors,preprodReport?.paid_fallback===false,'PAID_FALLBACK_USED');
  assert(errors,preprodReport?.merge_authorized===false,'MERGE_AUTHORITY_EXPANDED');
  assert(errors,preprodReport?.prod_authorized===false,'PROD_AUTHORITY_EXPANDED');
  assert(errors,preprodReport?.autonomous_promotion_authorized===false,'AUTONOMOUS_PROMOTION_EXPANDED');
  const packages=Array.isArray(preprodReport?.packages)?preprodReport.packages:[];
  assert(errors,packages.length===1,'EXPECTED_ONE_PREPROD_PACKAGE');
  assert(errors,packages.every((pkg)=>pkg?.status==='PREPROD_PACKAGE_COMPLETE'),'PREPROD_PACKAGE_NOT_COMPLETE');
  assert(errors,packages.every((pkg)=>pkg?.rollback_proof?.ready===true&&pkg?.rollback_proof?.rebuild_default_disabled===true),'ROLLBACK_REBUILD_NOT_PROVEN');

  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_SKILL_FULL_CLOSURE_VALIDATION',
    candidate_id:EXPECTED.candidate_id,
    engine_id:EXPECTED.engine_id,
    environment:EXPECTED.environment,
    status:errors.length?'HOLD':'READY_TO_PROMOTE_QUEUE',
    errors,
    prod_write_authorized:false,
    trading_access:false,
    external_skill_code_execution_authorized:false,
    additional_cost_eur:0
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const closurePath=argValue('--closure')??'cerebro/registry/skill-creator-full-safe-preprod.v1.json';
  const registryPath=argValue('--registry')??'cerebro/registry/skill-full-adoption-v1.json';
  const staticLabPath=argValue('--static-lab')??'cerebro/skills/skill-creator-static-lab.v0.json';
  const preprodPath=argValue('--preprod-report');
  const output=argValue('--output')??'artifacts/skills-full/skill-creator-closure-validation.json';
  if(!preprodPath) throw new Error('PREPROD_REPORT_REQUIRED');
  const report=validateSkillFullClosure({
    closure:loadJson(closurePath),
    adoptionRegistry:loadJson(registryPath),
    staticLab:loadJson(staticLabPath),
    preprodReport:loadJson(preprodPath)
  });
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify(report));
  if(report.status!=='READY_TO_PROMOTE_QUEUE') process.exitCode=1;
}
