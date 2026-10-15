import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DEFAULT_REGISTRY=path.join(ROOT,'cerebro/registry/autonomous-readonly-skills.v1.json');
const EXPECTED_BINDINGS=Object.freeze(['RSH-001','KNW-001','TRN-001','TRNBOOT-001','RAG-001','PRV-001']);
const EXPECTED_CAPABILITIES=Object.freeze(['KNOWLEDGE_READ_SEARCH_ADVISORY','KNOWLEDGE_LINK_ANALYSIS_ADVISORY']);
const EXPECTED_PREPROD=Object.freeze({run_id:38816670501,head_sha:'8cafae8088c60c90582a2a271a8b88997ee7b3f0',artifact_id:12010728219,artifact_digest:'sha256:40c012ea12b5b39db4f6965b47a5e7ad12edc80ac6244653ca3ca83da1011bcb'});
const EXPECTED_CANARY=Object.freeze({run_id:38819180037,head_sha:'7ac4aa8bf266e9b60f3aba7d98e044f69454b5af',artifact_id:12012247140,artifact_digest:'sha256:529bd5dc087bb291bae187397541cea3cbbc4bad90e60831801a0687b0e52f56',observed_main_sha:'63f83f6bedf90898fc0737ff6d5f37dd815d86e6'});

function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function add(errors,condition,code){if(!condition) errors.push(code);}

export function validateObsidianReadonlyAdvisoryRegistry(registry){
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

  const entry=registry?.entries?.obsidian;
  add(errors,Boolean(entry),'OBSIDIAN_ENTRY_MISSING');
  if(entry){
    add(errors,entry.alias_es==='Asistente seguro de conocimiento en Obsidian','ALIAS_MISMATCH');
    add(errors,entry.technical_id==='obsidian','TECHNICAL_ID_MISMATCH');
    add(errors,entry.candidate_id==='lobehub-skills:9a6e3fac20369220df43','CANDIDATE_MISMATCH');
    add(errors,entry.wrapper_id==='skillwrap:cerebro-obsidian-v0.1.0','WRAPPER_MISMATCH');
    add(errors,entry.status==='ACTIVE_READONLY_ADVISORY','ENTRY_NOT_ACTIVE_READONLY');
    add(errors,entry.execution_mode==='PROD_READONLY_ADVISORY','ENTRY_MODE_MISMATCH');
    add(errors,entry.company_id==='GLOBAL'&&entry.engine_id==='FACT-001'&&entry.environment==='PROD_READONLY_ADVISORY','ENTRY_CONTEXT_MISMATCH');
    add(errors,entry.approved_upstream_full_name==='openclaw/openclaw','UPSTREAM_MISMATCH');
    add(errors,entry.approved_manifest_path==='skills/obsidian/SKILL.md','MANIFEST_PATH_MISMATCH');
    add(errors,entry.approved_upstream_commit==='b300e0edea5e3e1b0aee58a33e188711380d8e22','UPSTREAM_COMMIT_MISMATCH');
    add(errors,entry.approved_manifest_sha256==='d4ed3ce53146bd6538c47f81da2382fc790598ec1400d34b7d1f73a8839053b4','MANIFEST_DIGEST_MISMATCH');
    add(errors,same(entry.target_engine_bindings,EXPECTED_BINDINGS),'ENGINE_BINDINGS_MISMATCH');
    add(errors,same(entry.allowed_capabilities,EXPECTED_CAPABILITIES),'CAPABILITIES_SCOPE_MISMATCH');
    add(errors,entry.mutation_gate==='HIGH_RISK','MUTATION_GATE_MISMATCH');

    const safety=entry.safety??{};
    for(const key of ['prod_write','filesystem_write','live_obsidian_cli_execution','real_vault_used','canonical_knowledge_migration','notion_or_rag_replacement','customer_data','prod_data','external_skill_code_execution','github_business_mutation','trading','paid_fallback','permission_expansion','autonomous_business_prod_write']){
      add(errors,safety[key]===false,`ENTRY_SAFETY_${key.toUpperCase()}_NOT_FALSE`);
    }
    add(errors,Number(safety.additional_cost_eur)===0,'ENTRY_COST_NOT_ZERO');

    const pre=entry.preprod_evidence??{};
    add(errors,pre.workflow==='CEREBRO Skill Full Adoption V1'&&pre.status==='FULL_SAFE_PREPROD_GREEN','PREPROD_STATUS_MISMATCH');
    add(errors,pre.run_id===EXPECTED_PREPROD.run_id&&pre.head_sha===EXPECTED_PREPROD.head_sha&&pre.artifact_id===EXPECTED_PREPROD.artifact_id&&pre.artifact_digest===EXPECTED_PREPROD.artifact_digest,'PREPROD_EVIDENCE_MISMATCH');

    const canary=entry.prod_canary_evidence??{};
    add(errors,canary.workflow==='CEREBRO Obsidian PROD Read-only Canary','CANARY_WORKFLOW_MISMATCH');
    add(errors,canary.status==='GREEN_OBSIDIAN_PROD_READONLY_CANARY','CANARY_STATUS_MISMATCH');
    add(errors,canary.tribunal_decision==='GREEN_FOR_OBSIDIAN_PROD_READONLY_ADVISORY_REGISTRATION','CANARY_TRIBUNAL_MISMATCH');
    add(errors,canary.run_id===EXPECTED_CANARY.run_id&&canary.head_sha===EXPECTED_CANARY.head_sha&&canary.artifact_id===EXPECTED_CANARY.artifact_id&&canary.artifact_digest===EXPECTED_CANARY.artifact_digest&&canary.observed_main_sha===EXPECTED_CANARY.observed_main_sha,'CANARY_EVIDENCE_MISMATCH');
    add(errors,canary.live_requests===2&&same(canary.allowed_http_methods,['GET']),'CANARY_READONLY_METHOD_SCOPE_MISMATCH');
    add(errors,canary.audit_chain_valid===true&&canary.rollback_proven===true&&canary.rebuild_proven===true,'CANARY_SAFETY_PROOF_MISSING');
    add(errors,Number(canary.measured_additional_cost_eur)===0,'CANARY_COST_NOT_ZERO');

    const activation=entry.activation??{};
    add(errors,activation.registry_authority==='READONLY_ADVISORY_ONLY','ACTIVATION_AUTHORITY_MISMATCH');
    add(errors,activation.fail_closed===true,'ACTIVATION_NOT_FAIL_CLOSED');
    add(errors,activation.rollback_state==='DISABLED'&&activation.rebuild_default==='DISABLED','ACTIVATION_ROLLBACK_REBUILD_MISMATCH');
    add(errors,activation.prod_write_authorized===false,'ACTIVATION_PROD_WRITE_NOT_FALSE');
    add(errors,activation.canonical_knowledge_migration_authorized===false,'ACTIVATION_MIGRATION_NOT_FALSE');
    add(errors,activation.human_required_for_mutation==='HIGH_RISK','ACTIVATION_MUTATION_GATE_MISMATCH');
  }
  return Object.freeze({green:errors.length===0,errors,entry:errors.length===0?entry:null});
}

export function resolveReadonlyAdvisoryEntry(registry,technicalId){
  const validation=validateObsidianReadonlyAdvisoryRegistry(registry);
  if(!validation.green) return Object.freeze({enabled:false,reason:'REGISTRY_VALIDATION_FAILED',errors:validation.errors,entry:null});
  if(technicalId!=='obsidian') return Object.freeze({enabled:false,reason:'NOT_REGISTERED',errors:[],entry:null});
  return Object.freeze({enabled:true,reason:'ACTIVE_READONLY_ADVISORY',errors:[],entry:validation.entry});
}

export function loadAndValidateRegistry(file=DEFAULT_REGISTRY){
  const registry=JSON.parse(fs.readFileSync(file,'utf8'));
  return validateObsidianReadonlyAdvisoryRegistry(registry);
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const file=arg('--registry')??DEFAULT_REGISTRY;
  const output=arg('--output');
  const verdict=loadAndValidateRegistry(file);
  const result={schema_version:'1.0.0',status:verdict.green?'GREEN_OBSIDIAN_PROD_READONLY_ADVISORY_REGISTERED':'HOLD_OBSIDIAN_PROD_READONLY_ADVISORY_REGISTRATION',green:verdict.green,environment:'PROD_READONLY_ADVISORY',technical_id:'obsidian',alias_es:'Asistente seguro de conocimiento en Obsidian',prod_write_authorized:false,filesystem_write_authorized:false,live_obsidian_cli_authorized:false,canonical_knowledge_migration_authorized:false,external_skill_code_execution_authorized:false,customer_data_authorized:false,trading_authorized:false,paid_fallback:false,additional_cost_eur:0,human_required:verdict.green?null:'HIGH_RISK',errors:verdict.errors};
  if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(result,null,2)}\n`,'utf8');}
  console.log(JSON.stringify(result));
  if(!verdict.green) process.exitCode=1;
}
