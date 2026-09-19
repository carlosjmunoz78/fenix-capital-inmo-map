import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEvent, observeOutcome, createEvidence, proposeCandidate } from "../runtime/learning-pipeline.mjs";
import { defineExperiment, recordArmResult } from "../runtime/experiment-pipeline.mjs";
import { defineBenchmark, evaluateOldNew, tribunalDecision } from "../runtime/evaluation-tribunal.mjs";
import { createPromotionPlan, advancePromotion, postMonitor } from "../runtime/promotion-pipeline.mjs";
import { computeMetaMetrics, createMetaCandidate, metaGate } from "../runtime/meta-learning.mjs";
import { cycleTelemetry, loopGuard } from "../runtime/rsi-observability-security.mjs";
import { assessKnowledge } from "../runtime/knowledge-obsolescence.mjs";
import { scopedKnowledge, transferCandidate } from "../runtime/multi-company-learning.mjs";

test("RSI governed E2E: outcome -> candidate -> experiment -> judge -> canary -> monitor -> meta",()=>{
  const raw={event_id:"evt-e2e",company_id:"fenix-capital",engine_id:"LRN-001",environment:"LAB",version:"1",occurred_at:"2026-09-19T00:00:00Z",source_type:"outcome",evidence_refs:["case:1"]};
  const ev=normalizeEvent(raw);
  const outcome=observeOutcome({event:ev,expected:.70,actual:.78,observed_at:"2026-09-19T00:10:00Z"});
  const evidence=createEvidence({outcome,refs:["case:1","result:1"],confidence:.9});
  const candidate=proposeCandidate({event:ev,outcome,evidence,hypothesis:"candidate improves success rate"});
  assert.equal(candidate.state,"CANDIDATE");

  const exp=defineExperiment({company_id:"fenix-capital",engine_id:"LRN-001",hypothesis:candidate.hypothesis,baseline_version:"old",candidate_version:"new",metrics:["score"],dataset_kind:"HOLDOUT",environment:"LAB"});
  const oldResult=recordArmResult({experiment_id:exp.experiment_id,arm:"OLD",metrics:{score:.70},evidence_refs:["old:holdout"]});
  const newResult=recordArmResult({experiment_id:exp.experiment_id,arm:"NEW",metrics:{score:.78},evidence_refs:["new:holdout"]});

  const benchmark=defineBenchmark({benchmark_id:"rsi-e2e",version:"1",metric:"score",holdout_ref:"secret:e2e",adversarial_refs:["adv:1"]});
  const evaluation=evaluateOldNew({benchmark,old_result:oldResult,new_result:newResult,candidate_visible_holdout:false});
  const judged=tribunalDecision({evaluation,judge_id:"JDG-001",candidate_actor_id:"LRN-001",real_outcome_delta:.08});
  assert.equal(judged.decision,"PASS");

  let promotion=createPromotionPlan({company_id:"fenix-capital",engine_id:"LRN-001",baseline_version:"old",candidate_version:"new",judge_decision:judged.decision,rollback_ref:"rollback:e2e",post_metrics:{error_rate:{max:.10}},canary_percent:5});
  promotion=advancePromotion(promotion,{shadow_pass:true});
  promotion=advancePromotion(promotion,{canary_pass:true});
  assert.equal(promotion.state,"CANARY");
  assert.equal(promotion.prod_write_authorized,false);
  const monitored=postMonitor({plan:promotion,observed_metrics:{error_rate:.05}});
  assert.equal(monitored.decision,"KEEP");

  const meta=computeMetaMetrics({candidates_evaluated:1,useful_improvements:1,evidence_cost:1,validated_gain:.08,signal_at:"2026-09-19T00:00:00Z",validated_at:"2026-09-19T01:00:00Z",promoted_changes:1,regressions:0});
  assert.equal(meta.learning_yield,1);
  const metaCandidate=createMetaCandidate({target_stage:"learn",prior_strategy_version:"1",candidate_strategy_version:"2",dataset_scope:"e2e",metric_definition:{learning_yield:true},leakage_checks:{pass:true},anti_gaming_checks:{pass:true},proposed_change:"prioritize higher-evidence candidates"});
  assert.equal(metaGate({candidate:metaCandidate,independent_evaluation:true,independent_judge:true}).ok,true);

  const telemetry=cycleTelemetry({company_id:"fenix-capital",engine_id:"SUP-001",cycle_id:"e2e",started_at:"2026-09-19T00:00:00Z",ended_at:"2026-09-19T00:00:02Z",cost_eur:0,candidates:1,useful_improvements:1,attempts:1});
  assert.equal(telemetry.cost_per_cycle,0);
  assert.equal(loopGuard({attempts:1,cost_eur:0,budget_eur:0}).allowed,true);

  const stale=assessKnowledge({confidence:.9,age_ms:20,ttl_ms:10});
  assert.equal(stale.state,"STALE");
  assert.equal(stale.delete_original,false);

  const globalRule=scopedKnowledge({company_id:"fenix-capital",engine_id:"LRN-001",rule_id:"r-e2e",scope:"GLOBAL_CANDIDATE",context_signature:"mortgage-spain",evidence_refs:["e2e"]});
  const transfer=transferCandidate({source:globalRule,target_company_id:"other-company",target_context_signature:"mortgage-spain",context_compatible:true});
  assert.equal(transfer.state,"TRANSFER_CANDIDATE");
  assert.equal(transfer.requires_local_validation,true);
});
