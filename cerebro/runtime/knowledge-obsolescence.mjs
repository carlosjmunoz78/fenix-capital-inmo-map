export const KNOWLEDGE_STATES=Object.freeze(["CURRENT","VALIDATED","UNCERTAIN","STALE","SUPERSEDED","REJECTED","HISTORICAL"]);

export function assessKnowledge({state="CURRENT",confidence,age_ms,ttl_ms,drift=false,contradictions=0,replacement_ref=null}) {
  if(!KNOWLEDGE_STATES.includes(state)) throw new Error("invalid state");
  if(typeof confidence!=="number"||confidence<0||confidence>1) throw new Error("invalid confidence");
  if(!Number.isFinite(age_ms)||age_ms<0||!Number.isFinite(ttl_ms)||ttl_ms<=0) throw new Error("invalid time");
  let next=state, nextConfidence=confidence, reason="UNCHANGED";
  if(drift||contradictions>0){next="UNCERTAIN";nextConfidence=Math.max(0,confidence-(drift?.15:0)-Math.min(.4,contradictions*.1));reason="DRIFT_OR_CONTRADICTION";}
  if(age_ms>ttl_ms){next="STALE";nextConfidence=Math.min(nextConfidence,.49);reason="TTL_EXPIRED";}
  if(replacement_ref){next="SUPERSEDED";reason="REPLACEMENT_VALIDATED";}
  return {state:next,confidence:Number(nextConfidence.toFixed(4)),reason,replacement_ref,history_preserved:true,delete_original:false};
}

export function historicalTransition({prior_state,next_state,evidence_ref}) {
  if(!KNOWLEDGE_STATES.includes(prior_state)||!KNOWLEDGE_STATES.includes(next_state)) throw new Error("invalid state");
  if(!evidence_ref) throw new Error("evidence required");
  return {prior_state,next_state,evidence_ref,append_history:true,destructive_delete:false};
}
