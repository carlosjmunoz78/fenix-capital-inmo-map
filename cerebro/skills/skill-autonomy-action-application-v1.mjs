import fs from 'node:fs';
import path from 'node:path';
import {stableIdempotencyKey,HUMAN_REQUIRED_CODES} from '../runtime/continuous-improvement-contract.mjs';
import {SKILL_AUTONOMY_DECISIONS} from '../runtime/skill-capability-autonomy-closure-v1.mjs';
import {validateSafeAutoloopState} from './skill-autoloop-controller.mjs';

const PREPROD='PREPROD';
const TERMINAL_METADATA_ONLY=new Set(['REUTILIZAR','CATALOGAR','DESCARTAR']);
const SAFE_WORK_QUEUE=new Set(['ENVOLVER','FABRICAR_GRATIS']);

function clone(value){return JSON.parse(JSON.stringify(value??{}));}
function text(value){return typeof value==='string'&&value.trim()?value.trim():null;}
function uniq(values){return [...new Set((Array.isArray(values)?values:[]).filter((v)=>text(v)).map((v)=>v.trim()))].sort();}

function validateDecision(decision){
  if(!decision||typeof decision!=='object'||Array.isArray(decision)) throw new Error('decision required');
  if(decision.environment!==PREPROD) throw new Error('PREPROD decision required');
  if(!SKILL_AUTONOMY_DECISIONS.includes(decision.decision)) throw new Error('invalid canonical skill autonomy decision');
  if(!text(decision.decision_id)||!text(decision.company_id)||!text(decision.skill_id)||!text(decision.skill_version)) throw new Error('decision identity incomplete');
  if(decision.prod_authorized!==false||decision.prod_write_authorized!==false||decision.trading_access!==false||decision.external_code_execution_authorized!==false) throw new Error('decision authority expansion forbidden');
  if(decision.human_required!=null&&!HUMAN_REQUIRED_CODES.includes(decision.human_required)) throw new Error('non-canonical HUMAN_REQUIRED');
  return decision;
}

function actionFor(decision){
  const bindings=uniq(decision.existing_engine_bindings);
  switch(decision.decision){
    case 'REUTILIZAR':
      return {action_type:'REUSE_EXISTING_CAPABILITY',status:'APPLIED_METADATA_ONLY',next_gate:'CONTINUE_OPERATION',target_engine_ids:bindings,mutation_authorized:false};
    case 'ENVOLVER':
      if(!bindings.length) throw new Error('ENVOLVER requires existing_engine_bindings');
      if(decision.preprod_internal_wrapper_activation_authorized===true){
        return {action_type:'PREPROD_INTERNAL_WRAPPER_SHADOW',status:'QUEUED_SAFE_WORK',next_gate:'PREPROD_INTERNAL_WRAPPER_SHADOW_EXECUTION',target_engine_ids:bindings,mutation_authorized:true};
      }
      return {action_type:'BUILD_INTERNAL_WRAPPER_PLAN',status:'QUEUED_SAFE_WORK',next_gate:'INTERNAL_WRAPPER_BUILD_AND_REEVALUATE',target_engine_ids:bindings,mutation_authorized:false};
    case 'CATALOGAR':
      return {action_type:'CATALOG_CAPABILITY',status:'APPLIED_METADATA_ONLY',next_gate:'CONTINUE_DISCOVERY',target_engine_ids:[],mutation_authorized:false};
    case 'FABRICAR_GRATIS':
      if(decision.factory_candidate_authorized!==true||decision.factory_create_authorized!==false) throw new Error('FABRICAR_GRATIS must be FACT-001 candidate-only');
      return {action_type:'FACT001_CAPABILITY_GAP_CANDIDATE',status:'QUEUED_SAFE_WORK',next_gate:'FACT001_CAPABILITY_GAP_REVIEW',target_engine_ids:[],mutation_authorized:false};
    case 'HOLD':
      return {action_type:'HOLD_NO_ACTION',status:'BLOCKED',next_gate:decision.human_required?'CANONICAL_HUMAN_EXCEPTION':'MORE_EVIDENCE',target_engine_ids:bindings,mutation_authorized:false};
    case 'DESCARTAR':
      return {action_type:'REJECT_CAPABILITY',status:'APPLIED_METADATA_ONLY',next_gate:'CONTINUE_DISCOVERY',target_engine_ids:bindings,mutation_authorized:false};
    case 'PAGO_JUSTIFICADO':
      return {action_type:'PAID_EXCEPTION_REVIEW',status:'BLOCKED',next_gate:decision.human_required==='MONEY_LIMIT'?'MONEY_LIMIT':'ZERO_COST_POLICY_REVIEW',target_engine_ids:bindings,mutation_authorized:false};
    default: throw new Error('unreachable canonical decision');
  }
}

export function buildSkillAutonomyActionReceipt(decision,{observed_at=null}={}){
  const d=validateDecision(decision);
  const route=actionFor(d);
  const id=stableIdempotencyKey({
    decision_id:d.decision_id,company_id:d.company_id,skill_id:d.skill_id,skill_version:d.skill_version,
    decision:d.decision,action_type:route.action_type,next_gate:route.next_gate,target_engine_ids:route.target_engine_ids
  });
  const queueable=SAFE_WORK_QUEUE.has(d.decision)&&route.status==='QUEUED_SAFE_WORK';
  const terminal=TERMINAL_METADATA_ONLY.has(d.decision)&&route.status==='APPLIED_METADATA_ONLY';
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SKILL_AUTONOMY_ACTION_RECEIPT',
    action_id:`skill-action:${id.slice(0,24)}`,
    decision_id:d.decision_id,company_id:d.company_id,engine_id:'SKILL-AUTONOMY-ACTION',environment:PREPROD,version:'1.0.0',
    skill_id:d.skill_id,skill_version:d.skill_version,decision:d.decision,
    action_type:route.action_type,status:route.status,next_gate:route.next_gate,target_engine_ids:Object.freeze(route.target_engine_ids),
    observed_at:text(observed_at),human_required:d.human_required??null,
    queueable_safe_work:queueable,terminal_metadata_only:terminal,mutation_authorized:route.mutation_authorized===true,
    internal_wrapper_shadow_authorized:d.decision==='ENVOLVER'&&d.preprod_internal_wrapper_activation_authorized===true,
    fact001_gap_candidate_authorized:d.decision==='FABRICAR_GRATIS'&&d.factory_candidate_authorized===true,
    fact001_create_authorized:false,paid_activation_authorized:false,
    prod_authorized:false,prod_write_authorized:false,trading_access:false,external_skill_code_execution_authorized:false,
    additional_cost_eur:d.decision==='PAGO_JUSTIFICADO'?Number(d.additional_cost_eur??0):0
  });
}

export function applySkillAutonomyActionReceipt(state,receipt,{now=new Date().toISOString()}={}){
  const out=clone(state);
  const safety=validateSafeAutoloopState(out);
  if(!safety.green) throw new Error(`AUTOLOOP_STATE_UNSAFE:${safety.errors.join(',')}`);
  if(!receipt||receipt.state_type!=='CEREBRO_SKILL_AUTONOMY_ACTION_RECEIPT'||receipt.environment!==PREPROD) throw new Error('invalid action receipt');
  if(receipt.prod_authorized!==false||receipt.prod_write_authorized!==false||receipt.trading_access!==false||receipt.external_skill_code_execution_authorized!==false||receipt.paid_activation_authorized!==false||receipt.fact001_create_authorized!==false) throw new Error('action receipt authority expansion forbidden');
  const candidateId=receipt.skill_id;
  const completed=out.completed?.[candidateId];
  if(!completed||completed.stage!=='SKILL_AUTONOMY_DECISION_RECORDED') throw new Error('candidate canonical decision must be recorded before action application');
  if(completed.evidence?.decision_id!==receipt.decision_id||completed.disposition!==receipt.decision) throw new Error('action receipt does not match recorded decision');
  if(receipt.human_required!=null) throw new Error('human-required receipt cannot enter autonomous action application');

  out.autonomy_action_ledger=out.autonomy_action_ledger??{};
  out.autonomy_action_queue=out.autonomy_action_queue??{};
  const previous=out.autonomy_action_ledger[candidateId];
  if(previous){
    if(previous.action_id!==receipt.action_id) throw new Error('candidate action conflict');
    return Object.freeze(out);
  }
  const entry={...receipt,recorded_at:now};
  out.autonomy_action_ledger[candidateId]=entry;
  if(receipt.queueable_safe_work===true){
    out.autonomy_action_queue[candidateId]={...entry,status:'WAITING_SAFE_ACTION_WORKER'};
  }
  out.completed[candidateId]={...completed,action_id:receipt.action_id,action_type:receipt.action_type,action_status:receipt.queueable_safe_work?'WAITING_SAFE_ACTION_WORKER':receipt.status,next_gate:receipt.next_gate,updated_at:now};
  out.updated_at=now;
  out.last_action=receipt.queueable_safe_work?`QUEUE_${receipt.action_type}_CONTINUE_OTHER_SAFE_WORK`:`APPLY_${receipt.action_type}_CONTINUE_DISCOVERY`;
  const finalSafety=validateSafeAutoloopState(out);
  if(!finalSafety.green) throw new Error(`AUTOLOOP_STATE_UNSAFE_AFTER_ACTION:${finalSafety.errors.join(',')}`);
  return Object.freeze(out);
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function load(file){if(!file||!fs.existsSync(file)) throw new Error(`missing file:${file}`);return JSON.parse(fs.readFileSync(file,'utf8'));}

if(import.meta.url===`file://${process.argv[1]}`){
  const decisionPath=argValue('--decision');
  const receiptPath=argValue('--receipt');
  const statePath=argValue('--state');
  const output=argValue('--output')??'artifacts/handler/autonomy-action.json';
  let result;
  if(decisionPath){
    result=buildSkillAutonomyActionReceipt(load(decisionPath),{observed_at:new Date().toISOString()});
  }else if(receiptPath&&statePath){
    result=applySkillAutonomyActionReceipt(load(statePath),load(receiptPath));
  }else{
    throw new Error('use --decision <file> or --state <file> --receipt <file>');
  }
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(result,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,state_type:result.state_type??result.mode,action_type:result.action_type??null,next_gate:result.next_gate??null,prod_authorized:false,prod_write_authorized:false,trading_access:false}));
}
