import crypto from 'node:crypto';

export const DB_SAFE_NATIVE_VERSION='1.0.0';
export const DB_SAFE_NATIVE_ROUTE='capability://DB-SAFE-NATIVE/v1/execute';
export const DB_SAFE_OPERATIONS=Object.freeze(['INSPECT','RLS_AUDIT','PERFORMANCE_AUDIT','MIGRATION_PLAN','INDEX_PLAN','MIGRATION_APPLY_PREPROD','ROLLBACK_PREPROD']);
const MUTATING=new Set(['MIGRATION_APPLY_PREPROD','ROLLBACK_PREPROD']);
const DESTRUCTIVE=[/\bdrop\s+(database|schema)\b/i,/\btruncate\b/i,/\balter\s+table\b[\s\S]*\bdisable\s+row\s+level\s+security\b/i,/\bdelete\s+from\s+[^;]+(?:;|$)/i,/\bupdate\s+[^;]+\s+set\s+[^;]+(?:;|$)/i,/\bgrant\s+.+\b(superuser|bypassrls)\b/i];
function text(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim();}
function sha(v){return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');}
function sqlUnsafe(sql=''){if(typeof sql!=='string')return false; if(/\bdelete\s+from\b/i.test(sql)&&! /\bwhere\b/i.test(sql))return true; if(/\bupdate\b/i.test(sql)&&! /\bwhere\b/i.test(sql))return true; return DESTRUCTIVE.slice(0,3).some(r=>r.test(sql))||DESTRUCTIVE.slice(5).some(r=>r.test(sql));}
export function classifyDbWorkload(raw={}){const k=String(raw.workload_class??'transactional').toLowerCase();const offload=['research','training','heavy_logs','ocr','simulation','long_job','experiment'].includes(k);return Object.freeze({workload_class:k,preferred_store:offload?'OFFLOAD_REQUIRED_OR_PREFERRED':'SUPABASE_TRANSACTIONAL_CORE_OK',offload});}
export function authorizeDbSafeAction(raw={}){
 const company_id=text(raw.company_id,'company_id'), engine_id=raw.engine_id??'DATA-001', environment=raw.environment??'PREPROD', version=raw.version??DB_SAFE_NATIVE_VERSION, operation=text(raw.operation,'operation');
 if(!DB_SAFE_OPERATIONS.includes(operation))throw new Error('UNSUPPORTED_DB_OPERATION'); if(MUTATING.has(operation)&&environment!=='PREPROD')throw new Error('PREPROD_ONLY_MUTATION');
 const sql=raw.sql??''; const workload=classifyDbWorkload(raw); const reasons=[]; let authorized=true;
 if(sqlUnsafe(sql)){authorized=false;reasons.push('DESTRUCTIVE_OR_BROAD_SQL_DENIED');}
 if(raw.disable_rls===true){authorized=false;reasons.push('RLS_DISABLE_DENIED');}
 if(MUTATING.has(operation)){
  if(raw.backup_ready!==true){authorized=false;reasons.push('BACKUP_REQUIRED');}
  if(raw.rollback_ready!==true||!raw.rollback_sql){authorized=false;reasons.push('ROLLBACK_REQUIRED');}
  if(raw.regression_green!==true){authorized=false;reasons.push('REGRESSION_GREEN_REQUIRED');}
  if(raw.contracts_mapped!==true){authorized=false;reasons.push('CONTRACT_MAP_REQUIRED');}
  if(raw.transactional!==true){authorized=false;reasons.push('TRANSACTION_REQUIRED');}
  if(!raw.expected_schema_version){authorized=false;reasons.push('EXPECTED_SCHEMA_VERSION_REQUIRED');}
 }
 if(raw.prod_mutation===true){authorized=false;reasons.push('PROD_MUTATION_DENIED');}
 if(raw.cross_company===true){authorized=false;reasons.push('CROSS_COMPANY_DENIED');}
 if(workload.offload&&MUTATING.has(operation)){authorized=false;reasons.push('HEAVY_AUXILIARY_WORKLOAD_OFFLOAD_REQUIRED');}
 const action_id=`dbsafe:${sha({company_id,engine_id,environment,operation,sql,expected:raw.expected_schema_version??null}).slice(0,28)}`;
 return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_DB_SAFE_NATIVE_AUTHORIZATION',capability_id:'DB-SAFE-NATIVE',company_id,engine_id,environment,version,operation,action_id,idempotency_key:sha({action_id,version}),authorized,reasons:Object.freeze(reasons),mutating:MUTATING.has(operation),workload,backup_ready:raw.backup_ready===true,rollback_ready:raw.rollback_ready===true,regression_green:raw.regression_green===true,contracts_mapped:raw.contracts_mapped===true,expected_schema_version:raw.expected_schema_version??null,prod_mutation_authorized:false,additional_cost_eur:0});
}
export async function executeDbSafeAction(raw={},adapter={}){const auth=authorizeDbSafeAction(raw);if(!auth.authorized)return Object.freeze({...auth,status:'DENIED',executed:false});const fn=adapter[auth.operation];if(typeof fn!=='function')return Object.freeze({...auth,status:'ROUTE_READY',executed:false,next_gate:'AUTHORIZED_DB_ADAPTER'});const result=await fn(Object.freeze({...raw,authorization:auth}));return Object.freeze({...auth,status:'EXECUTED_PREPROD_CONTROL_PLANE',executed:true,result,receipt_hash:sha({auth,result})});}
