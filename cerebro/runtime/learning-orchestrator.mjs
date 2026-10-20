import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {CADENCES,createCyclePlan,shouldRunHorizon} from './continuous-improvement-scheduler.mjs';

const PREPROD='PREPROD';
const ENGINE_ID='LRN-001';
const STATE_TYPE='CEREBRO_LRN_ORCHESTRATOR_STATE';
const STATE_SCHEMA_VERSION='1.0.0';
const HORIZONS=Object.freeze([CADENCES.DAILY,CADENCES.WEEKLY,CADENCES.MONTHLY]);
const SUPPORTED_STATE_VERSION_MIGRATIONS=Object.freeze(new Set(['0.5.0->0.6.0']));

function reqString(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});return dir;}
function atomicJson(file,value){ensureDir(path.dirname(file));const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{encoding:'utf8',mode:0o600});fs.renameSync(tmp,file);}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function iso(value){const d=new Date(value);if(Number.isNaN(d.getTime()))throw new Error('invalid now');return d.toISOString();}
function safeKey(value){return value.replace(/[^A-Za-z0-9._-]/g,'_');}
function horizonBucket(cadence,current){
  const d=new Date(current);
  if(cadence===CADENCES.DAILY)return d.toISOString().slice(0,10);
  if(cadence===CADENCES.MONTHLY)return d.toISOString().slice(0,7);
  if(cadence===CADENCES.WEEKLY){
    const utcMidnight=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
    const day=(d.getUTCDay()+6)%7;
    return new Date(utcMidnight-day*86400000).toISOString().slice(0,10);
  }
  throw new Error('unsupported horizon cadence');
}
function assertStateIdentity(state,{company_id}){
  if(!state||state.state_type!==STATE_TYPE)throw new Error('ORCHESTRATOR_STATE_TYPE_MISMATCH');
  if(state.company_id!==company_id||state.engine_id!==ENGINE_ID||state.environment!==PREPROD)throw new Error('ORCHESTRATOR_STATE_CONTEXT_MISMATCH');
}
function assertStateAuthority(state){
  if(state.prod_authorized!==false||state.prod_write_authorized!==false||state.trading_access!==false||Number(state.additional_cost_eur??0)!==0)throw new Error('ORCHESTRATOR_STATE_AUTHORITY_EXPANDED');
}
function normalizeLastSuccess(lastSuccess){
  const source=lastSuccess&&typeof lastSuccess==='object'?lastSuccess:{};
  const normalized={};
  for(const cadence of HORIZONS){const value=source[cadence]??null;if(value!==null&&Number.isNaN(Date.parse(value)))throw new Error(`invalid ${cadence} last_success`);normalized[cadence]=value===null?null:new Date(value).toISOString();}
  return Object.freeze(normalized);
}
function boundedMigrationHistory(value){
  if(!Array.isArray(value))return [];
  return value.filter((row)=>row&&typeof row==='object'&&typeof row.from_version==='string'&&typeof row.to_version==='string'&&typeof row.migrated_at==='string').slice(-7).map((row)=>Object.freeze({from_version:row.from_version,to_version:row.to_version,migrated_at:row.migrated_at,reason:String(row.reason??'RUNTIME_VERSION_COMPATIBILITY').slice(0,120)}));
}

export function initialOrchestratorState({company_id,version}){
  return Object.freeze({schema_version:STATE_SCHEMA_VERSION,state_type:STATE_TYPE,company_id:reqString(company_id,'company_id'),engine_id:ENGINE_ID,environment:PREPROD,version:reqString(version,'version'),last_success:{DAILY:null,WEEKLY:null,MONTHLY:null},plans_emitted:0,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});
}

export function migrateOrchestratorStateVersion(state,{company_id,version,now=new Date().toISOString()}){
  const targetVersion=reqString(version,'version');
  assertStateIdentity(state,{company_id:reqString(company_id,'company_id')});
  assertStateAuthority(state);
  const fromVersion=reqString(state.version,'state.version');
  const normalizedLastSuccess=normalizeLastSuccess(state.last_success);
  if(!Number.isInteger(Number(state.plans_emitted??0))||Number(state.plans_emitted??0)<0)throw new Error('invalid plans_emitted');
  if(fromVersion===targetVersion){
    if(state.last_success&&typeof state.last_success==='object')return state;
    return Object.freeze({...state,last_success:normalizedLastSuccess});
  }
  const transition=`${fromVersion}->${targetVersion}`;
  if(!SUPPORTED_STATE_VERSION_MIGRATIONS.has(transition))throw new Error(`ORCHESTRATOR_STATE_VERSION_MIGRATION_UNSUPPORTED:${transition}`);
  const migratedAt=iso(now);
  const history=[...boundedMigrationHistory(state.migration_history),Object.freeze({from_version:fromVersion,to_version:targetVersion,migrated_at:migratedAt,reason:'RUNTIME_VERSION_COMPATIBILITY'})].slice(-8);
  return Object.freeze({...state,schema_version:STATE_SCHEMA_VERSION,state_type:STATE_TYPE,company_id,engine_id:ENGINE_ID,environment:PREPROD,version:targetVersion,last_success:normalizedLastSuccess,plans_emitted:Number(state.plans_emitted??0),migration_history:Object.freeze(history),last_state_migration:Object.freeze(history.at(-1)),additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});
}

export function validateOrchestratorState(state,{company_id,version}){
  const expectedCompany=reqString(company_id,'company_id');const expectedVersion=reqString(version,'version');
  assertStateIdentity(state,{company_id:expectedCompany});
  if(state.version!==expectedVersion)throw new Error('ORCHESTRATOR_STATE_CONTEXT_MISMATCH');
  assertStateAuthority(state);
  if(!Number.isInteger(Number(state.plans_emitted??0))||Number(state.plans_emitted??0)<0)throw new Error('invalid plans_emitted');
  normalizeLastSuccess(state.last_success);
  return state;
}

export function planLearningHorizons({company_id,version,now,state}){
  const current=iso(now);const valid=validateOrchestratorState(state,{company_id,version});const due=[];
  const tasks={DAILY:'LEARNING_METRICS_AND_FAILURE_SCAN',WEEKLY:'METALEARN_BOTTLENECK_AND_SUPERVISOR_SCAN',MONTHLY:'KNOWLEDGE_OBSOLESCENCE_AND_POLICY_REVIEW'};
  for(const cadence of HORIZONS){
    if(!shouldRunHorizon({cadence,last_run_at:valid.last_success[cadence],now:current}))continue;
    const bucket=horizonBucket(cadence,current);
    const cycle=createCyclePlan({company_id,engine_id:ENGINE_ID,environment:PREPROD,version,cadence,now:current,checkpoint:{task:tasks[cadence],horizon_bucket:bucket},max_attempts:3,budget_eur:0});
    due.push(Object.freeze({...cycle,horizon_bucket:bucket,task:tasks[cadence],execution_authority:'PREPROD_PLAN_ONLY'}));
  }
  return Object.freeze({schema_version:'1.0.0',company_id,engine_id:ENGINE_ID,environment:PREPROD,version,planned_at:current,due_total:due.length,due:Object.freeze(due),event_path:'DIRECT_OUTBOX_TO_LRN',additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});
}

function sameImmutablePlan(existing,plan){
  return existing?.lock_key===plan.lock_key&&existing?.company_id===plan.company_id&&existing?.engine_id===plan.engine_id&&existing?.environment===plan.environment&&existing?.version===plan.version&&existing?.cadence===plan.cadence&&existing?.horizon_bucket===plan.horizon_bucket&&existing?.task===plan.task&&existing?.prod_authorized===false&&existing?.trading_access===false;
}

export function persistDueLearningPlans({state_file,plans_dir,company_id,version,now}){
  const statePath=path.resolve(reqString(state_file,'state_file'));const plansRoot=path.resolve(reqString(plans_dir,'plans_dir'));
  ensureDir(path.dirname(statePath));ensureDir(plansRoot);
  let state=fs.existsSync(statePath)?readJson(statePath):initialOrchestratorState({company_id,version});
  state=migrateOrchestratorStateVersion(state,{company_id,version,now});
  state=validateOrchestratorState(state,{company_id,version});
  const planned=planLearningHorizons({company_id,version,now,state});
  let created=0;
  for(const plan of planned.due){
    const file=path.join(plansRoot,`${safeKey(plan.lock_key)}.json`);
    if(fs.existsSync(file)){
      const existing=readJson(file);
      if(!sameImmutablePlan(existing,plan))throw new Error(`ORCHESTRATOR_PLAN_CONFLICT: ${plan.lock_key}`);
      continue;
    }
    fs.writeFileSync(file,`${JSON.stringify(plan,null,2)}\n`,{encoding:'utf8',mode:0o600,flag:'wx'});created+=1;
  }
  const next={...state,plans_emitted:Number(state.plans_emitted??0)+created,last_planned_at:planned.planned_at,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false};
  atomicJson(statePath,next);
  return Object.freeze({status:'ORCHESTRATOR_GREEN',planned_total:planned.due_total,created_total:created,plans:planned.due,state:next,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
}

export function recordLearningHorizonResult({state_file,company_id,version,cadence,status,completed_at}){
  if(!HORIZONS.includes(cadence))throw new Error('unsupported horizon cadence');
  if(!['GREEN','PARTIAL_HELD'].includes(status))throw new Error('only successful/held-safe horizon may advance clock');
  const statePath=path.resolve(reqString(state_file,'state_file'));if(!fs.existsSync(statePath))throw new Error('orchestrator state missing');
  const migrated=migrateOrchestratorStateVersion(readJson(statePath),{company_id,version,now:completed_at});
  const state=validateOrchestratorState(migrated,{company_id,version});const when=iso(completed_at);
  const next={...state,last_success:{...state.last_success,[cadence]:when},last_result:{cadence,status,completed_at:when},additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false};
  atomicJson(statePath,next);return Object.freeze(next);
}
