import crypto from "node:crypto";

export const ENVIRONMENTS = Object.freeze(["LAB","PREPROD","PROD"]);
export const RISK_CLASSES = Object.freeze(["LOW","MEDIUM","HIGH","CRITICAL"]);
export const JUDGE_DECISIONS = Object.freeze(["PASS","FAIL","MORE_EVIDENCE","HUMAN_REQUIRED"]);
export const PROMOTION_STATES = Object.freeze(["CANDIDATE","SHADOW","PREPROD","CANARY","ACTIVE","REJECTED","ROLLED_BACK"]);
export const KNOWLEDGE_STATES = Object.freeze(["CURRENT","VALIDATED","UNCERTAIN","STALE","SUPERSEDED","REJECTED","HISTORICAL"]);
export const HUMAN_REQUIRED_CODES = Object.freeze([
  "LEGAL_REQUIRED","SIGNATURE_REQUIRED","LOW_CONFIDENCE","HIGH_RISK",
  "POLICY_CONFLICT","SECURITY_INCIDENT","MONEY_LIMIT","CUSTOMER_HUMAN_REQUEST"
]);

const requiredLearningFields = Object.freeze([
  "learning_id","company_id","engine_id","environment","version","source_event_ids",
  "source_type","observed_at","hypothesis","expected_metric_delta","confidence",
  "risk_class","evidence_refs","promotion_state","created_by","reason"
]);

export function stableIdempotencyKey(parts) {
  if (!parts || typeof parts !== "object") throw new TypeError("parts must be an object");
  const canonical = Object.keys(parts).sort().map((k) => [k, parts[k]]);
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function validateLearningRecord(record) {
  const errors = [];
  if (!record || typeof record !== "object") return { ok:false, errors:["record must be an object"] };
  for (const key of requiredLearningFields) {
    if (record[key] === undefined || record[key] === null || record[key] === "") errors.push(`missing:${key}`);
  }
  if (!ENVIRONMENTS.includes(record.environment)) errors.push("invalid:environment");
  if (!RISK_CLASSES.includes(record.risk_class)) errors.push("invalid:risk_class");
  if (!PROMOTION_STATES.includes(record.promotion_state)) errors.push("invalid:promotion_state");
  if (!Array.isArray(record.source_event_ids) || record.source_event_ids.length === 0) errors.push("invalid:source_event_ids");
  if (!Array.isArray(record.evidence_refs) || record.evidence_refs.length === 0) errors.push("invalid:evidence_refs");
  if (typeof record.confidence !== "number" || record.confidence < 0 || record.confidence > 1) errors.push("invalid:confidence");
  if (record.judge_decision != null && !JUDGE_DECISIONS.includes(record.judge_decision)) errors.push("invalid:judge_decision");
  return { ok: errors.length === 0, errors };
}

export function validateImprovementPackage(pkg) {
  const errors = [];
  const required = [
    "baseline_version","candidate_version","scope","hypothesis","affected_contracts",
    "tests_before","tests_after","evaluation_before","evaluation_after",
    "cost_before","cost_after","risks","rollback","rebuild","judge","promotion_decision"
  ];
  if (!pkg || typeof pkg !== "object") return { ok:false, errors:["package must be an object"] };
  for (const key of required) {
    if (pkg[key] === undefined || pkg[key] === null || pkg[key] === "") errors.push(`missing:${key}`);
  }
  if (pkg.baseline_version === pkg.candidate_version) errors.push("candidate_must_differ_from_baseline");
  if (!Array.isArray(pkg.affected_contracts) || pkg.affected_contracts.length === 0) errors.push("invalid:affected_contracts");
  if (!Array.isArray(pkg.risks)) errors.push("invalid:risks");
  return { ok: errors.length === 0, errors };
}

export function canPromote({ record, improvementPackage, independentJudge=true, rollbackReady=true, policyLocked=true }) {
  const recordCheck = validateLearningRecord(record);
  const packageCheck = validateImprovementPackage(improvementPackage);
  const blockers = [...recordCheck.errors, ...packageCheck.errors];
  if (!independentJudge) blockers.push("judge_not_independent");
  if (!rollbackReady) blockers.push("rollback_not_ready");
  if (!policyLocked) blockers.push("policy_or_permissions_mutable_by_candidate");
  if (record?.judge_decision !== "PASS") blockers.push("judge_not_pass");
  if (!["PREPROD","CANARY","ACTIVE"].includes(record?.promotion_state)) blockers.push("promotion_state_not_promotable");
  return { ok:blockers.length===0, blockers };
}

export function checkpointContract({ company_id, engine_id, cursor, last_event_at }) {
  if (!company_id || !engine_id) throw new Error("company_id and engine_id are required");
  return {
    company_id,
    engine_id,
    cursor: cursor ?? null,
    last_event_at: last_event_at ?? null,
    idempotency_key: stableIdempotencyKey({company_id, engine_id, cursor:cursor ?? null, last_event_at:last_event_at ?? null})
  };
}
