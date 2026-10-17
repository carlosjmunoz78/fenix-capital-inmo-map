import {authorizeDbSafeAction,classifyDbWorkload} from './db-safe-native-v1.mjs';
import {authorizedExecutionDeviceProfile} from './authorized-execution-device-profile-v1.mjs';
import {DURABLE_WORKER_RUNNER_V1_CONTRACT} from './durable-worker-runner-v1.mjs';
import {loadIdentityCredentialFoundation,identityCredentialAuditSummary} from '../governance/identity-credential-broker.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';
const SECRET_PATTERNS=[/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/,/\bsb_secret_[A-Za-z0-9_-]{8,}/,/\bAIza[A-Za-z0-9_-]{12,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];

function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_code_execution:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0});}
function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function source(value){return String(value??'').trim();}
function hasSecretMaterial(text){return SECRET_PATTERNS.some((re)=>re.test(text));}
function result(alias,company_id,checks,details={}){const green=Object.values(checks).every((v)=>v===true);return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_TECHNICAL_SPECIALIST_EVALUATION_V1',alias,company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,status:green?'SPECIALIST_GREEN':'SPECIALIST_HOLD',checks:Object.freeze(checks),details:Object.freeze(details),...authority()});}

export const TECHNICAL_SPECIALIST_ALIASES=Object.freeze(['ARQUITECTO','CODE','SYSTEMS','MATH','DATA','SECURITY','QA','INTEGRATOR']);
export const OPTIONAL_SPECIALIST_ALIASES=Object.freeze(['TECH_SCOUT','PERFORMANCE']);

export function technicalSpecialistRegistry(){return Object.freeze({
  schema_version:'1.0.0',state_type:'CEREBRO_TECHNICAL_SPECIALIST_REGISTRY_V1',company_id:'GLOBAL',engine_id:'FACT-001',environment:PREPROD,version:VERSION,
  specialists:Object.freeze([
    Object.freeze({alias:'ARQUITECTO',owner_engine_ids:Object.freeze(['ARCH-001','FACT-001']),mode:'REUSE_EXISTING'}),
    Object.freeze({alias:'CODE',owner_engine_ids:Object.freeze(['FACT-001','QA-001','REG-001']),mode:'SAFE_ENGINEERING_CORE'}),
    Object.freeze({alias:'SYSTEMS',owner_engine_ids:Object.freeze(['RUNTIME-001','JOB-001','ROUTE-001','DEP-001','DR-001','RBLD-001','OBSERV-001','QA-001']),mode:'SHARED_PLATFORM_ENGINEERING'}),
    Object.freeze({alias:'MATH',owner_engine_ids:Object.freeze(['OPT-001','SIM-001','DATA-001','FINOPS-001','EXP-001','QA-001']),mode:'DETERMINISTIC_SOLVER'}),
    Object.freeze({alias:'DATA',owner_engine_ids:Object.freeze(['DATA-001','DBOFF-001','STOROFF-001','API-001','CRM-001']),mode:'DB_SAFE_NATIVE'}),
    Object.freeze({alias:'SECURITY',owner_engine_ids:Object.freeze(['SEC-001','SEC-002','IAM-001','DPO-001','CMP-002','RED-001']),mode:'FAIL_CLOSED_SECURITY'}),
    Object.freeze({alias:'QA',owner_engine_ids:Object.freeze(['QA-001','EVA-001','JDG-001','REG-001']),mode:'EXISTING_EVALUATION_CORE'}),
    Object.freeze({alias:'INTEGRATOR',owner_engine_ids:Object.freeze(['FACT-001','INT-001','API-001','EVT-001','JOB-001']),mode:'UNIVERSAL_ACTIVATION_CORE'})
  ]),
  optional_specialists:Object.freeze([
    Object.freeze({alias:'TECH_SCOUT',owner_engine_ids:Object.freeze(['RSH-001','INN-001','FACT-001']),mode:'EXISTING_SCOUT_SURFACES'}),
    Object.freeze({alias:'PERFORMANCE',owner_engine_ids:Object.freeze(['OPT-001','QA-001','OBSERV-001','FINOPS-001']),mode:'PLANNED_EXTENSION'})
  ]),new_engine_required:false,...authority()
});}

export function evaluateSystemsSpecialist({company_id='fenix',source_text=''}={}){
  const company=req(company_id,'company_id'),text=source(source_text),worker=DURABLE_WORKER_RUNNER_V1_CONTRACT,execution=authorizedExecutionDeviceProfile();
  const sourceSemantic=/systems engineering|platform engineering|durable worker|job runner|runtime|linux|windows|docker|container|ci\/cd|deployment|network/i.test(text);
  const rollbackRebuild=/rollback/i.test(text)&&/rebuild|recovery|restore/i.test(text);
  const checks={
    source_semantic_consumed:sourceSemantic,
    no_prod_execution:worker.prod_writes===false&&execution.prod_authorized===false&&execution.prod_write_authorized===false,
    preprod_only:worker.environment===PREPROD&&execution.environment===PREPROD,
    bounded_concurrency:worker.bounded_concurrency===true&&worker.per_company_concurrency===true,
    retry_checkpoint_recovery:worker.checkpoint_resume===true&&worker.heartbeat_lease_extension===true&&worker.stale_lease_fail_closed===true&&worker.timeout_abort_signal===true,
    fail_closed_execution_route:execution.external_code_execution===false&&execution.captcha_bypass_allowed===false&&execution.mfa_bypass_allowed===false&&execution.trading_access===false,
    rollback_rebuild:sourceSemantic&&rollbackRebuild
  };
  return result('SYSTEMS',company,checks,{runtime_capability:worker.capability,execution_route_order:execution.execution_route_order,shared_runtime:true});
}

export function evaluateDataSpecialist({company_id='fenix',source_text=''}={}){
  const company=req(company_id,'company_id'),text=source(source_text);
  const sourceSemantic=/database|postgres|postgresql|sql|supabase|schema|query|row level security|\brls\b|migration/i.test(text);
  const base={company_id:company,engine_id:'DATA-001',environment:PREPROD,version:'1.0.0'};
  const inspect=authorizeDbSafeAction({...base,operation:'INSPECT',sql:'select table_name from information_schema.tables where table_schema = public'});
  const rls=authorizeDbSafeAction({...base,operation:'RLS_AUDIT'});
  const denyRlsDisable=authorizeDbSafeAction({...base,operation:'RLS_AUDIT',disable_rls:true});
  const deniedMutation=authorizeDbSafeAction({...base,operation:'MIGRATION_APPLY_PREPROD',sql:'create index if not exists idx_safe on example(company_id)',expected_schema_version:'v1',transactional:true,contracts_mapped:true,regression_green:true});
  const training=classifyDbWorkload({workload_class:'training'});
  const checks={
    source_semantic_consumed:sourceSemantic,
    no_db_write:inspect.authorized===true&&inspect.mutating===false&&deniedMutation.authorized===false,
    tenant_scope:inspect.company_id===company&&inspect.prod_mutation_authorized===false,
    rls_or_access_policy:rls.authorized===true&&denyRlsDisable.authorized===false&&/row level security|\brls\b|access policy|tenant/i.test(text),
    query_or_schema_evidence:sourceSemantic&&/query|schema|sql|table|index/i.test(text),
    backup_rollback_for_mutation_plan:/backup/i.test(text)&&/rollback|restore/i.test(text)&&deniedMutation.reasons.includes('BACKUP_REQUIRED')&&deniedMutation.reasons.includes('ROLLBACK_REQUIRED')
  };
  return result('DATA',company,checks,{read_action_id:inspect.action_id,rls_action_id:rls.action_id,training_offload:training.offload===true,db_safe_capability:'DB-SAFE-NATIVE'});
}

export function evaluateSecuritySpecialist({company_id='fenix',source_text=''}={}){
  const company=req(company_id,'company_id'),text=source(source_text);
  if(company!=='fenix')return result('SECURITY',company,{source_semantic_consumed:false,no_secret_exposure:false,least_privilege:false,threat_or_risk_evidence:false,fail_closed:false,no_authority_expansion:false},{reason:'CURRENT_IAM_FOUNDATION_IS_FENIX_SCOPED'});
  const sourceSemantic=/security|secure|threat|risk|least privilege|iam|identity|credential|secret management|privacy|gdpr|row level security|\brls\b/i.test(text);
  let foundation=null,summary=null,foundationGreen=false;
  try{foundation=loadIdentityCredentialFoundation();summary=identityCredentialAuditSummary({foundation});foundationGreen=true;}catch{foundationGreen=false;}
  const noSecret=!hasSecretMaterial(text)&&foundationGreen&&foundation.credentials?.invariants?.registry_contains_secret_values===false&&foundation.credentials?.invariants?.runtime_values_never_returned_by_broker_metadata_api===true;
  const leastPrivilege=foundationGreen&&foundation.identity?.default_decision==='DENY_UNREGISTERED_IDENTITY'&&foundation.credentials?.default_decision==='DENY_UNREGISTERED_CREDENTIAL_REFERENCE'&&foundation.connectors?.default_decision==='DENY_UNREGISTERED_CONNECTOR_AUTH';
  const checks={
    source_semantic_consumed:sourceSemantic,
    no_secret_exposure:sourceSemantic&&noSecret,
    least_privilege:sourceSemantic&&leastPrivilege,
    threat_or_risk_evidence:sourceSemantic&&/threat|risk|security|hardening|privacy/i.test(text),
    fail_closed:leastPrivilege,
    no_authority_expansion:foundationGreen&&summary?.prod_authorized===false&&summary?.prod_write_authorized===false&&summary?.trading_access===false&&Number(summary?.additional_cost_eur??0)===0
  };
  return result('SECURITY',company,checks,{iam_status:summary?.status??'IAM_UNAVAILABLE',identity_count:summary?.identity_count??0,credential_ref_count:summary?.credential_ref_count??0,connector_count:summary?.connector_count??0});
}
