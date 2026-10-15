import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const EXPECTED=Object.freeze({
  candidate_id:'lobehub-skills:9a6e3fac20369220df43',technical_name:'obsidian',company_id:'GLOBAL',engine_id:'FACT-001',environment:'PREPROD',
  upstream_repository:'openclaw/openclaw',pinned_commit:'b300e0edea5e3e1b0aee58a33e188711380d8e22',manifest_path:'skills/obsidian/SKILL.md',manifest_sha256:'d4ed3ce53146bd6538c47f81da2382fc790598ec1400d34b7d1f73a8839053b4',
  wrapper_id:'skillwrap:cerebro-obsidian-v0.1.0',bindings:Object.freeze(['RSH-001','KNW-001','TRN-001','TRNBOOT-001','RAG-001','PRV-001'])
});
const SAFETY_FALSE=Object.freeze(['prod_write','prod_mutation','auto_merge','customer_data','external_skill_code_execution','live_obsidian_cli_execution','filesystem_write','canonical_knowledge_migration','trading','paid_fallback','permission_expansion','autonomous_prod_promotion']);

function push(errors,condition,message){if(!condition) errors.push(message);}
function exact(value,expected){return Array.isArray(value)&&value.length===expected.length&&value.every((item,index)=>item===expected[index]);}
function load(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function repositoryFileExists(value){
  if(typeof value!=='string'||!value.trim()) return false;
  const resolved=path.isAbsolute(value)?value:path.resolve(REPO_ROOT,value);
  return fs.existsSync(resolved);
}

export function validateObsidianFullClosure({closure,adoptionRegistry,integrationReport,fileExists=repositoryFileExists}={}){
  const errors=[];
  push(errors,closure?.state_type==='CEREBRO_SKILL_FULL_SAFE_PREPROD_CLOSURE','INVALID_CLOSURE_STATE_TYPE');
  push(errors,closure?.candidate_id===EXPECTED.candidate_id,'CANDIDATE_MISMATCH');
  push(errors,closure?.technical_name===EXPECTED.technical_name,'TECHNICAL_NAME_MISMATCH');
  push(errors,closure?.company_id===EXPECTED.company_id,'COMPANY_ID_MISMATCH');
  push(errors,closure?.engine_id===EXPECTED.engine_id,'OWNER_ENGINE_MISMATCH');
  push(errors,closure?.environment===EXPECTED.environment,'ENVIRONMENT_MUST_BE_PREPROD');
  push(errors,closure?.human_required==null,'UNEXPECTED_HUMAN_REQUIRED');
  push(errors,Number(closure?.additional_cost_eur)===0,'NONZERO_ADDITIONAL_COST');
  push(errors,closure?.promotion_authorized===false,'PROMOTION_MUST_REMAIN_FALSE');
  push(errors,closure?.prod_authorized===false,'PROD_AUTHORITY_MUST_REMAIN_FALSE');
  push(errors,exact(closure?.target_engine_bindings,EXPECTED.bindings),'TARGET_BINDINGS_DRIFT');
  push(errors,closure?.runtime_cadence?.cadence_applicable===false,'OBSIDIAN_CADENCE_MUST_BE_REQUEST_DRIVEN');

  const provenance=closure?.provenance??{};
  push(errors,provenance.upstream_repository===EXPECTED.upstream_repository,'UPSTREAM_REPOSITORY_MISMATCH');
  push(errors,provenance.pinned_commit===EXPECTED.pinned_commit,'PINNED_COMMIT_MISMATCH');
  push(errors,provenance.manifest_path===EXPECTED.manifest_path,'MANIFEST_PATH_MISMATCH');
  push(errors,provenance.manifest_sha256===EXPECTED.manifest_sha256,'MANIFEST_HASH_MISMATCH');
  push(errors,provenance.provenance_and_license_status==='GREEN_FROZEN_ADMISSION_EVIDENCE','PROVENANCE_LICENSE_NOT_GREEN');

  const wrapper=closure?.safe_internal_wrapper??{};
  push(errors,wrapper.wrapper_id===EXPECTED.wrapper_id,'WRAPPER_ID_MISMATCH');
  push(errors,wrapper.external_upstream_code_execution===false,'EXTERNAL_UPSTREAM_EXECUTION_FORBIDDEN');
  push(errors,wrapper.live_obsidian_cli_execution===false,'LIVE_OBSIDIAN_CLI_FORBIDDEN');
  push(errors,wrapper.filesystem_write===false,'FILESYSTEM_WRITE_FORBIDDEN');
  push(errors,wrapper.policy_precedence==='CEREBRO_POLICY_WINS','POLICY_PRECEDENCE_MISMATCH');
  push(errors,typeof wrapper.path==='string'&&fileExists(wrapper.path),'WRAPPER_PATH_MISSING');

  const queue=Array.isArray(adoptionRegistry?.queue)?adoptionRegistry.queue:[];
  const item=queue.find((entry)=>entry?.candidate_id===EXPECTED.candidate_id);
  push(errors,Boolean(item),'QUEUE_ITEM_MISSING');
  push(errors,item?.target_status==='FULL_SAFE_PREPROD','QUEUE_TARGET_STATUS_MISMATCH');
  push(errors,item?.human_required==null,'QUEUE_UNEXPECTED_HUMAN_REQUIRED');
  push(errors,exact(item?.target_engine_bindings,EXPECTED.bindings),'QUEUE_BINDINGS_DRIFT');
  if(item?.status==='FULL_SAFE_PREPROD'){
    push(errors,closure?.status==='FULL_SAFE_PREPROD','QUEUE_FULL_REQUIRES_FULL_CLOSURE');
    push(errors,closure?.validation_status==='CI_GREEN','QUEUE_FULL_REQUIRES_CI_GREEN');
    push(errors,Number.isSafeInteger(closure?.validated_by?.run_id)&&closure.validated_by.run_id>0,'QUEUE_FULL_REQUIRES_RUN_ID');
    push(errors,typeof closure?.validated_by?.head_sha==='string'&&closure.validated_by.head_sha.length===40,'QUEUE_FULL_REQUIRES_HEAD_SHA');
    push(errors,closure?.validated_by?.conclusion==='success','QUEUE_FULL_REQUIRES_SUCCESS');
  }else{
    push(errors,closure?.status==='READY_FOR_FULL_SAFE_PREPROD_VALIDATION','PRE_PROMOTION_CLOSURE_STATUS_INVALID');
  }

  for(const key of SAFETY_FALSE) push(errors,closure?.safety?.[key]===false,`UNSAFE_FLAG:${key}`);
  const required=closure?.required_closure??{};
  for(const [key,value] of Object.entries(required)) push(errors,value===true,`REQUIRED_CLOSURE_NOT_GREEN:${key}`);
  const refs=closure?.evidence_refs??{};
  for(const key of ['normalized_wrapper_review','old_vs_new','admission_judge','admission_tribunal','per_engine_bindings','binding_judge','binding_tribunal','full_preprod_integration','operational_ledgers','learning_ingress','full_adoption_policy']) push(errors,typeof refs[key]==='string'&&fileExists(refs[key]),`EVIDENCE_REF_MISSING:${key}`);

  const knowledge=closure?.knowledge_boundary??{};
  push(errors,exact(knowledge.canonical_structural_owners_preserved,['KNW-001','RAG-001','PRV-001','UPD-001']),'CANONICAL_KNOWLEDGE_OWNER_DRIFT');
  push(errors,knowledge.notion_replaced===false,'NOTION_REPLACEMENT_FORBIDDEN');
  push(errors,knowledge.rag_replaced===false,'RAG_REPLACEMENT_FORBIDDEN');
  push(errors,knowledge.canonical_knowledge_migration_authorized===false,'KNOWLEDGE_MIGRATION_FORBIDDEN');
  push(errors,knowledge.real_obsidian_vault_required_for_full_safe_preprod===false,'REAL_VAULT_MUST_NOT_BE_REQUIRED');

  const report=integrationReport??{};
  push(errors,report.status==='PREPROD_INTEGRATION_COMPLETE','PREPROD_INTEGRATION_NOT_COMPLETE');
  push(errors,report.candidate_id===EXPECTED.candidate_id,'INTEGRATION_CANDIDATE_MISMATCH');
  push(errors,report.company_id===EXPECTED.company_id,'INTEGRATION_COMPANY_MISMATCH');
  push(errors,report.environment===EXPECTED.environment,'INTEGRATION_ENVIRONMENT_MISMATCH');
  push(errors,exact(report.target_engine_bindings,EXPECTED.bindings),'INTEGRATION_BINDINGS_DRIFT');
  push(errors,report.binding_count===EXPECTED.bindings.length,'INTEGRATION_BINDING_COUNT_MISMATCH');
  push(errors,report.binding_report_status==='GREEN_PREPROD_BINDINGS_ALL_RELEVANT_ENGINES','BINDING_REPORT_NOT_GREEN');
  push(errors,report.binding_judge_decision==='GREEN_FOR_BINDING_TRIBUNAL','BINDING_JUDGE_NOT_GREEN');
  push(errors,report.binding_tribunal_decision==='GREEN_BINDINGS_FOR_FULL_BUILDOUT','BINDING_TRIBUNAL_NOT_GREEN');
  push(errors,report.durable_binding_receipts?.first_persisted===6,'DURABLE_BINDING_FIRST_PASS_MISMATCH');
  push(errors,report.durable_binding_receipts?.replay_duplicates===6,'DURABLE_BINDING_REPLAY_MISMATCH');
  push(errors,report.durable_binding_receipts?.operation_count===6,'DURABLE_BINDING_OPERATION_COUNT_MISMATCH');
  push(errors,report.durable_binding_receipts?.idempotency_proven===true,'DURABLE_BINDING_IDEMPOTENCY_NOT_PROVEN');
  push(errors,Number(report.observability_records)>=12,'OBSERVABILITY_NOT_CONNECTED');
  push(errors,Number(report.audit_records)>=12,'AUDIT_NOT_CONNECTED');
  push(errors,report.audit_chain_valid===true,'AUDIT_CHAIN_INVALID');
  push(errors,Number(report.finops_records)>=12,'FINOPS_NOT_CONNECTED');
  push(errors,Number(report.measured_additional_cost_eur)===0,'FINOPS_COST_NONZERO');
  push(errors,report.lrn001_feedback?.first_status==='GREEN_PERSISTENT_PREPROD_LEARNING','LRN_FIRST_PASS_NOT_GREEN');
  push(errors,report.lrn001_feedback?.first_persisted===6,'LRN_FIRST_PERSISTENCE_MISMATCH');
  push(errors,report.lrn001_feedback?.first_duplicates===0,'LRN_FIRST_DUPLICATE_MISMATCH');
  push(errors,report.lrn001_feedback?.replay_status==='GREEN_PERSISTENT_PREPROD_LEARNING','LRN_REPLAY_NOT_GREEN');
  push(errors,report.lrn001_feedback?.replay_persisted===0,'LRN_REPLAY_PERSISTED_AGAIN');
  push(errors,report.lrn001_feedback?.replay_duplicates===6,'LRN_REPLAY_DUPLICATE_MISMATCH');
  push(errors,report.lrn001_feedback?.held_total===0,'LRN_HELD_EVIDENCE');
  push(errors,Array.isArray(report.lrn001_feedback?.human_required)&&report.lrn001_feedback.human_required.length===0,'LRN_UNEXPECTED_HUMAN_REQUIRED');
  push(errors,report.lrn001_feedback?.idempotency_proven===true,'LRN_IDEMPOTENCY_NOT_PROVEN');
  push(errors,report.lrn001_feedback?.supabase_required===false,'LRN_SHOULD_NOT_REQUIRE_SUPABASE');
  push(errors,report.rollback_proven===true&&report.rebuild_default_disabled===true&&report.final_binding_state==='DISABLED','ROLLBACK_REBUILD_NOT_PROVEN');
  push(errors,report.binding_activation_authorized===false,'BINDING_ACTIVATION_AUTHORITY_DRIFT');
  push(errors,report.canonical_knowledge_replaced===false&&report.notion_or_rag_migration_authorized===false&&report.real_vault_used===false,'KNOWLEDGE_BOUNDARY_REGRESSION');
  for(const key of ['filesystem_write','external_skill_code_execution','live_obsidian_cli_execution','customer_data_used','prod_data_used','prod_authorized','prod_write_authorized','trading_access','paid_fallback','permission_expansion','autonomous_prod_promotion']) push(errors,report[key]===false,`INTEGRATION_UNSAFE_FLAG:${key}`);
  push(errors,Number(report.additional_cost_eur)===0,'INTEGRATION_NONZERO_COST');
  push(errors,report.human_required==null,'INTEGRATION_UNEXPECTED_HUMAN_REQUIRED');

  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_OBSIDIAN_FULL_CLOSURE_VALIDATION',candidate_id:EXPECTED.candidate_id,environment:EXPECTED.environment,target_engine_bindings:[...EXPECTED.bindings],status:errors.length?'HOLD':'READY_TO_PROMOTE_QUEUE',errors,prod_write_authorized:false,trading_access:false,external_skill_code_execution_authorized:false,additional_cost_eur:0});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const closurePath=arg('--closure')??'cerebro/registry/skill-obsidian-full-safe-preprod.v1.json';
  const registryPath=arg('--registry')??'cerebro/registry/skill-full-adoption-v1.json';
  const integrationPath=arg('--preprod-report');
  const output=arg('--output')??'artifacts/skills-full/obsidian/closure-validation.json';
  if(!integrationPath) throw new Error('PREPROD_REPORT_REQUIRED');
  const report=validateObsidianFullClosure({closure:load(closurePath),adoptionRegistry:load(registryPath),integrationReport:load(integrationPath)});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify(report));
  if(report.status!=='READY_TO_PROMOTE_QUEUE') process.exitCode=1;
}
