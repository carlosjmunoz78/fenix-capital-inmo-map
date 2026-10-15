import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DEFAULT_REGISTRY=path.join(ROOT,'cerebro/registry/autonomous-readonly-skills.v1.json');
const EXPECTED_BINDINGS=Object.freeze(['FACT-001']);
const EXPECTED_CAPABILITIES=Object.freeze(['SKILL_CREATION_DESIGN_ADVISORY','SKILL_REPAIR_DESIGN_ADVISORY']);
const EXPECTED_CAPABILITY_EVIDENCE=Object.freeze({SKILL_CREATION_DESIGN_ADVISORY:'create-safe-skill',SKILL_REPAIR_DESIGN_ADVISORY:'repair-existing-skill'});
const EXPECTED_PREPROD=Object.freeze({run_id:38805648804,head_sha:'540333f2bf9db6ed06f53a60f6f8325b7df67cc4',artifact_id:12005049041,artifact_digest:'sha256:2958627c76013d0292a46eac5fdc188d114b3166ea46b7885f5ef768cd070050'});
const EXPECTED_CANARY=Object.freeze({run_id:37698393553,head_sha:'5493cf3d120c5bec89261512a9097a97f167c198',artifact_id:11516252090,artifact_digest:'sha256:27658b395b51b8696dc329075c84a5b27ca391276b884d030fb916da4d80e679',observed_main_sha:'df3f8b5eebe70cec9e6ffa17f10a7383a4b91468'});

function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function add(errors,condition,code){if(!condition) errors.push(code);}

export function validateSkillCreatorReadonlyAdvisoryRegistry(registry){
  const errors=[];
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

  const entry=registry?.entries?.['skill-creator'];
  add(errors,Boolean(entry),'SKILL_CREATOR_ENTRY_MISSING');
  if(entry){
    add(errors,entry.alias_es==='Fábrica inteligente de skills','ALIAS_MISMATCH');
    add(errors,entry.technical_id==='skill-creator','TECHNICAL_ID_MISMATCH');
    add(errors,entry.candidate_id==='lobehub-skills:950cf07380d1daa6de69','CANDIDATE_MISMATCH');
    add(errors,entry.wrapper_id==='skillwrap:cerebro-skill-creator-v0.1.0','WRAPPER_MISMATCH');
    add(errors,entry.status==='ACTIVE_READONLY_ADVISORY','ENTRY_NOT_ACTIVE_READONLY');
    add(errors,entry.execution_mode==='PROD_READONLY_ADVISORY','ENTRY_MODE_MISMATCH');
    add(errors,entry.company_id==='GLOBAL'&&entry.engine_id==='FACT-001'&&entry.environment==='PROD_READONLY_ADVISORY','ENTRY_CONTEXT_MISMATCH');
    add(errors,entry.approved_upstream_full_name==='openclaw/openclaw','UPSTREAM_MISMATCH');
    add(errors,entry.approved_manifest_path==='skills/skill-creator/SKILL.md','MANIFEST_PATH_MISMATCH');
    add(errors,entry.approved_upstream_commit==='dc26366b07e7d08395b83de0d767150ffcb6ad50','UPSTREAM_COMMIT_MISMATCH');
    add(errors,entry.approved_manifest_sha256==='3b7b93823a496cedc957fc91bbc8f8be132f2edd095dcaa46cee5394c742f0e4','MANIFEST_DIGEST_MISMATCH');
    add(errors,same(entry.target_engine_bindings,EXPECTED_BINDINGS),'ENGINE_BINDINGS_MISMATCH');
    add(errors,same(entry.allowed_capabilities,EXPECTED_CAPABILITIES),'CAPABILITIES_SCOPE_MISMATCH');
    add(errors,same(entry.capability_evidence,EXPECTED_CAPABILITY_EVIDENCE),'CAPABILITY_EVIDENCE_MISMATCH');
    add(errors,entry.mutation_gate==='HIGH_RISK','MUTATION_GATE_MISMATCH');

    const registration=entry.registration_basis??{};
    add(errors,registration.policy_id==='CEREBRO-SKILL-AUTONOMY-STANDING-AUTH-001','REGISTRATION_POLICY_MISMATCH');
    add(errors,registration.scope==='autonomous_readonly_advisory_registration'&&registration.exact_scope_only===true,'REGISTRATION_SCOPE_MISMATCH');

    const safety=entry.safety??{};
    for(const key of ['prod_write','github_write','merge','push','issue_or_pr_mutation','workflow_dispatch','direct_tool_execution','customer_data','prod_data','external_skill_code_execution','trading','paid_fallback','permission_expansion','autonomous_business_prod_write']){
      add(errors,safety[key]===false,`ENTRY_SAFETY_${key.toUpperCase()}_NOT_FALSE`);
    }
    add(errors,Number(safety.additional_cost_eur)===0,'ENTRY_COST_NOT_ZERO');

    const pre=entry.preprod_evidence??{};
    add(errors,pre.workflow==='CEREBRO Skill Full Adoption V1'&&pre.status==='FULL_SAFE_PREPROD_GREEN','PREPROD_STATUS_MISMATCH');
    add(errors,pre.run_id===EXPECTED_PREPROD.run_id&&pre.head_sha===EXPECTED_PREPROD.head_sha&&pre.artifact_id===EXPECTED_PREPROD.artifact_id&&pre.artifact_digest===EXPECTED_PREPROD.artifact_digest,'PREPROD_EVIDENCE_MISMATCH');

    const canary=entry.prod_canary_evidence??{};
    add(errors,canary.workflow==='CEREBRO Skill Creator PROD Read-only Canary','CANARY_WORKFLOW_MISMATCH');
    add(errors,canary.status==='GREEN_SKILL_CREATOR_PROD_READONLY_CANARY','CANARY_STATUS_MISMATCH');
    add(errors,canary.tribunal_decision==='GREEN_FOR_CONTROLLED_READONLY_ADVISORY_PROMOTION_REVIEW','CANARY_TRIBUNAL_MISMATCH');
    add(errors,canary.run_id===EXPECTED_CANARY.run_id&&canary.head_sha===EXPECTED_CANARY.head_sha&&canary.artifact_id===EXPECTED_CANARY.artifact_id&&canary.artifact_digest===EXPECTED_CANARY.artifact_digest&&canary.observed_main_sha===EXPECTED_CANARY.observed_main_sha,'CANARY_EVIDENCE_MISMATCH');
    add(errors,canary.live_requests===2&&same(canary.allowed_http_methods,['GET']),'CANARY_READONLY_METHOD_SCOPE_MISMATCH');
    add(errors,canary.audit_chain_valid===true&&canary.rollback_proven===true&&canary.rebuild_proven===true,'CANARY_SAFETY_PROOF_MISSING');
    add(errors,Number(canary.measured_additional_cost_eur)===0,'CANARY_COST_NOT_ZERO');

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

export function resolveSkillCreatorReadonlyAdvisoryEntry(registry,technicalId){
  const validation=validateSkillCreatorReadonlyAdvisoryRegistry(registry);
  if(!validation.green) return Object.freeze({enabled:false,reason:'REGISTRY_VALIDATION_FAILED',errors:validation.errors,entry:null});
  if(technicalId!=='skill-creator') return Object.freeze({enabled:false,reason:'NOT_REGISTERED',errors:[],entry:null});
  return Object.freeze({enabled:true,reason:'ACTIVE_READONLY_ADVISORY',errors:[],entry:validation.entry});
}

export function loadAndValidateSkillCreatorRegistry(file=DEFAULT_REGISTRY){
  const registry=JSON.parse(fs.readFileSync(file,'utf8'));
  return validateSkillCreatorReadonlyAdvisoryRegistry(registry);
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const file=arg('--registry')??DEFAULT_REGISTRY;
  const output=arg('--output');
  const verdict=loadAndValidateSkillCreatorRegistry(file);
  const result={schema_version:'1.0.0',status:verdict.green?'GREEN_SKILL_CREATOR_PROD_READONLY_ADVISORY_REGISTERED':'HOLD_SKILL_CREATOR_PROD_READONLY_ADVISORY_REGISTRATION',green:verdict.green,environment:'PROD_READONLY_ADVISORY',technical_id:'skill-creator',alias_es:'Fábrica inteligente de skills',prod_write_authorized:false,github_write_authorized:false,direct_tool_execution_authorized:false,external_skill_code_execution_authorized:false,customer_data_authorized:false,trading_authorized:false,paid_fallback:false,additional_cost_eur:0,human_required:verdict.green?null:'HIGH_RISK',errors:verdict.errors};
  if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(result,null,2)}\n`,'utf8');}
  console.log(JSON.stringify(result));
  if(!verdict.green) process.exitCode=1;
}
