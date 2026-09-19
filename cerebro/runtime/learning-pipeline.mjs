import { stableIdempotencyKey } from "./continuous-improvement-contract.mjs";

export function normalizeEvent(event) {
  if (!event || typeof event !== "object") throw new Error("event required");
  const required=["event_id","company_id","engine_id","environment","version","occurred_at","source_type"];
  for (const k of required) if (!event[k]) throw new Error(`missing:${k}`);
  const normalized={
    event_id:String(event.event_id),
    company_id:String(event.company_id),
    engine_id:String(event.engine_id),
    environment:String(event.environment),
    version:String(event.version),
    occurred_at:new Date(event.occurred_at).toISOString(),
    source_type:String(event.source_type),
    payload:event.payload ?? {},
    evidence_refs:Array.isArray(event.evidence_refs)?[...new Set(event.evidence_refs)]:[]
  };
  normalized.dedupe_key=stableIdempotencyKey({
    company_id:normalized.company_id,
    engine_id:normalized.engine_id,
    event_id:normalized.event_id,
    version:normalized.version
  });
  return normalized;
}

export function observeOutcome({event, expected, actual, observed_at}) {
  const e=normalizeEvent(event);
  if (expected === undefined || actual === undefined) throw new Error("expected and actual required");
  return {
    outcome_id:stableIdempotencyKey({dedupe_key:e.dedupe_key,observed_at}),
    event_id:e.event_id,
    company_id:e.company_id,
    engine_id:e.engine_id,
    expected,
    actual,
    delta: typeof expected==="number" && typeof actual==="number" ? actual-expected : null,
    observed_at:new Date(observed_at).toISOString(),
    evidence_refs:e.evidence_refs
  };
}

export function createEvidence({outcome, refs, confidence}) {
  if (!outcome?.outcome_id) throw new Error("outcome required");
  if (!Array.isArray(refs) || refs.length===0) throw new Error("evidence refs required");
  if (typeof confidence!=="number" || confidence<0 || confidence>1) throw new Error("invalid confidence");
  return {
    evidence_id:stableIdempotencyKey({outcome_id:outcome.outcome_id,refs:[...refs].sort()}),
    outcome_id:outcome.outcome_id,
    refs:[...new Set(refs)],
    confidence,
    provenance_locked:true
  };
}

export function proposeCandidate({event,outcome,evidence,hypothesis,causal_claim=false}) {
  if (!evidence?.provenance_locked) throw new Error("evidence must be provenance locked");
  if (!hypothesis) throw new Error("hypothesis required");
  if (causal_claim) throw new Error("causal claims require separate experiment evidence");
  const e=normalizeEvent(event);
  return {
    candidate_id:stableIdempotencyKey({event:e.dedupe_key,outcome:outcome.outcome_id,hypothesis}),
    company_id:e.company_id,
    engine_id:e.engine_id,
    environment:e.environment,
    hypothesis,
    evidence_id:evidence.evidence_id,
    confidence:evidence.confidence,
    state:"CANDIDATE",
    causal_claim:false
  };
}

export function dedupeByKey(records, key="dedupe_key") {
  const seen=new Set();
  return records.filter((r)=>{
    const v=r?.[key];
    if (!v || seen.has(v)) return false;
    seen.add(v);
    return true;
  });
}
