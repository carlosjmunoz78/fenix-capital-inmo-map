import fs from 'node:fs';
import path from 'node:path';
import {validateSafeAutoloopState} from './skill-autoloop-controller.mjs';

function clone(value){return JSON.parse(JSON.stringify(value??{}));}
function iso(value){return typeof value==='string'&&value?value:'9999-12-31T23:59:59.999Z';}

export function selectWaitingSafeCandidate(state){
  const safety=validateSafeAutoloopState(state);
  if(!safety.green) throw new Error(`AUTOLOOP_STATE_UNSAFE:${safety.errors.join(',')}`);
  const candidates=Object.values(state?.waiting_safe_handler??{})
    .filter((item)=>item?.candidate_id&&item?.status==='WAITING_SAFE_HANDLER')
    .sort((a,b)=>(Number(b.value_score??0)-Number(a.value_score??0))||iso(a.checkpointed_at).localeCompare(iso(b.checkpointed_at))||String(a.candidate_id).localeCompare(String(b.candidate_id)));
  return candidates[0]??null;
}

export function reconcileSafeHandlerResult(state,candidateId,{outcome,evidence={},now=new Date().toISOString()}={}){
  const out=clone(state);
  const safety=validateSafeAutoloopState(out);
  if(!safety.green) throw new Error(`AUTOLOOP_STATE_UNSAFE:${safety.errors.join(',')}`);
  const current=out.waiting_safe_handler?.[candidateId]??out.in_flight?.[candidateId];
  if(!current) throw new Error('CANDIDATE_NOT_FOUND_IN_SAFE_HANDLER_LANES');
  out.waiting_safe_handler=out.waiting_safe_handler??{};
  out.in_flight=out.in_flight??{};
  out.waiting_human=out.waiting_human??{};
  out.completed=out.completed??{};
  out.terminal_hold=out.terminal_hold??{};
  delete out.waiting_safe_handler[candidateId];
  delete out.in_flight[candidateId];
  out.updated_at=now;

  if(outcome==='READY_FOR_PREPROD_PROMOTION_REVIEW'){
    out.waiting_human[candidateId]={
      ...current,
      candidate_id:candidateId,
      stage:'PREPROD_PROMOTION_REVIEW',
      status:'WAITING_HUMAN',
      human_required:'HIGH_RISK',
      evidence,
      updated_at:now,
      prod_authorized:false,
      prod_write:false,
      autonomous_promotion_authorized:false,
      external_skill_code_execution:false,
      customer_data_used:false,
      trading_access:false,
      paid_fallback:false,
      additional_cost_eur:0
    };
    out.last_action='HUMAN_REQUIRED_HIGH_RISK_CONTINUE_OTHER_SAFE_WORK';
  } else if(outcome==='TERMINAL_HOLD'){
    out.terminal_hold[candidateId]={
      ...current,
      candidate_id:candidateId,
      stage:'SAFE_HANDLER_TERMINAL_HOLD',
      status:'TERMINAL_HOLD',
      human_required:null,
      evidence,
      updated_at:now,
      prod_authorized:false,
      prod_write:false,
      external_skill_code_execution:false,
      customer_data_used:false,
      trading_access:false,
      paid_fallback:false,
      additional_cost_eur:0
    };
    out.last_action='TERMINAL_HOLD_CONTINUE_OTHER_SAFE_WORK';
  } else if(outcome==='RETRY_SAFE_HANDLER'){
    out.waiting_safe_handler[candidateId]={
      ...current,
      candidate_id:candidateId,
      stage:'SAFE_HANDLER_RETRY_PENDING',
      status:'WAITING_SAFE_HANDLER',
      retry_count:Number(current.retry_count??0)+1,
      last_retry_evidence:evidence,
      updated_at:now,
      human_required:null,
      prod_authorized:false,
      prod_write:false,
      external_skill_code_execution:false,
      customer_data_used:false,
      trading_access:false,
      paid_fallback:false,
      additional_cost_eur:0
    };
    out.last_action='RETRY_SAFE_HANDLER_CONTINUE_QUEUE';
  } else {
    throw new Error('INVALID_SAFE_HANDLER_OUTCOME');
  }

  const finalSafety=validateSafeAutoloopState(out);
  if(!finalSafety.green) throw new Error(`AUTOLOOP_STATE_UNSAFE_AFTER_RECONCILE:${finalSafety.errors.join(',')}`);
  return out;
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const statePath=argValue('--state');
  const output=argValue('--output')??'artifacts/autoloop/safe-handler-selection.json';
  if(!statePath) throw new Error('REQUIRED: --state');
  const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
  const selected=selectWaitingSafeCandidate(state);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify({schema_version:'0.1.0',selected,prod_authorized:false,external_skill_code_execution:false,additional_cost_eur:0},null,2)}\n`,'utf8');
  console.log(JSON.stringify({selected_candidate_id:selected?.candidate_id??null,selected_name:selected?.name??null,prod_authorized:false,external_skill_code_execution:false,additional_cost_eur:0}));
}
