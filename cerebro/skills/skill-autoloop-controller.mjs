import fs from 'node:fs';
import path from 'node:path';

const HUMAN_EXCEPTIONS=Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

const FORBIDDEN_AUTONOMOUS_FLAGS=Object.freeze([
  'preprod_promotion','prod_readonly_canary','prod_write','auto_merge',
  'customer_data','external_skill_code_execution','trading','paid_fallback'
]);

function clone(value){return JSON.parse(JSON.stringify(value??{}));}
function uniq(values){return [...new Set(values.filter((v)=>typeof v==='string'&&v.trim()).map((v)=>v.trim()))];}

export function validateSafeAutoloopState(state){
  const errors=[];
  if(state?.enabled!==true) errors.push('AUTOLOOP_NOT_ENABLED');
  if(state?.mode!=='SAFE_AUTONOMY_V0') errors.push('UNSUPPORTED_AUTOLOOP_MODE');
  for(const key of FORBIDDEN_AUTONOMOUS_FLAGS){
    if(state?.safe_autonomy?.[key]!==false) errors.push(`FORBIDDEN_AUTONOMY_${key.toUpperCase()}`);
  }
  if(Number(state?.safe_autonomy?.additional_cost_budget_eur??-1)!==0) errors.push('NONZERO_COST_BUDGET');
  if(state?.prod_authorized!==false) errors.push('PROD_AUTHORIZATION_MUST_REMAIN_FALSE');
  if(state?.autonomous_prod_promotion_authorized!==false) errors.push('AUTONOMOUS_PROD_PROMOTION_MUST_REMAIN_FALSE');
  return Object.freeze({green:errors.length===0,errors});
}

export function checkpointNextCandidate(state,nextReport,{now=new Date().toISOString(),source_run_id=null}={}){
  const out=clone(state);
  const safety=validateSafeAutoloopState(out);
  if(!safety.green) throw new Error(`AUTOLOOP_STATE_UNSAFE:${safety.errors.join(',')}`);

  out.updated_at=now;
  out.processed_candidate_ids=uniq(out.processed_candidate_ids??[]);
  out.in_flight=out.in_flight??{};
  out.waiting_human=out.waiting_human??{};
  out.waiting_safe_handler=out.waiting_safe_handler??{};
  out.completed=out.completed??{};
  out.terminal_hold=out.terminal_hold??{};

  const selected=nextReport?.selected??null;
  if(!selected?.candidate_id){
    out.last_action='IDLE_NO_NEW_ELIGIBLE_CANDIDATE';
    out.last_discovery_run_id=source_run_id;
    return Object.freeze({
      schema_version:'0.1.0',
      decision:'IDLE_NO_NEW_ELIGIBLE_CANDIDATE',
      candidate_id:null,
      state:out,
      human_required:null,
      prod_authorized:false,
      autonomous_prod_promotion_authorized:false
    });
  }

  const id=selected.candidate_id;
  const already=new Set(out.processed_candidate_ids).has(id)||
    [out.in_flight,out.waiting_human,out.waiting_safe_handler,out.completed,out.terminal_hold].some((bucket)=>Object.prototype.hasOwnProperty.call(bucket,id));

  if(already){
    out.last_action='SKIP_ALREADY_CHECKPOINTED_CANDIDATE';
    out.last_discovery_run_id=source_run_id;
    return Object.freeze({
      schema_version:'0.1.0',decision:'SKIP_ALREADY_CHECKPOINTED_CANDIDATE',candidate_id:id,state:out,
      human_required:null,prod_authorized:false,autonomous_prod_promotion_authorized:false
    });
  }

  out.processed_candidate_ids=uniq([...out.processed_candidate_ids,id]);
  out.waiting_safe_handler[id]={
    candidate_id:id,
    name:selected.declared_name??null,
    wrapper_id:selected.wrapper_id??null,
    domain:selected.domain??null,
    engine_bindings:[...(selected.engine_bindings??[])],
    value_score:selected.value_score??null,
    recommendation:selected.recommendation??null,
    evidence_refs:selected.evidence_refs??null,
    stage:'SAFE_STATIC_LANE_COMPLETE_NEEDS_CANDIDATE_SPECIFIC_HANDLER',
    status:'WAITING_SAFE_HANDLER',
    source_discovery_run_id:source_run_id,
    checkpointed_at:now,
    human_required:null,
    external_skill_code_execution:false,
    customer_data_used:false,
    prod_write:false,
    trading_access:false,
    paid_fallback:false,
    additional_cost_eur:0
  };
  out.last_action='CHECKPOINT_NEXT_CANDIDATE_AND_CONTINUE_QUEUE';
  out.last_discovery_run_id=source_run_id;

  return Object.freeze({
    schema_version:'0.1.0',
    decision:'CHECKPOINT_NEXT_CANDIDATE_AND_CONTINUE_QUEUE',
    candidate_id:id,
    next_stage:'CANDIDATE_SPECIFIC_SAFE_HANDLER_OR_HUMAN_EXCEPTION',
    state:out,
    human_required:null,
    prod_authorized:false,
    autonomous_prod_promotion_authorized:false
  });
}

export function moveCandidateToHumanGate(state,candidateId,{human_required,stage,evidence={},now=new Date().toISOString()}={}){
  if(!HUMAN_EXCEPTIONS.includes(human_required)) throw new Error('INVALID_HUMAN_EXCEPTION');
  const out=clone(state);
  const safety=validateSafeAutoloopState(out);
  if(!safety.green) throw new Error(`AUTOLOOP_STATE_UNSAFE:${safety.errors.join(',')}`);
  const current=out.in_flight?.[candidateId]??out.waiting_safe_handler?.[candidateId]??{};
  if(out.in_flight) delete out.in_flight[candidateId];
  if(out.waiting_safe_handler) delete out.waiting_safe_handler[candidateId];
  out.waiting_human=out.waiting_human??{};
  out.waiting_human[candidateId]={
    ...current,candidate_id:candidateId,stage:stage??current.stage??'HUMAN_GATE',status:'WAITING_HUMAN',
    human_required,evidence,updated_at:now,prod_authorized:false,prod_write:false,autonomous_promotion_authorized:false
  };
  out.processed_candidate_ids=uniq([...(out.processed_candidate_ids??[]),candidateId]);
  out.updated_at=now;
  out.last_action=`HUMAN_REQUIRED_${human_required}_CONTINUE_OTHER_SAFE_WORK`;
  return out;
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const statePath=argValue('--state');
  const nextPath=argValue('--next');
  const output=argValue('--output')??'artifacts/cerebro-skill-autoloop-decision.json';
  const stateOutput=argValue('--state-output')??'artifacts/cerebro-skill-autoloop-state.next.json';
  const runId=argValue('--source-run-id');
  if(!statePath||!nextPath) throw new Error('REQUIRED: --state and --next');
  const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
  const next=JSON.parse(fs.readFileSync(nextPath,'utf8'));
  const decision=checkpointNextCandidate(state,next,{source_run_id:runId?Number(runId):null});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.mkdirSync(path.dirname(stateOutput),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify({...decision,state:undefined},null,2)}\n`,'utf8');
  fs.writeFileSync(stateOutput,`${JSON.stringify(decision.state,null,2)}\n`,'utf8');
  console.log(JSON.stringify({decision:decision.decision,candidate_id:decision.candidate_id,human_required:decision.human_required,prod_authorized:false,autonomous_prod_promotion_authorized:false}));
}
