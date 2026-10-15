import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DEFAULT_REGISTRY=path.join(ROOT,'cerebro/registry/autonomous-readonly-skills.v1.json');
const EXPECTED_BINDINGS=Object.freeze(['FACT-001']);
const EXPECTED_CAPABILITIES=Object.freeze(['REPOSITORY_METADATA_READ_ADVISORY','MAIN_REF_READ_ADVISORY']);
const EXPECTED_CAPABILITY_EVIDENCE=Object.freeze({
  REPOSITORY_METADATA_READ_ADVISORY:'GET_REPOSITORY_METADATA',
  MAIN_REF_READ_ADVISORY:'GET_MAIN_GIT_REF'
});
const EXPECTED_FULL=Object.freeze({
  run_id:38807362064,
  head_sha:'68e3662b3d02c06fcb4381d56d5f1397bfb8341d',
  artifact_id:12006658643,
  artifact_digest:'sha256:9a924cc9b6becde9074f757c1cd70aa4114c09be26dd72e255956bb3233eabfc'
});
const EXPECTED_CANARY=Object.freeze({
  run_id:37670597824,
  head_sha:'7ee76db7a44b7e3c1153fd3b35365fc2e2ca5554',
  artifact_id:11505096443,
  artifact_digest:'sha256:7837d90b4a12c2b1d61faf9db1ac2c3300fc166a554d8b2e3057098c08acf387',
  observed_main_sha:'3304c93b3aceed338fc2bb7d377c4d562d2d18b2'
});

function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function add(errors,condition,code){if(!condition) errors.push(code);}

export function validateGitHubReadonlyAdvisoryRegistry(registry){
  const errors=[];
  add(errors,registry?.schema_version==='1.3.0'&&registry?.version==='1.3.0','REGISTRY_VERSION_MISMATCH');
  add(errors,registry?.registry_type==='CEREBRO_AUTONOMOUS_READONLY_SKILL_ADVISORY_REGISTRY','REGISTRY_TYPE_MISMATCH');
  add(errors,registry?.company_id==='GLOBAL'&&registry?.engine_id==='FACT-001','REGISTRY_CONTEXT_MISMATCH');
  add(errors,registry?.environment==='PROD_READONLY_ADVISORY','REGISTRY_ENVIRONMENT_MISMATCH');
  add(errors,registry?.status==='ACTIVE','REGISTRY_NOT_ACTIVE');
  add(errors,registry?.policy_ref==='CEREBRO-SKILL-AUTONOMY-STANDING-AUTH-001','POLICY_REF_MISMATCH');

  const top=registry?.safety??{};
  add(errors,top.prod_write===false,'TOP_PROD_WRITE_NOT_FALSE');
  add(errors,top.customer_data===false,'TOP_CUSTOMER_DATA_NOT_FALSE');
  add(errors,top.external_skill_code_execution===false,'TOP_EXTERNAL_CODE_NOT_FALSE');
  add(errors,top.trading===false,'TOP_TRADING_NOT_FALSE');
  add(errors,top.paid_fallback===false,'TOP_PAID_FALLBACK_NOT_FALSE');
  add(errors,top.app_fenix_deploy===false,'TOP_APP_DEPLOY_NOT_FALSE');
  add(errors,Number(top.additional_cost_eur)===0,'TOP_COST_NOT_ZERO');

  const entry=registry?.entries?.github;
  add(errors,Boolean(entry),'GITHUB_ENTRY_MISSING');
  if(entry){
    add(errors,entry.alias_es==='Manejo seguro de GitHub','ALIAS_MISMATCH');
    add(errors,entry.technical_id==='github','TECHNICAL_ID_MISMATCH');
    add(errors,entry.candidate_id==='lobehub-skills:52441cd3d76607ffffab','CANDIDATE_MISMATCH');
    add(errors,entry.wrapper_id==='skillwrap:cerebro-github-v0.1.0','WRAPPER_MISMATCH');
    add(errors,entry.status==='ACTIVE_READONLY_ADVISORY','ENTRY_NOT_ACTIVE_READONLY');
    add(errors,entry.execution_mode==='PROD_READONLY_ADVISORY','ENTRY_MODE_MISMATCH');
    add(errors,entry.company_id==='GLOBAL'&&entry.engine_id==='FACT-001'&&entry.environment==='PROD_READONLY_ADVISORY','ENTRY_CONTEXT_MISMATCH');
    add(errors,entry.approved_upstream_full_name==='openclaw/openclaw','UPSTREAM_MISMATCH');
    add(errors,entry.approved_manifest_path==='skills/github/SKILL.md','MANIFEST_PATH_MISMATCH');
    add(errors,entry.approved_upstream_commit==='e73b64b7f620e79844064a945447bbbb2a1f15d8','UPSTREAM_COMMIT_MISMATCH');
    add(errors,entry.approved_manifest_sha256==='04d13709b66a75f73774d47c1fb8446669623c8326c2d0af4e7d01017e2f29dc','MANIFEST_DIGEST_MISMATCH');
    add(errors,same(entry.target_engine_bindings,EXPECTED_BINDINGS),'ENGINE_BINDINGS_MISMATCH');
    add(errors,same(entry.allowed_capabilities,EXPECTED_CAPABILITIES),'CAPABILITIES_SCOPE_MISMATCH');
    add(errors,same(entry.capability_evidence,EXPECTED_CAPABILITY_EVIDENCE),'CAPABILITY_EVIDENCE_MISMATCH');
    add(errors,entry.mutation_gate==='HIGH_RISK','MUTATION_GATE_MISMATCH');

    const registration=entry.registration_basis??{};
    add(errors,registration.policy_id==='CEREBRO-SKILL-AUTONOMY-STANDING-AUTH-001','REGISTRATION_POLICY_MISMATCH');
    add(errors,registration.scope==='autonomous_readonly_advisory_registration'&&registration.exact_scope_only===true,'REGISTRATION_SCOPE_MISMATCH');

    const safety=entry.safety??{};
    for(const key of ['prod_write','github_write','merge','push','issue_or_pr_mutation','workflow_dispatch','direct_tool_execution','customer_data','prod_data','credentials_exposed','external_skill_code_execution','trading','paid_fallback','permission_expansion','autonomous_business_prod_write']){
      add(errors,safety[key]===false,`ENTRY_SAFETY_${key.toUpperCase()}_NOT_FALSE`);
    }
    add(errors,Number(safety.additional_cost_eur)===0,'ENTRY_COST_NOT_ZERO');

    const full=entry.full_safe_preprod_evidence??{};
    add(errors,full.workflow==='CEREBRO Skill Full Adoption V1'&&full.status==='FULL_SAFE_PREPROD_GREEN','FULL_SAFE_PREPROD_STATUS_MISMATCH');
    add(errors,full.run_id===EXPECTED_FULL.run_id&&full.head_sha===EXPECTED_FULL.head_sha&&full.artifact_id===EXPECTED_FULL.artifact_id&&full.artifact_digest===EXPECTED_FULL.artifact_digest,'FULL_SAFE_PREPROD_EVIDENCE_MISMATCH');
    for(const key of ['rollback_proven','rebuild_proven','observability_connected','audit_chain_connected','finops_connected','lrn001_feedback_connected','idempotency_proven']){
      add(errors,full[key]===true,`FULL_SAFE_PREPROD_${key.toUpperCase()}_NOT_TRUE`);
    }

    const canary=entry.prod_canary_evidence??{};
    add(errors,canary.workflow==='CEREBRO Skill GitHub PROD Read-only Canary','CANARY_WORKFLOW_MISMATCH');
    add(errors,canary.status==='GREEN_GITHUB_PROD_READONLY_CANARY','CANARY_STATUS_MISMATCH');
    add(errors,canary.run_id===EXPECTED_CANARY.run_id&&canary.head_sha===EXPECTED_CANARY.head_sha&&canary.artifact_id===EXPECTED_CANARY.artifact_id&&canary.artifact_digest===EXPECTED_CANARY.artifact_digest&&canary.observed_main_sha===EXPECTED_CANARY.observed_main_sha,'CANARY_EVIDENCE_MISMATCH');
    add(errors,canary.live_requests===2&&same(canary.allowed_http_methods,['GET']),'CANARY_READONLY_METHOD_SCOPE_MISMATCH');
    add(errors,same(canary.allowed_observations,['REPOSITORY_METADATA','MAIN_GIT_REF']),'CANARY_OBSERVATION_SCOPE_MISMATCH');
    add(errors,canary.rollback_proven===true&&canary.binding_after==='DISABLED','CANARY_ROLLBACK_MISSING');
    add(errors,Number(canary.measured_additional_cost_eur)===0,'CANARY_COST_NOT_ZERO');
    add(errors,canary.next_state_if_green==='PROD_READONLY_ADVISORY_ELIGIBLE','CANARY_NEXT_STATE_MISMATCH');

    const activation=entry.activation??{};
    add(errors,activation.registry_authority==='READONLY_ADVISORY_ONLY','ACTIVATION_AUTHORITY_MISMATCH');
    add(errors,activation.fail_closed===true,'ACTIVATION_NOT_FAIL_CLOSED');
    add(errors,activation.rollback_state==='DISABLED'&&activation.rebuild_default==='DISABLED','ACTIVATION_ROLLBACK_REBUILD_MISMATCH');
    add(errors,activation.prod_write_authorized===false,'ACTIVATION_PROD_WRITE_NOT_FALSE');
    add(errors,activation.github_write_authorized===false,'ACTIVATION_GITHUB_WRITE_NOT_FALSE');
    add(errors,activation.direct_tool_execution_authorized===false,'ACTIVATION_DIRECT_TOOL_NOT_FALSE');
    add(errors,activation.human_required_for_mutation==='HIGH_RISK','ACTIVATION_MUTATION_GATE_MISMATCH');
  }
  return Object.freeze({green:errors.length===0,errors,entry:errors.length===0?entry:null});
}

export function resolveGitHubReadonlyAdvisoryEntry(registry,technicalId){
  const validation=validateGitHubReadonlyAdvisoryRegistry(registry);
  if(!validation.green) return Object.freeze({enabled:false,reason:'REGISTRY_VALIDATION_FAILED',errors:validation.errors,entry:null});
  if(technicalId!=='github') return Object.freeze({enabled:false,reason:'NOT_REGISTERED',errors:[],entry:null});
  return Object.freeze({enabled:true,reason:'ACTIVE_READONLY_ADVISORY',errors:[],entry:validation.entry});
}

export function loadAndValidateGitHubRegistry(file=DEFAULT_REGISTRY){
  const registry=JSON.parse(fs.readFileSync(file,'utf8'));
  return validateGitHubReadonlyAdvisoryRegistry(registry);
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const file=arg('--registry')??DEFAULT_REGISTRY;
  const output=arg('--output');
  const verdict=loadAndValidateGitHubRegistry(file);
  const result={
    schema_version:'1.0.0',
    status:verdict.green?'GREEN_GITHUB_PROD_READONLY_ADVISORY_REGISTERED':'HOLD_GITHUB_PROD_READONLY_ADVISORY_REGISTRATION',
    green:verdict.green,
    environment:'PROD_READONLY_ADVISORY',
    technical_id:'github',
    alias_es:'Manejo seguro de GitHub',
    capabilities:[...EXPECTED_CAPABILITIES],
    prod_write_authorized:false,
    github_write_authorized:false,
    merge_authorized:false,
    push_authorized:false,
    issue_or_pr_mutation_authorized:false,
    workflow_dispatch_authorized:false,
    direct_tool_execution_authorized:false,
    external_skill_code_execution_authorized:false,
    customer_data_authorized:false,
    trading_authorized:false,
    paid_fallback:false,
    additional_cost_eur:0,
    human_required:verdict.green?null:'HIGH_RISK',
    errors:verdict.errors
  };
  if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(result,null,2)}\n`,'utf8');}
  console.log(JSON.stringify(result));
  if(!verdict.green) process.exitCode=1;
}
