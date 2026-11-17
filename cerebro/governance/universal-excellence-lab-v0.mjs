/** Universal excellence / owner authority pilot. No autonomous access grants or PROD writes.
 * Applies to all worker, supervisor, tribunal and meta-supervisor classes. Reuses AtomicV8Journal.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {AtomicV8Journal} from '../runtime/persistent-runtime.mjs';
const policy=JSON.parse(fs.readFileSync(new URL('./universal-excellence-owner-authority.v0.json',import.meta.url),'utf8'));
const classes=new Set(policy.applies_to);
const metrics=[...policy.metrics.standard];
const opWeights={quality:0.25,truthfulness:0.15,safety:0.20,reliability:0.15,business_impact:0.10,efficiency:0.10,learning:0.05,independence:0};
const oversightWeights={quality:0.15,truthfulness:0.15,safety:0.20,reliability:0.10,business_impact:0.05,efficiency:0.05,learning:0.05,independence:0.25};
const oversight=new Set(['SUPERVISOR','JUDGE','TRIBUNAL','GUARDIAN','META_SUPERVISOR','QA_AGENT','INDEPENDENT_EVALUATOR','AUDITOR']);
const sha=x=>createHash('sha256').update(x).digest('hex');
function requireId(x,label){
 if(typeof x!=='string'||!/^[A-Za-z0-9_:.-]{2,100}$/.test(x))throw Error('EXCELLENCE_INVALID_'+label);
 return x;
}
function ctxOf(x){
 if(!x||typeof x!=='object')throw Error('EXCELLENCE_CONTEXT_REQUIRED');
 const context=Object.fromEntries(['company_id','engine_id','environment','version'].map(k=>[k,requireId(x[k],k)]));
 if(!['LAB','PREPROD'].includes(context.environment))throw Error('EXCELLENCE_NO_PROD_AUTHORITY');
 if(/trading/i.test(context.engine_id))throw Error('EXCELLENCE_TRADING_DENIED');
 return context;
}
const roleKey=e=>[e.company_id,e.engine_id,e.environment,e.version,e.subject_actor_id].join('|');
const validScore=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
export function assessUniversalMission(evidence){
 const e=evidence??{}, context=ctxOf(e);
 const subject_actor_id=requireId(e.subject_actor_id,'SUBJECT'),
       evaluator_actor_id=requireId(e.evaluator_actor_id,'EVALUATOR'),
       judge_actor_id=requireId(e.judge_actor_id,'JUDGE'),
       meta_evaluator_actor_id=requireId(e.meta_evaluator_actor_id,'META_EVALUATOR'),
       mission_id=requireId(e.mission_id,'MISSION');
 if(!classes.has(e.subject_class))throw Error('EXCELLENCE_ROLE_NOT_COVERED');
 if(new Set([subject_actor_id,evaluator_actor_id,judge_actor_id,meta_evaluator_actor_id]).size!==4)
  throw Error('EXCELLENCE_SELF_REVIEW_FORBIDDEN');
 if(typeof e.evidence_ref!=='string'||!/^[A-Za-z0-9:/_.#-]{8,300}$/.test(e.evidence_ref))throw Error('EXCELLENCE_EVIDENCE_REF_REQUIRED');
 if(e.evidence_independently_checked!==true||e.judge_independently_checked!==true||
    e.meta_evaluator_independently_checked!==true)throw Error('EXCELLENCE_INDEPENDENT_EVIDENCE_REQUIRED');
 if(!e.metrics||typeof e.metrics!=='object'||metrics.some(k=>!validScore(e.metrics[k])))
  throw Error('EXCELLENCE_METRICS_INVALID');
 const weights=oversight.has(e.subject_class)?oversightWeights:opWeights;
 const score=Math.round(metrics.reduce((n,k)=>n+weights[k]*e.metrics[k],0)*100)/100;
 const incident=e.incident_confirmed===true;
 if(incident&&(!e.incident_independently_reviewed||!e.incident_ref||typeof e.incident_ref!=='string'))
  throw Error('EXCELLENCE_INCIDENT_EVIDENCE_REQUIRED');
 const record={
  schema_version:'0.1.0',kind:'UNIVERSAL_EXCELLENCE_ASSESSMENT_CANDIDATE',
  ...context,mission_id,subject_actor_id,subject_class:e.subject_class,
  evaluator_actor_id,judge_actor_id,meta_evaluator_actor_id,
  record_id:sha(JSON.stringify([context,mission_id,subject_actor_id,e.evidence_ref])).slice(0,32),
  evidence_ref:e.evidence_ref,
  metrics:Object.fromEntries(metrics.map(k=>[k,e.metrics[k]])),
  role_specific_weights:weights,score,
  independent_evaluator_roles_declared:true,
  independent_actor_identities_iam_verified:false,
  source_cryptographically_attested:false,
  incident_confirmed_in_lab_evidence:incident,
  incident_ref:incident?e.incident_ref:null,
  training_needed:score<75,
  badge_granted:false,
  api_credential_granted:false,
  powers_increased:false,
  prod_authorized:false,
  actual_reward_applied:false,
  money_change_eur:0
 };
 return record;
}
function loadLedger(file_path){
 if(typeof file_path!=='string'||file_path.trim()==='')throw Error('EXCELLENCE_JOURNAL_PATH_REQUIRED');
 const ledger=new AtomicV8Journal({file_path,kind:'CEREBRO-UNIVERSAL-EXCELLENCE-V0'});
 return {ledger,entries:ledger.load()};
}
export function stateForRole({entries,context,subject_actor_id}){
 const ctx=ctxOf(context),subject=requireId(subject_actor_id,'SUBJECT');
 if(!Array.isArray(entries))throw Error('EXCELLENCE_LEDGER_ENTRIES_INVALID');
 const records=entries.filter(e=>e.kind==='UNIVERSAL_EXCELLENCE_ASSESSMENT_CANDIDATE'&&
  roleKey(e)===roleKey({...ctx,subject_actor_id:subject}));
 const last=records.at(-1)||null;
 if(!last)return {state:'UNASSESSED_LAB',mission_count:0,score:null,can_dispatch_lab:true,
  effective_reward_applied:false,prod_authorized:false};
 const incident=records.some(e=>e.incident_confirmed_in_lab_evidence);
 const three=records.slice(-3);
 // Once LAB scheduling suspends a role, later assessments cannot reactivate it silently.
 const poor=records.some((_,i)=>i>=2&&records.slice(i-2,i+1).every(e=>e.score<55));
 const excellence=three.length>=policy.excellence.minimum_missions&&three.every(e=>
   e.score>=policy.excellence.score_threshold &&
   e.metrics.quality>=policy.excellence.quality_floor &&
   e.metrics.safety>=policy.excellence.safety_floor);
 const state=incident?'QUARANTINED_LAB':poor?'SUSPENDED_LAB':
  last.score<75?'TRAINING_REQUIRED_LAB':excellence?'EXCELLENCE_REWARD_CANDIDATE_LAB':'ACTIVE_LAB';
 return {state,mission_count:records.length,score:last.score,
  subject_class:last.subject_class,
  can_dispatch_lab:!['QUARANTINED_LAB','SUSPENDED_LAB'].includes(state),
  reward_candidates:state==='EXCELLENCE_REWARD_CANDIDATE_LAB'?
    [...policy.rewards.non_privileged_candidates,...policy.rewards.privileged_candidates]:[],
  required_next:incident?'SECURITY_INCIDENT':poor?'INDEPENDENT_REPLACEMENT_BENCHMARK':
    last.score<75?'TRAINING_AND_REEXAM':excellence?'INDEPENDENT_IAM_AND_OWNER_GATE':'NORMAL_TASKS',
  human_required_reason:incident?'SECURITY_INCIDENT':null,
  claimed_IAM_authenticated:false,actual_permissions_added:[],actual_reward_applied:false,
  prod_authorized:false};
}
export function recordUniversalAssessment({file_path,evidence}){
 const record=assessUniversalMission(evidence);
 const {ledger,entries}=loadLedger(file_path);
 const scoped=roleKey(record);
 const conflict=entries.find(e=>e.kind===record.kind&&roleKey(e)===scoped&&e.mission_id===record.mission_id);
 if(conflict&&JSON.stringify(conflict)!==JSON.stringify(record))throw Error('EXCELLENCE_MISSION_EVIDENCE_CONFLICT');
 if(!conflict)ledger.commit([...entries,record]);
 const fresh=loadLedger(file_path);
 const found=fresh.entries.find(x=>x.record_id===record.record_id);
 if(!found||JSON.stringify(found)!==JSON.stringify(record))throw Error('EXCELLENCE_DURABILITY_FAILED');
 return {status:'ASSESSMENT_STORED_LAB_UNTRUSTED_IDENTITY',assessment:record,
  duplicated:Boolean(conflict),state:stateForRole({entries:fresh.entries,context:record,subject_actor_id:record.subject_actor_id}),
  journal_sha256:sha(fs.readFileSync(path.resolve(file_path))),total_entries:fresh.entries.length,
  external_access_changes:0,additional_eur:0};
}
export function dispatchGate({file_path,context,subject_actor_id}){
 const state=stateForRole({entries:loadLedger(file_path).entries,context,subject_actor_id});
 return {decision:state.can_dispatch_lab?'LAB_TASK_ELIGIBLE':'BLOCK_LAB_DISPATCH',
  state:state.state,mission_count:state.mission_count,prod_authorized:false,
  external_access_granted:false};
}
export function routeDirective({source,request_type,within_delegated_scope=false,owner_proof=null,verifyOwner=null}={}){
 const options=['TASK','STRATEGY','REWARD_PRIVILEGE','SUSPENSION_OVERRIDE','REPLACEMENT','API_ACCESS'];
 if(!options.includes(request_type))throw Error('EXCELLENCE_REQUEST_TYPE_INVALID');
 if(source==='OWNER_IAM'){
  // Authentication MUST come from a separately trusted gateway. No proof or verifier means deny.
  if(typeof verifyOwner!=='function'||!owner_proof)return {decision:'DENY_UNVERIFIED_OWNER',applied:false};
  let verified=false;
  try{verified=verifyOwner(owner_proof)===true}catch{}
  if(!verified)return {decision:'DENY_UNVERIFIED_OWNER',applied:false};
  return {decision:'OWNER_COMMAND_ACCEPTED_FOR_POLICY_GATE_ONLY',
   request_type,owner_authority_recognized:true,applied:false,
   requires_policy_and_release_gates:true,actual_access_granted:false};
 }
 if(source==='DELEGATED_SUPERIOR'&&request_type==='TASK'&&within_delegated_scope===true){
  return {decision:'DELEGATED_TASK_ALLOWED_WITHIN_EXISTING_SCOPE',
    applied:false,strategic_authority:false};
 }
 return {decision:'DENY_NON_OWNER_STRATEGIC_OR_UNTRUSTED_COMMAND',
  applied:false,actual_access_granted:false};
}
export function candidatePrivilege({role_state,requested,owner_decision}={}){
 if(!policy.rewards.privileged_candidates.includes(requested))throw Error('EXCELLENCE_REWARD_NOT_IN_CATALOG');
 if(role_state?.state!=='EXCELLENCE_REWARD_CANDIDATE_LAB')
  return {decision:'DENY_EXCELLENCE_NOT_PROVEN',applied:false};
 if(owner_decision?.decision!=='OWNER_COMMAND_ACCEPTED_FOR_POLICY_GATE_ONLY')
  return {decision:'PENDING_AUTHENTICATED_OWNER',applied:false};
 return {decision:'PRIVILEGE_PROPOSAL_AWAITING_IAM_POLICY_COST_AND_ROLLBACK',
  requested,applied:false,api_token_issued:false,permissions_added:[],
  prod_authorized:false,new_subscription_eur:0};
}
export function replacementGate({old_state,candidate_state,old_new_tribunal,shadow_verified=false,
  rollback_verified=false,permission_parity=false,owner_decision}={}){
 const eligible=old_state?.state==='SUSPENDED_LAB'&&
  candidate_state?.can_dispatch_lab===true&&old_new_tribunal?.decision==='PASS'&&
  old_new_tribunal?.prod_authorized===false&&shadow_verified===true&&
  rollback_verified===true&&permission_parity===true&&
  owner_decision?.decision==='OWNER_COMMAND_ACCEPTED_FOR_POLICY_GATE_ONLY';
 return {decision:eligible?'CONTROLLED_LAB_REPLACEMENT_PLAN_ELIGIBLE':'REPLACEMENT_BLOCKED',
  executed:false,old_role_preserved:true,knowledge_preserved:true,
  prod_authorized:false,external_writes:0,rollback_execution_still_required:true};
}
export const UNIVERSAL_EXCELLENCE_V0_CONTRACT=Object.freeze({
 classes:[...classes],contexts:['company_id','engine_id','environment','version'],
 owner_only_strategy:true,owner_trusted_gateway_required:true,
 applies_to_meta_supervisors:true,fail_open:false,prod_authorized:false,
 real_api_access_enabled:false,real_replacement_enabled:false,
 additional_subscriptions_eur:0
});
