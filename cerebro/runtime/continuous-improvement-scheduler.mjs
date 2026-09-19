import { stableIdempotencyKey } from "./continuous-improvement-contract.mjs";

export const CADENCES = Object.freeze({
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  EVENT: "EVENT"
});

export const EVENT_TRIGGERS = Object.freeze([
  "REPEATED_FAILURE","REGRESSION","HUMAN_CORRECTION","CEREBRO_HUMAN_DIFF",
  "EXTERNAL_CHANGE","EXPERIMENT_RESULT","INCIDENT","COST_SPIKE",
  "LATENCY_SPIKE","PERFORMANCE_DEGRADATION","NEW_CAPABILITY"
]);

export function createCyclePlan({
  company_id, engine_id, cadence, now, checkpoint=null, event_type=null,
  max_attempts=3, budget_eur=0
}) {
  if (!company_id || !engine_id) throw new Error("company_id and engine_id required");
  if (!Object.values(CADENCES).includes(cadence)) throw new Error("invalid cadence");
  if (cadence === CADENCES.EVENT && !EVENT_TRIGGERS.includes(event_type)) throw new Error("invalid event trigger");
  if (!Number.isInteger(max_attempts) || max_attempts < 1 || max_attempts > 3) throw new Error("max_attempts must be 1..3");
  if (typeof budget_eur !== "number" || budget_eur < 0) throw new Error("invalid budget");
  const timestamp = new Date(now).toISOString();
  const lock_key = stableIdempotencyKey({company_id,engine_id,cadence,event_type:event_type ?? null,checkpoint});
  return {
    company_id, engine_id, cadence, event_type:event_type ?? null,
    scheduled_at: timestamp,
    checkpoint,
    lock_key,
    max_attempts,
    backoff_seconds:[30,120,600].slice(0,max_attempts),
    budget_eur,
    execution_mode:"INCREMENTAL",
    allow_prod_writes:false
  };
}

export function shouldRunHorizon({cadence, last_run_at, now}) {
  const current = new Date(now);
  if (Number.isNaN(current.getTime())) throw new Error("invalid now");
  if (!last_run_at) return true;
  const last = new Date(last_run_at);
  if (Number.isNaN(last.getTime())) throw new Error("invalid last_run_at");
  const elapsed = current.getTime() - last.getTime();
  const day = 24*60*60*1000;
  if (cadence === CADENCES.DAILY) return elapsed >= day;
  if (cadence === CADENCES.WEEKLY) return elapsed >= 7*day;
  if (cadence === CADENCES.MONTHLY) return elapsed >= 28*day;
  if (cadence === CADENCES.EVENT) return true;
  throw new Error("invalid cadence");
}

export function nextRetry({attempt, max_attempts=3}) {
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error("invalid attempt");
  if (attempt >= max_attempts) return {retry:false, human_required:false, exhausted:true};
  const backoff=[30,120,600][attempt-1] ?? 600;
  return {retry:true, after_seconds:backoff, exhausted:false};
}

export function eventToCandidate(event_type) {
  if (!EVENT_TRIGGERS.includes(event_type)) throw new Error("invalid event trigger");
  return {
    candidate_type: ["INCIDENT","REPEATED_FAILURE","REGRESSION"].includes(event_type)
      ? "IMPROVEMENT_CANDIDATE"
      : "LEARNING_CANDIDATE",
    priority: ["INCIDENT","REGRESSION","COST_SPIKE"].includes(event_type) ? "HIGH" : "NORMAL"
  };
}
