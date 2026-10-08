import {serialize,deserialize} from 'node:v8';
import {AtomicV8Journal} from './persistent-runtime.mjs';
import {stableIdempotencyKey,HUMAN_REQUIRED_CODES} from './continuous-improvement-contract.mjs';

const PREPROD='PREPROD';
const KIND='RSI-RECOVERY-SUPERVISOR-001';
const SAFE_ACTIONS=Object.freeze(['REFETCH_REMOTE_EVIDENCE','REOPEN_LOCAL_STATE','REBUILD_EPHEMERAL_WORKSPACE','RETRY_TRANSIENT_OPERATION','ROLLBACK_LAST_CANDIDATE']);
const DIRECT_HUMAN=Object.freeze({
  LEGAL_REQUIRED:'LEGAL_REQUIRED',SIGNATURE_REQUIRED:'SIGNATURE_REQUIRED',CUSTOMER_HUMAN_REQUEST:'CUSTOMER_HUMAN_REQUEST',
  SECURITY_INCIDENT:'SECURITY_INCIDENT',MONEY_LIMIT:'MONEY_LIMIT',POLICY_CONFLICT:'POLICY_CONFLICT',HIGH_RISK:'HIGH_RISK'
});
function clone(v){return deserialize(serialize(v));}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim();}
function validateObservation(o){
  if(!o||typeof o!=='object')throw new Error('failure observation required');
  for(const k of ['company_id','engine_id','environment','version','failure_family','observed_at','evidence_ref'])req(o[k],k);
  if(o.environment!==PREPROD)throw new Error('recovery supervisor accepts exact PREPROD only');
  if(Number.isNaN(Date.parse(o.observed_at)))throw new Error('invalid observed_at');
  if(o.prod_authorized!==false||o.trading_access!==false)throw new Error('failure observation authority expanded');
  return o;
}
function initialActionFor(family){
  const f=family.toUpperCase();
  if(f.includes('REMOTE')||f.includes('HTTP')||f.includes('NETWORK'))return 'REFETCH_REMOTE_EVIDENCE';
  if(f.includes('LOCK')||f.includes('JOURNAL')||f.includes('STATE'))return 'REOPEN_LOCAL_STATE';
  if(f.includes('WORKSPACE')||f.includes('RUNNER')||f.includes('TEMP'))return 'REBUILD_EPHEMERAL_WORKSPACE';
  if(f.includes('CANDIDATE')||f.includes('REGRESSION'))return 'ROLLBACK_LAST_CANDIDATE';
  return 'RETRY_TRANSIENT_OPERATION';
}
function humanCode(o){
  const direct=DIRECT_HUMAN[o.exception_code];if(direct)return direct;
  const family=o.failure_family.toUpperCase();
  if(/SECURITY|CREDENTIAL|SECRET|INTRUSION/.test(family))return 'SECURITY_INCIDENT';
  if(/MONEY|BUDGET|COST_LIMIT/.test(family))return 'MONEY_LIMIT';
  if(/LEGAL/.test(family))return 'LEGAL_REQUIRED';
  if(/SIGNATURE/.test(family))return 'SIGNATURE_REQUIRED';
  if(/POLICY|PERMISSION/.test(family))return 'POLICY_CONFLICT';
  if(/HIGH_RISK|CRITICAL_RISK/.test(family))return 'HIGH_RISK';
  return null;
}

export function planRecovery(observation,{attempts=0,previous_actions=[]}={}){
  const o=clone(validateObservation(observation));
  if(!Number.isInteger(attempts)||attempts<0||attempts>3)throw new Error('attempts must be 0..3');
  const direct=humanCode(o);
  const case_id=stableIdempotencyKey({company_id:o.company_id,engine_id:o.engine_id,environment:o.environment,version:o.version,failure_family:o.failure_family,evidence_ref:o.evidence_ref});
  if(direct){
    return Object.freeze({case_id,...o,state:'HUMAN_REQUIRED',human_required:direct,action:null,attempts,max_attempts:3,strategy_change_required:false,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});
  }
  if(attempts>=3){
    return Object.freeze({case_id,...o,state:'HUMAN_REQUIRED',human_required:'LOW_CONFIDENCE',action:null,attempts,max_attempts:3,strategy_change_required:true,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});
  }
  let action=initialActionFor(o.failure_family);
  const sameActionCount=previous_actions.filter(x=>x===action).length;
  if(sameActionCount>=2){
    const alternatives=SAFE_ACTIONS.filter(x=>x!==action&&!previous_actions.includes(x));
    if(alternatives.length===0)return Object.freeze({case_id,...o,state:'HUMAN_REQUIRED',human_required:'LOW_CONFIDENCE',action:null,attempts,max_attempts:3,strategy_change_required:true,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});
    action=alternatives[0];
  }
  return Object.freeze({case_id,...o,state:'RECOVERY_PLANNED',human_required:null,action,attempts,max_attempts:3,strategy_change_required:sameActionCount>=2,requires_test_after_action:true,requires_rollback_on_regression:true,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});
}

export class BoundedRecoveryLedger{
  #journal;#cases;
  constructor({file_path}){
    this.#journal=new AtomicV8Journal({file_path,kind:KIND});
    const ops=this.#journal.load();this.#cases=new Map();
    for(const op of ops)this.#apply(op,true);
  }
  #ops(){return this.#journal.load();}
  #commit(op){const ops=[...this.#ops(),clone(op)];this.#journal.commit(ops);this.#apply(op,false);}
  #apply(op,replay){
    if(op.op==='OPEN'){
      if(this.#cases.has(op.case.case_id)){if(replay)throw new Error('duplicate recovery OPEN');return;}
      this.#cases.set(op.case.case_id,clone(op.case));return;
    }
    const item=this.#cases.get(op.case_id);if(!item)throw new Error('unknown recovery case');
    if(op.op==='ATTEMPT'){item.attempts=op.attempt;item.previous_actions=[...(item.previous_actions??[]),op.action];item.state='TESTING';item.last_action=op.action;return;}
    if(op.op==='RESULT'){item.state=op.success?'RESOLVED':op.next_state;item.last_result=clone(op);if(op.success)item.resolved_at=op.completed_at;return;}
    throw new Error('invalid recovery operation');
  }
  open(observation){
    const plan=planRecovery(observation);const prior=this.#cases.get(plan.case_id);
    if(prior)return Object.freeze({accepted:false,duplicate:true,case:clone(prior),plan:planRecovery(observation,{attempts:prior.attempts??0,previous_actions:prior.previous_actions??[]})});
    const item={case_id:plan.case_id,observation:clone(observation),attempts:0,previous_actions:[],state:plan.state,human_required:plan.human_required??null,prod_authorized:false,trading_access:false};
    this.#commit({op:'OPEN',case:item});return Object.freeze({accepted:true,duplicate:false,case:clone(item),plan});
  }
  next(case_id){
    const item=this.#cases.get(req(case_id,'case_id'));if(!item)throw new Error('unknown recovery case');
    if(item.state==='RESOLVED')return Object.freeze({state:'RESOLVED',case_id,action:null,human_required:null,prod_authorized:false});
    return planRecovery(item.observation,{attempts:item.attempts,previous_actions:item.previous_actions});
  }
  beginAttempt(case_id){
    const item=this.#cases.get(req(case_id,'case_id'));if(!item)throw new Error('unknown recovery case');
    const plan=this.next(case_id);if(plan.state!=='RECOVERY_PLANNED')return Object.freeze(plan);
    const attempt=item.attempts+1;if(attempt>3)throw new Error('attempt limit exceeded');
    this.#commit({op:'ATTEMPT',case_id,attempt,action:plan.action,started_at:new Date().toISOString()});
    return Object.freeze({...plan,state:'TESTING',attempt,prod_authorized:false,prod_write_authorized:false,trading_access:false});
  }
  recordResult(case_id,{success,test_green=false,regression=false,evidence_ref,completed_at=new Date().toISOString()}){
    const item=this.#cases.get(req(case_id,'case_id'));if(!item)throw new Error('unknown recovery case');
    if(item.state!=='TESTING')throw new Error('recovery case is not testing');
    req(evidence_ref,'evidence_ref');
    if(success&&test_green!==true)throw new Error('successful recovery requires green test');
    const when=new Date(completed_at).toISOString();
    let next_state='RETRY_ALLOWED';let human_required=null;
    if(success)next_state='RESOLVED';
    else if(regression&&item.last_action!=='ROLLBACK_LAST_CANDIDATE')next_state='ROLLBACK_REQUIRED';
    else if(item.attempts>=3){next_state='HUMAN_REQUIRED';human_required='LOW_CONFIDENCE';}
    const op={op:'RESULT',case_id,attempt:item.attempts,action:item.last_action,success:Boolean(success),test_green:Boolean(test_green),regression:Boolean(regression),evidence_ref,completed_at:when,next_state,human_required,prod_authorized:false};
    this.#commit(op);
    return Object.freeze({...op,state:next_state,learning_event:{event_type:'RECOVERY_OUTCOME',company_id:item.observation.company_id,engine_id:item.observation.engine_id,environment:PREPROD,version:item.observation.version,case_id,success:Boolean(success),action:item.last_action,evidence_ref,prod_authorized:false,trading_access:false},additional_cost_eur:0,prod_write_authorized:false,trading_access:false});
  }
  list(){return clone([...this.#cases.values()]);}
}

export const RECOVERY_SAFE_ACTIONS=SAFE_ACTIONS;
export function isCanonicalHumanRequired(value){return HUMAN_REQUIRED_CODES.includes(value);}
