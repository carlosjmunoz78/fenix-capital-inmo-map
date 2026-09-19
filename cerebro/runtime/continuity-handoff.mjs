import { stableIdempotencyKey } from "./continuous-improvement-contract.mjs";

export const REQUIRED_HANDOFF_FILES=Object.freeze([
  "continuity_master_docx","exact_prompt_txt","continuity_state_json","handoff_readme_md"
]);

export function buildContinuityState({repository,branch,head,pr,runs,files,blocks,next_block,human_required=[],errors=[],decisions=[],live_verification_targets=[]}) {
  if(!repository||!branch||!head||!pr) throw new Error("live git state required");
  if(!Array.isArray(runs)||runs.length===0) throw new Error("CI evidence required");
  if(!blocks?.[next_block]) throw new Error("next_block must exist");
  const state={
    schema_version:"1.0",
    repository,branch,head,pr,runs,files:files??[],blocks,next_block,
    human_required,errors,decisions,live_verification_targets,
    generated_from_live_state:true,
    no_invented_sha:true
  };
  return {...state,state_id:stableIdempotencyKey({repository,branch,head,pr,next_block,runs})};
}

export function validatePreventiveHandoff({state,artifacts,context_pressure="NORMAL"}) {
  const reasons=[];
  if(!state?.generated_from_live_state) reasons.push("STATE_NOT_LIVE");
  for(const f of REQUIRED_HANDOFF_FILES) if(!artifacts?.[f]) reasons.push(`MISSING_${f.toUpperCase()}`);
  if(!Array.isArray(state?.live_verification_targets)||state.live_verification_targets.length<1) reasons.push("MISSING_MINIMAL_LIVE_TARGETS");
  if(!state?.next_block) reasons.push("MISSING_NEXT_BLOCK");
  return {ok:reasons.length===0,reasons,should_regenerate:["HIGH","CRITICAL"].includes(context_pressure)};
}

export function minimalResumePlan(state,current_head) {
  if(!state?.head||!state?.next_block) throw new Error("state incomplete");
  if(current_head===state.head) return {action:"RESUME_NEXT_BLOCK",next_block:state.next_block,verify:["PR","HEAD","CI"]};
  return {action:"VERIFY_NEW_HEAD_ONLY",next_block:state.next_block,verify:["PR","HEAD","CI","DIFF_FROM_HANDOFF_HEAD"]};
}
