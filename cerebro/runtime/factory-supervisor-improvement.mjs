import { stableIdempotencyKey } from "./continuous-improvement-contract.mjs";

export function detectRepeatedFailurePattern({error_class, engine_ids, occurrences, evidence_refs}) {
  if(!error_class) throw new Error("error_class required");
  if(!Array.isArray(engine_ids)||engine_ids.length<2) throw new Error("cross-engine evidence required");
  if(!Number.isInteger(occurrences)||occurrences<2) throw new Error("repetition required");
  if(!Array.isArray(evidence_refs)||evidence_refs.length<2) throw new Error("evidence required");
  return {
    pattern_id:stableIdempotencyKey({error_class,engine_ids:[...new Set(engine_ids)].sort(),occurrences}),
    error_class,engine_ids:[...new Set(engine_ids)],occurrences,evidence_refs,state:"VALIDATED_PATTERN"
  };
}

export function proposeFactoryVnext({pattern,current_scaffold_version,candidate_scaffold_version,new_contract_test,fixture_engine_ids}) {
  if(!pattern?.pattern_id) throw new Error("validated pattern required");
  if(!current_scaffold_version||!candidate_scaffold_version||current_scaffold_version===candidate_scaffold_version) throw new Error("versioned scaffold required");
  if(!new_contract_test) throw new Error("contract test required");
  if(!Array.isArray(fixture_engine_ids)||fixture_engine_ids.length===0) throw new Error("fixture engines required");
  return {
    candidate_id:stableIdempotencyKey({pattern:pattern.pattern_id,current_scaffold_version,candidate_scaffold_version,new_contract_test}),
    pattern_id:pattern.pattern_id,
    current_scaffold_version,candidate_scaffold_version,new_contract_test,
    fixture_engine_ids:[...new Set(fixture_engine_ids)],
    mutate_existing_engines:false,state:"FACTORY_CANDIDATE"
  };
}

export class ImprovementSupervisor {
  #ledger=new Map();
  open({candidate_id,evidence_ref,max_attempts=3}) {
    if(!candidate_id||!evidence_ref) throw new Error("candidate/evidence required");
    if(!Number.isInteger(max_attempts)||max_attempts<1||max_attempts>3) throw new Error("max_attempts 1..3");
    if(this.#ledger.has(candidate_id)) return {accepted:false,duplicate:true,...this.#ledger.get(candidate_id)};
    const item={candidate_id,evidence_ref,max_attempts,attempts:0,state:"OPEN",promoted:false,rollback_ref:null};
    this.#ledger.set(candidate_id,item); return {accepted:true,duplicate:false,...item};
  }
  attempt(candidate_id) {
    const x=this.#ledger.get(candidate_id); if(!x) throw new Error("unknown candidate");
    if(x.attempts>=x.max_attempts) return {...x,state:"EXHAUSTED"};
    x.attempts+=1; x.state="TESTING"; return {...x,backoff_seconds:[30,120,600][x.attempts-1]};
  }
  markJudged(candidate_id,{pass,rollback_ref}) {
    const x=this.#ledger.get(candidate_id); if(!x) throw new Error("unknown candidate");
    if(pass&&!rollback_ref) throw new Error("rollback required before promotion");
    x.state=pass?"JUDGED_PASS":"JUDGED_FAIL"; x.rollback_ref=rollback_ref??null; return {...x};
  }
  markPromoted(candidate_id) {
    const x=this.#ledger.get(candidate_id); if(!x) throw new Error("unknown candidate");
    if(x.promoted) return {...x,duplicate_promotion:true};
    if(x.state!=="JUDGED_PASS"||!x.rollback_ref) throw new Error("promotion gate not satisfied");
    x.promoted=true; x.state="PROMOTED"; return {...x,duplicate_promotion:false};
  }
}
