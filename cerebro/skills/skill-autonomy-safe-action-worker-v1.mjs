import fs from 'node:fs';
import path from 'node:path';
import {stableIdempotencyKey} from '../runtime/continuous-improvement-contract.mjs';
import {validateSafeAutoloopState} from './skill-autoloop-controller.mjs';

function clone(value){return JSON.parse(JSON.stringify(value??{}));}
function text(value){return typeof value==='string'&&value.trim()?value.trim():null;}
function entries(state){
  return Object.entries(state?.autonomy_action_queue??{})
    .filter(([,item])=>item?.status==='WAITING_SAFE_ACTION_WORKER')
    .sort((a,b)=>String(a[1].recorded_at??'').localeCompare(String(b[1].recorded_at??''))||String(a[1].action_id??'').localeCompare(String(b[1].action_id??''))||a[0].localeCompare(b[0]));
}

export function selectNextSkillAutonomyAction(state){
  const safety=validateSafeAutoloopState(state);
  if(!safety.green) throw new Error(`AUTOLOOP_STATE_UNSAFE:${safety.errors.join(',')}`);
  const first=entries(state)[0];
  return first?Object.freeze({candidate_id:first[0],action:clone(first[1])}):null;
}

function invariantEnvelope(){return {
  environment:'PREPROD',additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false,
  external_skill_code_execution_authorized:false,paid_activation_authorized:false,auto_merge_authorized:false
};}

function buildHandoff(candidateId,action,completed){
  if(!completed||completed.candidate_id!==candidateId) throw new Error('completed candidate evidence required');
  if(completed.action_id!==action.action_id||completed.disposition!==action.decision) throw new Error('action/completed decision mismatch');
  const common={
    schema_version:'1.0.0',company_id:action.company_id??'GLOBAL',skill_id:candidateId,skill_version:action.skill_version,
    source_action_id:action.action_id,source_decision_id:action.decision_id,source_discovery_run_id:completed.source_discovery_run_id??null,
    wrapper_id:completed.wrapper_id??null,domain:completed.domain??null,...invariantEnvelope()
  };
  if(action.action_type==='BUILD_INTERNAL_WRAPPER_PLAN'||action.action_type==='PREPROD_INTERNAL_WRAPPER_SHADOW'){
    if(!Array.isArray(action.target_engine_ids)||action.target_engine_ids.length===0) throw new Error('engine extension target required');
    const id=stableIdempotencyKey({kind:'ENGINE_EXTENSION',action_id:action.action_id,target_engine_ids:action.target_engine_ids});
    return Object.freeze({
      ...common,state_type:'CEREBRO_SKILL_ENGINE_EXTENSION_HANDOFF',handoff_id:`skill-engine-extension:${id.slice(0,24)}`,
      action_type:action.action_type,target_engine_ids:[...action.target_engine_ids],
      preservation_required:true,old_vs_new_required:true,tribunal_required:true,rollback_required:true,rebuild_required:true,
      internal_wrapper_only:true,raw_external_skill_execution_forbidden:true,
      shadow_activation_candidate:action.internal_wrapper_shadow_authorized===true,
      next_gate:'SKILL_CAPABILITY_EVOLUTION_EXISTING_ENGINE'
    });
  }
  if(action.action_type==='FACT001_CAPABILITY_GAP_CANDIDATE'){
    const id=stableIdempotencyKey({kind:'FACT001_GAP',action_id:action.action_id,skill_id:candidateId});
    return Object.freeze({
      ...common,state_type:'CEREBRO_FACT001_CAPABILITY_GAP_HANDOFF',handoff_id:`fact001-gap:${id.slice(0,24)}`,
      action_type:action.action_type,target_engine_ids:[],factory_first:true,factory_candidate_authorized:true,factory_create_authorized:false,
      registry_change_authorized:false,new_engine_id:null,preservation_required:true,dependency_map_required:true,backup_required:true,
      contracts_required:true,tests_required:true,preprod_required:true,old_vs_new_required:true,tribunal_required:true,rollback_required:true,rebuild_required:true,
      next_gate:'FACT001_REGISTRY_CAPABILITY_GAP_REVIEW'
    });
  }
  throw new Error(`unsupported queued action:${action.action_type}`);
}

export function routeNextSkillAutonomyAction(state,{now=new Date().toISOString()}={}){
  const out=clone(state);
  const safety=validateSafeAutoloopState(out);
  if(!safety.green) throw new Error(`AUTOLOOP_STATE_UNSAFE:${safety.errors.join(',')}`);
  const selected=selectNextSkillAutonomyAction(out);
  if(!selected){
    out.updated_at=now;
    out.last_action='SKILL_AUTONOMY_ACTION_WORKER_IDLE';
    return Object.freeze({state:out,handoff:null,status:'IDLE_NO_SAFE_ACTION'});
  }
  const {candidate_id,action}=selected;
  const completed=out.completed?.[candidate_id];
  const handoff=buildHandoff(candidate_id,action,completed);
  out.autonomy_action_handoffs=out.autonomy_action_handoffs??{};
  out.autonomy_action_history=out.autonomy_action_history??{};
  const previous=out.autonomy_action_handoffs[candidate_id];
  if(previous&&previous.handoff_id!==handoff.handoff_id) throw new Error('candidate handoff conflict');
  out.autonomy_action_handoffs[candidate_id]=handoff;
  out.autonomy_action_history[candidate_id]={action_id:action.action_id,handoff_id:handoff.handoff_id,status:'ROUTED_TO_EXISTING_GOVERNED_PIPELINE',routed_at:now,next_gate:handoff.next_gate,...invariantEnvelope()};
  delete out.autonomy_action_queue[candidate_id];
  out.completed[candidate_id]={...completed,action_status:'ROUTED_TO_EXISTING_GOVERNED_PIPELINE',handoff_id:handoff.handoff_id,next_gate:handoff.next_gate,updated_at:now};
  out.updated_at=now;
  out.last_action=`ROUTE_${handoff.state_type}_CONTINUE_OTHER_SAFE_WORK`;
  const finalSafety=validateSafeAutoloopState(out);
  if(!finalSafety.green) throw new Error(`AUTOLOOP_STATE_UNSAFE_AFTER_HANDOFF:${finalSafety.errors.join(',')}`);
  return Object.freeze({state:out,handoff,status:'ROUTED'});
}

export function routeSkillAutonomyActions(state,{now=new Date().toISOString(),max_actions=8}={}){
  if(!Number.isInteger(max_actions)||max_actions<1||max_actions>25)throw new Error('max_actions must be 1..25');
  let current=clone(state);const handoffs=[];
  for(let i=0;i<max_actions;i+=1){
    const step=routeNextSkillAutonomyAction(current,{now});
    current=clone(step.state);
    if(step.status==='IDLE_NO_SAFE_ACTION')break;
    if(step.handoff)handoffs.push(step.handoff);
  }
  const safety=validateSafeAutoloopState(current);
  if(!safety.green)throw new Error(`AUTOLOOP_STATE_UNSAFE_AFTER_BATCH:${safety.errors.join(',')}`);
  current.updated_at=now;
  current.last_action=handoffs.length?`ROUTE_SAFE_ACTION_BATCH_${handoffs.length}_CONTINUE_OTHER_SAFE_WORK`:'SKILL_AUTONOMY_ACTION_WORKER_IDLE';
  return Object.freeze({state:Object.freeze(current),handoffs:Object.freeze(handoffs),handoff:handoffs[0]??null,status:handoffs.length?'ROUTED_BATCH':'IDLE_NO_SAFE_ACTION',routed:handoffs.length,remaining_queue_depth:entries(current).length});
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const statePath=argValue('--state');
  const output=argValue('--output')??'artifacts/autoloop/state.after-action-worker.json';
  const handoffOutput=argValue('--handoff-output')??'artifacts/autoloop/action-handoff.json';
  const maxActions=Number(argValue('--max-actions')??1);
  if(!statePath) throw new Error('REQUIRED: --state');
  const initial=JSON.parse(fs.readFileSync(statePath,'utf8'));
  const result=maxActions===1?(()=>{const one=routeNextSkillAutonomyAction(initial);return {state:one.state,handoffs:one.handoff?[one.handoff]:[],handoff:one.handoff,status:one.status,routed:one.handoff?1:0,remaining_queue_depth:entries(one.state).length};})():routeSkillAutonomyActions(initial,{max_actions:maxActions});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.mkdirSync(path.dirname(handoffOutput),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(result.state,null,2)}\n`,'utf8');
  fs.writeFileSync(handoffOutput,`${JSON.stringify({status:result.status,routed:result.routed,remaining_queue_depth:result.remaining_queue_depth,handoff:result.handoff,handoffs:result.handoffs,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0},null,2)}\n`,'utf8');
  console.log(JSON.stringify({status:result.status,routed:result.routed,remaining_queue_depth:result.remaining_queue_depth,handoff_type:result.handoff?.state_type??null,next_gate:result.handoff?.next_gate??null,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0}));
}