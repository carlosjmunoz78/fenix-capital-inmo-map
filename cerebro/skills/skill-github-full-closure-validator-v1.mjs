import fs from 'node:fs';
import path from 'node:path';
import {CEREBRO_GITHUB_WRAPPER,GITHUB_FIXTURE_CONTRACTS} from './skill-cerebro-github-wrapper.mjs';

const EXPECTED=Object.freeze({
  candidate_id:'lobehub-skills:52441cd3d76607ffffab',
  technical_name:'github',
  upstream_repository:'openclaw/openclaw',
  pinned_commit:'e73b64b7f620e79844064a945447bbbb2a1f15d8',
  manifest_path:'skills/github/SKILL.md',
  manifest_sha256:'04d13709b66a75f73774d47c1fb8446669623c8326c2d0af4e7d01017e2f29dc',
  engine_id:'FACT-001',
  environment:'PREPROD',
  behavioral_run_id:37666101006,
  behavioral_artifact_id:11502662046,
  behavioral_artifact_digest:'sha256:5d2054116652c980866fe0c11a89d239151299d7e4a1bcdc1b3e19071359540e',
  preprod_run_id:37668271189,
  preprod_artifact_id:11503718236,
  preprod_artifact_digest:'sha256:d6e0fddf4932db4939b78802ee24bd104f1f6775ebe9877657849efdc284130d',
  readonly_run_id:37670597824,
  readonly_artifact_id:11505096443,
  readonly_artifact_digest:'sha256:7837d90b4a12c2b1d61faf9db1ac2c3300fc166a554d8b2e3057098c08acf387'
});

const SAFETY_FALSE=Object.freeze([
  'prod_write','prod_mutation','auto_merge','customer_data','external_skill_code_execution',
  'trading','paid_fallback','permission_expansion','autonomous_prod_promotion'
]);

function assert(errors,condition,message){if(!condition) errors.push(message);}
function exactArray(value,expected){return Array.isArray(value)&&value.length===expected.length&&value.every((v,i)=>v===expected[i]);}
function loadJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}

export function validateGitHubFullClosure({closure,adoptionRegistry,supplyChainRegistry,preprodReport,fileExists=(p)=>fs.existsSync(p)}={}){
  const errors=[];
  assert(errors,closure?.state_type==='CEREBRO_SKILL_FULL_SAFE_PREPROD_CLOSURE','INVALID_CLOSURE_STATE_TYPE');
  assert(errors,closure?.candidate_id===EXPECTED.candidate_id,'CANDIDATE_MISMATCH');
  assert(errors,closure?.technical_name===EXPECTED.technical_name,'TECHNICAL_NAME_MISMATCH');
  assert(errors,closure?.engine_id===EXPECTED.engine_id,'ENGINE_BINDING_MISMATCH');
  assert(errors,closure?.environment===EXPECTED.environment,'ENVIRONMENT_MUST_BE_PREPROD');
  assert(errors,closure?.company_id==='fenix','COMPANY_ID_MISMATCH');
  assert(errors,closure?.scope==='SAFE_INTERNAL_READONLY_AND_SYNTHETIC_PREPROD_CONTROL_PLANE','UNSAFE_OR_UNKNOWN_SCOPE');
  assert(errors,closure?.human_required==null,'UNEXPECTED_GLOBAL_HUMAN_REQUIRED');
  assert(errors,Number(closure?.additional_cost_eur)===0,'NONZERO_ADDITIONAL_COST');
  assert(errors,closure?.promotion_authorized===false,'PROMOTION_MUST_REMAIN_FALSE');
  assert(errors,closure?.prod_authorized===false,'PROD_AUTHORITY_MUST_REMAIN_FALSE');
  assert(errors,exactArray(closure?.target_engine_bindings,[EXPECTED.engine_id]),'TARGET_BINDINGS_MUST_BE_EXACT_FACT001');
  assert(errors,closure?.runtime_cadence?.cadence_applicable===false,'GITHUB_CADENCE_MUST_BE_REQUEST_DRIVEN');

  const provenance=closure?.provenance??{};
  assert(errors,provenance.upstream_repository===EXPECTED.upstream_repository,'UPSTREAM_REPOSITORY_MISMATCH');
  assert(errors,provenance.pinned_commit===EXPECTED.pinned_commit,'PINNED_COMMIT_MISMATCH');
  assert(errors,provenance.manifest_path===EXPECTED.manifest_path,'MANIFEST_PATH_MISMATCH');
  assert(errors,provenance.expected_manifest_sha256===EXPECTED.manifest_sha256,'EXPECTED_MANIFEST_HASH_MISMATCH');
  assert(errors,provenance.observed_manifest_sha256===EXPECTED.manifest_sha256,'OBSERVED_MANIFEST_HASH_MISMATCH');
  assert(errors,provenance.manifest_hash_verified===true,'MANIFEST_HASH_NOT_VERIFIED');
  assert(errors,provenance.license_path==='LICENSE','LICENSE_PATH_MISMATCH');
  assert(errors,provenance.license_spdx==='MIT','LICENSE_NOT_MIT');
  assert(errors,provenance.license_observed_directly_at_pinned_commit===true,'LICENSE_NOT_OBSERVED_AT_PIN');
  assert(errors,provenance.provenance_and_license_status==='GREEN','PROVENANCE_LICENSE_NOT_GREEN');

  const wrapper=closure?.safe_internal_wrapper??{};
  assert(errors,wrapper.wrapper_id===CEREBRO_GITHUB_WRAPPER.wrapper_id,'WRAPPER_ID_MISMATCH');
  assert(errors,wrapper.path==='cerebro/skills/skill-cerebro-github-wrapper.mjs'&&fileExists(wrapper.path),'WRAPPER_PATH_MISSING');
  assert(errors,wrapper.external_upstream_code_execution===false,'EXTERNAL_UPSTREAM_EXECUTION_FORBIDDEN');
  assert(errors,wrapper.upstream_guidance_trust===CEREBRO_GITHUB_WRAPPER.upstream_guidance_trust,'UPSTREAM_TRUST_MISMATCH');
  assert(errors,wrapper.policy_precedence===CEREBRO_GITHUB_WRAPPER.policy_precedence,'POLICY_PRECEDENCE_MISMATCH');
  assert(errors,CEREBRO_GITHUB_WRAPPER.approved_upstream_full_name===EXPECTED.upstream_repository,'LIVE_WRAPPER_UPSTREAM_DRIFT');
  assert(errors,CEREBRO_GITHUB_WRAPPER.approved_manifest_path===EXPECTED.manifest_path,'LIVE_WRAPPER_MANIFEST_DRIFT');
  assert(errors,CEREBRO_GITHUB_WRAPPER.external_skill_code_execution===false,'LIVE_WRAPPER_EXTERNAL_EXECUTION_ENABLED');
  assert(errors,CEREBRO_GITHUB_WRAPPER.prod_authorized===false,'LIVE_WRAPPER_PROD_AUTHORIZED');
  assert(errors,CEREBRO_GITHUB_WRAPPER.trading_access===false,'LIVE_WRAPPER_TRADING_AUTHORIZED');
  assert(errors,Number(CEREBRO_GITHUB_WRAPPER.additional_cost_eur)===0,'LIVE_WRAPPER_NONZERO_COST');
  assert(errors,Object.keys(GITHUB_FIXTURE_CONTRACTS).length===3,'LIVE_WRAPPER_FIXTURE_CONTRACT_DRIFT');

  for(const key of SAFETY_FALSE) assert(errors,closure?.safety?.[key]===false,`UNSAFE_FLAG:${key}`);
  for(const [key,value] of Object.entries(closure?.required_closure??{})) assert(errors,value===true,`REQUIRED_CLOSURE_NOT_GREEN:${key}`);
  const refs=closure?.evidence_refs??{};
  for(const key of ['behavioral_trigger','preprod_trigger','wrapper','old_vs_new','preprod_integration','preprod_tribunal','supply_chain_registry','learning_ingress','learning_test','full_adoption_policy']){
    assert(errors,typeof refs[key]==='string'&&fileExists(refs[key]),`EVIDENCE_REF_MISSING:${key}`);
  }

  const queue=Array.isArray(adoptionRegistry?.queue)?adoptionRegistry.queue:[];
  const queueItem=queue.find((x)=>x?.candidate_id===EXPECTED.candidate_id);
  assert(errors,Boolean(queueItem),'QUEUE_ITEM_MISSING');
  assert(errors,queueItem?.target_status==='FULL_SAFE_PREPROD','QUEUE_TARGET_STATUS_MISMATCH');
  assert(errors,queueItem?.human_required==null,'QUEUE_UNEXPECTED_GLOBAL_HUMAN_REQUIRED');
  if(queueItem?.status==='FULL_SAFE_PREPROD'){
    assert(errors,closure?.status==='FULL_SAFE_PREPROD','QUEUE_FULL_REQUIRES_FULL_CLOSURE_STATUS');
    assert(errors,closure?.validation_status==='CI_GREEN','QUEUE_FULL_REQUIRES_CI_GREEN_MARKER');
    assert(errors,exactArray(queueItem?.target_engine_bindings,[EXPECTED.engine_id]),'QUEUE_FULL_REQUIRES_EXACT_FACT001_BINDING');
  } else {
    assert(errors,closure?.status==='READY_FOR_FULL_SAFE_PREPROD_VALIDATION','PRE_PROMOTION_CLOSURE_STATUS_INVALID');
  }

  assert(errors,supplyChainRegistry?.capability_id==='cap:skill-supply-chain','SUPPLY_CHAIN_CAPABILITY_MISMATCH');
  assert(errors,supplyChainRegistry?.owner_engine_id===EXPECTED.engine_id,'SUPPLY_CHAIN_OWNER_MISMATCH');
  const behavioral=supplyChainRegistry?.behavioral_candidates?.github??{};
  assert(errors,behavioral.candidate_id===EXPECTED.candidate_id,'FROZEN_BEHAVIORAL_CANDIDATE_MISMATCH');
  assert(errors,behavioral.upstream_full_name===EXPECTED.upstream_repository,'FROZEN_BEHAVIORAL_UPSTREAM_MISMATCH');
  assert(errors,behavioral.manifest_path===EXPECTED.manifest_path,'FROZEN_BEHAVIORAL_MANIFEST_MISMATCH');
  assert(errors,behavioral.wrapper_id===CEREBRO_GITHUB_WRAPPER.wrapper_id,'FROZEN_BEHAVIORAL_WRAPPER_MISMATCH');
  assert(errors,behavioral.run_id===EXPECTED.behavioral_run_id,'FROZEN_BEHAVIORAL_RUN_MISMATCH');
  assert(errors,behavioral.artifact_id===EXPECTED.behavioral_artifact_id,'FROZEN_BEHAVIORAL_ARTIFACT_MISMATCH');
  assert(errors,behavioral.artifact_digest===EXPECTED.behavioral_artifact_digest,'FROZEN_BEHAVIORAL_DIGEST_MISMATCH');
  assert(errors,behavioral.judge_decision==='GREEN_FOR_TRIBUNAL_REVIEW','FROZEN_BEHAVIORAL_JUDGE_NOT_GREEN');
  assert(errors,behavioral.tribunal_decision==='GREEN','FROZEN_BEHAVIORAL_TRIBUNAL_NOT_GREEN');

  const frozenPreprod=supplyChainRegistry?.github_preprod_evidence??{};
  assert(errors,frozenPreprod.run_id===EXPECTED.preprod_run_id,'FROZEN_PREPROD_RUN_MISMATCH');
  assert(errors,frozenPreprod.artifact_id===EXPECTED.preprod_artifact_id,'FROZEN_PREPROD_ARTIFACT_MISMATCH');
  assert(errors,frozenPreprod.artifact_digest===EXPECTED.preprod_artifact_digest,'FROZEN_PREPROD_DIGEST_MISMATCH');
  assert(errors,frozenPreprod.integration_status==='PREPROD_INTEGRATION_COMPLETE','FROZEN_PREPROD_NOT_COMPLETE');
  assert(errors,frozenPreprod.runtime_integration_real===true,'FROZEN_PREPROD_RUNTIME_NOT_REAL');
  assert(errors,frozenPreprod.tribunal_decision==='GREEN_FOR_HIGH_RISK_PROD_READONLY_CANARY_REVIEW','FROZEN_PREPROD_TRIBUNAL_NOT_GREEN');
  assert(errors,frozenPreprod.prod_write_authorized===false,'FROZEN_PREPROD_WRITE_AUTHORIZED');
  assert(errors,frozenPreprod.prod_authorized===false,'FROZEN_PREPROD_PROD_AUTHORIZED');
  assert(errors,frozenPreprod.autonomous_promotion_authorized===false,'FROZEN_PREPROD_AUTONOMOUS_PROMOTION_AUTHORIZED');

  const readonly=supplyChainRegistry?.github_prod_readonly_canary_evidence??{};
  assert(errors,readonly.run_id===EXPECTED.readonly_run_id,'FROZEN_READONLY_RUN_MISMATCH');
  assert(errors,readonly.artifact_id===EXPECTED.readonly_artifact_id,'FROZEN_READONLY_ARTIFACT_MISMATCH');
  assert(errors,readonly.artifact_digest===EXPECTED.readonly_artifact_digest,'FROZEN_READONLY_DIGEST_MISMATCH');
  assert(errors,readonly.status==='GREEN_GITHUB_PROD_READONLY_CANARY','FROZEN_READONLY_CANARY_NOT_GREEN');
  assert(errors,exactArray(readonly.methods_used,['GET']),'FROZEN_READONLY_METHODS_NOT_GET_ONLY');
  for(const key of ['prod_write','github_write','merge_performed','push_performed','issue_or_pr_mutation','workflow_dispatch_performed','customer_data_used','credentials_exposed','external_skill_code_executed','trading_access','paid_fallback','prod_write_authorized','autonomous_promotion_authorized']){
    assert(errors,readonly?.[key]===false,`FROZEN_READONLY_UNSAFE:${key}`);
  }
  assert(errors,Number(readonly.additional_cost_eur)===0,'FROZEN_READONLY_NONZERO_COST');
  assert(errors,readonly.rollback_proven===true,'FROZEN_READONLY_ROLLBACK_NOT_PROVEN');
  assert(errors,readonly.binding_after==='DISABLED','FROZEN_READONLY_BINDING_NOT_DISABLED');

  assert(errors,preprodReport?.status==='PREPROD_INTEGRATION_COMPLETE','CURRENT_PREPROD_INTEGRATION_NOT_COMPLETE');
  assert(errors,preprodReport?.environment===EXPECTED.environment,'CURRENT_PREPROD_ENVIRONMENT_MISMATCH');
  assert(errors,preprodReport?.engine_id===EXPECTED.engine_id,'CURRENT_PREPROD_ENGINE_MISMATCH');
  assert(errors,preprodReport?.runtime_integration_real===true,'CURRENT_PREPROD_RUNTIME_NOT_REAL');
  assert(errors,preprodReport?.calls_executed===9,'CURRENT_PREPROD_EXPECTED_NINE_CALLS');
  assert(errors,preprodReport?.actual_current_cerebro_baseline_executed===true,'CURRENT_BASELINE_NOT_EXECUTED');
  assert(errors,preprodReport?.candidate_wrapper_binding_executed===true,'CURRENT_CANDIDATE_NOT_EXECUTED');
  assert(errors,preprodReport?.physical_binding_rollback_executed===true,'CURRENT_ROLLBACK_NOT_EXECUTED');
  assert(errors,preprodReport?.rebuild_default_disabled===true,'CURRENT_REBUILD_DISABLED_NOT_PROVEN');
  assert(errors,preprodReport?.final_binding_state==='DISABLED','CURRENT_FINAL_BINDING_NOT_DISABLED');
  assert(errors,preprodReport?.audit_chain_valid===true,'CURRENT_AUDIT_CHAIN_INVALID');
  assert(errors,Number(preprodReport?.observability_records)>=9,'CURRENT_OBSERVABILITY_INCOMPLETE');
  assert(errors,Number(preprodReport?.audit_records)>=9,'CURRENT_AUDIT_INCOMPLETE');
  assert(errors,Number(preprodReport?.finops_records)>=9,'CURRENT_FINOPS_INCOMPLETE');
  assert(errors,Number(preprodReport?.measured_additional_cost_eur)===0,'CURRENT_PREPROD_NONZERO_COST');
  for(const key of ['prod_data_used','customer_data_used','external_skill_code_executed','prod_writes','trading_access','paid_fallback','merge_authorized','prod_authorized','autonomous_promotion_authorized']){
    assert(errors,preprodReport?.[key]===false,`CURRENT_PREPROD_UNSAFE:${key}`);
  }
  const packages=Array.isArray(preprodReport?.packages)?preprodReport.packages:[];
  assert(errors,packages.length===1,'CURRENT_EXPECTED_ONE_PREPROD_PACKAGE');
  const pkg=packages[0]??{};
  assert(errors,pkg.target==='GITHUB_WRAPPER','CURRENT_PACKAGE_TARGET_MISMATCH');
  assert(errors,pkg.wrapper_id===CEREBRO_GITHUB_WRAPPER.wrapper_id,'CURRENT_PACKAGE_WRAPPER_MISMATCH');
  assert(errors,pkg.approved_upstream_full_name===EXPECTED.upstream_repository,'CURRENT_PACKAGE_UPSTREAM_MISMATCH');
  assert(errors,pkg.approved_manifest_path===EXPECTED.manifest_path,'CURRENT_PACKAGE_MANIFEST_MISMATCH');
  assert(errors,pkg.status==='PREPROD_PACKAGE_COMPLETE','CURRENT_PACKAGE_NOT_COMPLETE');
  assert(errors,Array.isArray(pkg.fixture_results)&&pkg.fixture_results.length===3,'CURRENT_PACKAGE_FIXTURE_SET_INCOMPLETE');
  assert(errors,pkg.rollback_proof?.ready===true,'CURRENT_PACKAGE_ROLLBACK_NOT_PROVEN');
  assert(errors,pkg.rollback_proof?.rebuild_default_disabled===true,'CURRENT_PACKAGE_REBUILD_NOT_PROVEN');

  const frozen=closure?.frozen_evidence??{};
  assert(errors,frozen.behavioral_run_id===EXPECTED.behavioral_run_id&&frozen.behavioral_artifact_id===EXPECTED.behavioral_artifact_id&&frozen.behavioral_artifact_digest===EXPECTED.behavioral_artifact_digest,'CLOSURE_FROZEN_BEHAVIORAL_REF_MISMATCH');
  assert(errors,frozen.preprod_run_id===EXPECTED.preprod_run_id&&frozen.preprod_artifact_id===EXPECTED.preprod_artifact_id&&frozen.preprod_artifact_digest===EXPECTED.preprod_artifact_digest,'CLOSURE_FROZEN_PREPROD_REF_MISMATCH');
  assert(errors,frozen.readonly_canary_run_id===EXPECTED.readonly_run_id&&frozen.readonly_canary_artifact_id===EXPECTED.readonly_artifact_id&&frozen.readonly_canary_artifact_digest===EXPECTED.readonly_artifact_digest,'CLOSURE_FROZEN_READONLY_REF_MISMATCH');

  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_GITHUB_SKILL_FULL_CLOSURE_VALIDATION',
    candidate_id:EXPECTED.candidate_id,
    engine_id:EXPECTED.engine_id,
    environment:EXPECTED.environment,
    status:errors.length?'HOLD':'READY_TO_PROMOTE_QUEUE',
    errors,
    historical_prod_evidence_used_as_readonly_proof_only:true,
    new_prod_activity_authorized:false,
    prod_write_authorized:false,
    auto_merge_authorized:false,
    trading_access:false,
    external_skill_code_execution_authorized:false,
    additional_cost_eur:0
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const closurePath=argValue('--closure')??'cerebro/registry/skill-github-full-safe-preprod.v1.json';
  const registryPath=argValue('--registry')??'cerebro/registry/skill-full-adoption-v1.json';
  const supplyChainPath=argValue('--supply-chain')??'cerebro/registry/skill-supply-chain-v0.json';
  const preprodPath=argValue('--preprod-report');
  const output=argValue('--output')??'artifacts/skills-full/github/skill-github-closure-validation.json';
  if(!preprodPath) throw new Error('PREPROD_REPORT_REQUIRED');
  const report=validateGitHubFullClosure({
    closure:loadJson(closurePath),
    adoptionRegistry:loadJson(registryPath),
    supplyChainRegistry:loadJson(supplyChainPath),
    preprodReport:loadJson(preprodPath)
  });
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify(report));
  if(report.status!=='READY_TO_PROMOTE_QUEUE') process.exitCode=1;
}
