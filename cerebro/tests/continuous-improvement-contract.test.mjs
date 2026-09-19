import test from "node:test";
import assert from "node:assert/strict";
import {
  stableIdempotencyKey, validateLearningRecord, validateImprovementPackage,
  canPromote, checkpointContract
} from "../runtime/continuous-improvement-contract.mjs";

const learningRecord = {
  learning_id:"11111111-1111-1111-1111-111111111111",
  company_id:"fenix-capital",
  engine_id:"LRN-001",
  environment:"PREPROD",
  version:"0.1.0",
  source_event_ids:["evt-1"],
  source_type:"outcome",
  observed_at:"2026-09-19T00:00:00Z",
  outcome_at:"2026-09-19T00:05:00Z",
  hypothesis:"candidate reduces repeated errors",
  previous_behavior_ref:"old",
  candidate_behavior_ref:"new",
  expected_metric_delta:{repeated_error_rate:-0.1},
  actual_metric_delta:{repeated_error_rate:-0.12},
  confidence:0.9,
  risk_class:"LOW",
  evidence_refs:["evidence:1"],
  experiment_id:"exp-1",
  evaluation_id:"eval-1",
  judge_decision:"PASS",
  promotion_state:"CANARY",
  rollback_ref:"rollback-1",
  created_by:"LRN-001",
  reason:"validated outcome delta",
  result:"improved"
};

const improvementPackage = {
  baseline_version:"old",
  candidate_version:"new",
  scope:"engine",
  hypothesis:"candidate reduces repeated errors",
  affected_contracts:["LRN-001"],
  tests_before:{pass:true},
  tests_after:{pass:true},
  evaluation_before:{score:0.7},
  evaluation_after:{score:0.85},
  cost_before:{eur:0},
  cost_after:{eur:0},
  risks:[],
  rollback:{ref:"rollback-1"},
  rebuild:{ref:"rebuild-1"},
  shadow_result:{pass:true},
  canary_result:{pass:true},
  judge:{id:"JDG-001",independent:true},
  promotion_decision:"PASS"
};

test("idempotency key is stable independent of object key order", () => {
  assert.equal(stableIdempotencyKey({b:2,a:1}), stableIdempotencyKey({a:1,b:2}));
});

test("learning record requires provenance, company, engine and evidence", () => {
  assert.equal(validateLearningRecord(learningRecord).ok, true);
  const bad = {...learningRecord, evidence_refs:[]};
  assert.equal(validateLearningRecord(bad).ok, false);
});

test("improvement package requires OLD vs NEW and rollback", () => {
  assert.equal(validateImprovementPackage(improvementPackage).ok, true);
  assert.equal(validateImprovementPackage({...improvementPackage,candidate_version:"old"}).ok, false);
});

test("promotion fails closed without independent judge", () => {
  const result = canPromote({record:learningRecord, improvementPackage, independentJudge:false});
  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes("judge_not_independent"));
});

test("promotion fails closed without rollback", () => {
  const result = canPromote({record:learningRecord, improvementPackage, rollbackReady:false});
  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes("rollback_not_ready"));
});

test("candidate cannot weaken policy gate", () => {
  const result = canPromote({record:learningRecord, improvementPackage, policyLocked:false});
  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes("policy_or_permissions_mutable_by_candidate"));
});

test("checkpoint contract is multiempresa and deterministic", () => {
  const a = checkpointContract({company_id:"fenix-capital",engine_id:"LRN-001",cursor:"42",last_event_at:"2026-09-19T00:00:00Z"});
  const b = checkpointContract({company_id:"fenix-capital",engine_id:"LRN-001",cursor:"42",last_event_at:"2026-09-19T00:00:00Z"});
  assert.equal(a.idempotency_key,b.idempotency_key);
  assert.equal(a.company_id,"fenix-capital");
});
