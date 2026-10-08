import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {CADENCES,createCyclePlan,shouldRunHorizon} from './continuous-improvement-scheduler.mjs';

const PREPROD='PREPROD';
const ENGINE_ID='LRN-001';
const HORIZONS=Object.freeze([CADENCES.DAILY,CADENCES.WEEKLY,CADENCES.MONTHLY]);

function reqString(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});return dir;}
function atomicJson(file,value){ensureDir(path.dirname(file));const tmp=`${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;fs.writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`,{encoding:'utf8',mode:0o600});fs.renameSync(tmp,file);}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function iso(value){const d=new Date(value);if(Number.isNaN(d.getTime()))throw new Error('invalid now');return d.toISOString();}
function safeKey(value){return value.replace(/[^A-Za-z0-9._-]/g,'_');}

export function initialOrchestratorState({company_id,version}){
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_LRN_ORCHESTRATOR_STATE',company_id:reqString(company_id,'company_id'),engine_id:ENGINE_ID,environment:PREPROD,version:reqString(version,'version'),last_success:{DAILY:null,WEEKLY:null,MONTHLY:null},plans_emitted:0,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});
}

export function validateOrchestratorState(state,{company_id,version}){
  if(!state||state.company_id!==company_id||state.engine_id!==ENGINE_ID||state.environment!==PREPROD||state.version!==version)throw new Error('ORCHESTRATOR_STATE_CONTEXT_MISMATCH');
  if(state.prod_authorized!==false||state.prod_write_authorized!==false||state.trading_access!==false)throw new Error('ORCHESTRATOR_STATE_AUTHORITY_EXPANDED');
  for(const cadence of HORIZONS){const value=state.last_success?.[cadence]??null;if(value!==null&&Number.isNaN(Date.parse(value)))throw new Error(`invalid ${cadence} last_success`);}
  return state;
}

export function planLearningHorizons({company_id,version,now,state}){
  const current=iso(now);const valid=validateOrchestratorState(state,{company_id,version});const due=[];
  const tasks={DAILY:'LEARNING_METRICS_AND_FAILURE_SCAN',WEEKLY:'METALEARN_BOTTLENECK_AND_SUPERVISOR_SCAN',MONTHLY:'KNOWLEDGE_OBSOLESCENCE_AND_POLICY_REVIEW'};
  for(const cadence of HORIZONS){
    if(!shouldRunHorizon({cadence,last_run_at:valid.last_success[cadence],now:current}))continue;
    const cycle=createCyclePlan({company_id,engine_id:ENGINE_ID,environment:PREPROD,version,cadence,now:current,checkpoint:{task:tasks[cadence],state_plans_emitted:valid.plans_emitted},max_attempts:3,budget_eur:0});
    due.push(Object.freeze({...cycle,task:tasks[cadence],execution_authority:'PREPROD_PLAN_ONLY'}));
  }
  return Object.freeze({schema_version:'1.0.0',company_id,engine_id:ENGINE_ID,environment:PREPROD,version,planned_at:current,due_total:due.length,due:Object.freeze(due),event_path:'DIRECT_OUTBOX_TO_LRN',additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});
}

export function persistDueLearningPlans({state_file,plans_dir,company_id,version,now}){
  const statePath=path.resolve(reqString(state_file,'state_file'));const plansRoot=path.resolve(reqString(plans_dir,'plans_dir'));
  ensureDir(path.dirname(statePath));ensureDir(plansRoot);
  let state=fs.existsSync(statePath)?readJson(statePath):initialOrchestratorState({company_id,version});
  state=validateOrchestratorState(state,{company_id,version});
  const planned=planLearningHorizons({company_id,version,now,state});
  let created=0;
  for(const plan of planned.due){
    const file=path.join(plansRoot,`${safeKey(plan.lock_key)}.json`);
    const text=`${JSON.stringify(plan,null,2)}\n`;
    if(fs.existsSync(file)){
      if(fs.readFileSync(file,'utf8')!==text)throw new Error(`ORCHESTRATOR_PLAN_CONFLICT: ${plan.lock_key}`);
      continue;
    }
    fs.writeFileSync(file,text,{encoding:'utf8',mode:0o600,flag:'wx'});created+=1;
  }
  const next={...state,plans_emitted:Number(state.plans_emitted??0)+created,last_planned_at:planned.planned_at,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false};
  atomicJson(statePath,next);
  return Object.freeze({status:'ORCHESTRATOR_GREEN',planned_total:planned.due_total,created_total:created,plans:planned.due,state:next,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
}

export function recordLearningHorizonResult({state_file,company_id,version,cadence,status,completed_at}){
  if(!HORIZONS.includes(cadence))throw new Error('unsupported horizon cadence');
  if(!['GREEN','PARTIAL_HELD'].includes(status))throw new Error('only successful/held-safe horizon may advance clock');
  const statePath=path.resolve(reqString(state_file,'state_file'));if(!fs.existsSync(statePath))throw new Error('orchestrator state missing');
  const state=validateOrchestratorState(readJson(statePath),{company_id,version});const when=iso(completed_at);
  const next={...state,last_success:{...state.last_success,[cadence]:when},last_result:{cadence,status,completed_at:when},additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false};
  atomicJson(statePath,next);return Object.freeze(next);
}
