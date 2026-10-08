import {stableIdempotencyKey} from './continuous-improvement-contract.mjs';

export const REQUIRED_HANDOFF_ARTIFACTS=Object.freeze(['continuity_state_json','handoff_readme_md']);
export const RECOMMENDED_HANDOFF_ARTIFACTS=Object.freeze(['continuity_master_docx','exact_prompt_txt','recovery_audit_md']);

function validHead(head){return typeof head==='string'&&/^[0-9a-f]{40}$/i.test(head);}
function nonEmpty(value){return typeof value==='string'&&value.trim().length>0;}

export function buildContinuityState({repository,branch,head,pr,runs,files=[],blocks,next_block,human_required=[],errors=[],decisions=[],live_verification_targets=[]}){
  if(!nonEmpty(repository)||!nonEmpty(branch)||!validHead(head)) throw new Error('live git state required');
  if(!pr||!Number.isInteger(pr.number)||pr.number<1) throw new Error('live PR state required');
  if(!Array.isArray(runs)||runs.length===0) throw new Error('CI evidence required');
  if(!runs.every((run)=>run&&Number.isInteger(run.id)&&nonEmpty(run.status))) throw new Error('invalid CI run evidence');
  if(!blocks||typeof blocks!=='object'||!blocks[next_block]) throw new Error('next_block must exist');
  if(!Array.isArray(live_verification_targets)||live_verification_targets.length<1) throw new Error('minimal live verification targets required');
  const state={
    schema_version:'2.0.0',repository,branch,head,pr:{...pr},runs:runs.map((run)=>({...run})),files:[...files],blocks:{...blocks},next_block,
    human_required:[...human_required],errors:[...errors],decisions:[...decisions],live_verification_targets:[...live_verification_targets],
    generated_from_live_state:true,no_invented_sha:true,prod_authorized:false
  };
  return Object.freeze({...state,state_id:stableIdempotencyKey({repository,branch,head,pr_number:pr.number,next_block,runs:state.runs})});
}

export function validatePreventiveHandoff({state,artifacts,context_pressure='NORMAL'}){
  const reasons=[];
  if(!state?.generated_from_live_state||state?.no_invented_sha!==true) reasons.push('STATE_NOT_LIVE');
  if(!validHead(state?.head)) reasons.push('INVALID_HEAD');
  for(const artifact of REQUIRED_HANDOFF_ARTIFACTS) if(!artifacts?.[artifact]) reasons.push(`MISSING_${artifact.toUpperCase()}`);
  if(!Array.isArray(state?.live_verification_targets)||state.live_verification_targets.length<1) reasons.push('MISSING_MINIMAL_LIVE_TARGETS');
  if(!state?.next_block) reasons.push('MISSING_NEXT_BLOCK');
  return Object.freeze({ok:reasons.length===0,reasons,should_regenerate:['HIGH','CRITICAL'].includes(context_pressure),recommended_missing:RECOMMENDED_HANDOFF_ARTIFACTS.filter((x)=>!artifacts?.[x]),prod_authorized:false});
}

export function minimalResumePlan(state,current_head){
  if(!state?.head||!state?.next_block) throw new Error('state incomplete');
  if(!validHead(current_head)) throw new Error('current_head must be a live 40-char git SHA');
  if(current_head===state.head) return Object.freeze({action:'RESUME_NEXT_BLOCK',next_block:state.next_block,verify:['PR','HEAD','CI'],prod_authorized:false});
  return Object.freeze({action:'VERIFY_NEW_HEAD_ONLY',next_block:state.next_block,verify:['PR','HEAD','CI','DIFF_FROM_HANDOFF_HEAD'],prod_authorized:false});
}
