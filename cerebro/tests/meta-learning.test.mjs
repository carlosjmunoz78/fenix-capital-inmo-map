import test from "node:test";
import assert from "node:assert/strict";
import {computeMetaMetrics,createMetaCandidate,detectLearningBottleneck,metaGate} from "../runtime/meta-learning.mjs";

test("meta metrics quantify learning yield and regressions",()=>{
 const m=computeMetaMetrics({candidates_evaluated:10,useful_improvements:3,evidence_cost:2,validated_gain:6,signal_at:"2026-09-19T00:00:00Z",validated_at:"2026-09-19T01:00:00Z",promoted_changes:4,regressions:1});
 assert.equal(m.learning_yield,.3); assert.equal(m.evidence_efficiency,3); assert.equal(m.regression_from_promoted_changes,.25);
});
test("meta candidate is versioned and cannot weaken gates",()=>{
 assert.throws(()=>createMetaCandidate({target_stage:"evaluate",prior_strategy_version:"1",candidate_strategy_version:"2",dataset_scope:"holdout",metric_definition:{x:1},leakage_checks:{pass:true},anti_gaming_checks:{pass:true},proposed_change:"lower threshold",reduces_requirements:true}));
});
test("bottleneck selects highest cost/latency stage",()=>{
 assert.deepEqual(detectLearningBottleneck({collect:2,evaluate:8,judge:3}),{stage:"evaluate",cost_or_latency:8});
});
test("meta change requires independent evaluation and judge",()=>{
 const c=createMetaCandidate({target_stage:"learn",prior_strategy_version:"1",candidate_strategy_version:"2",dataset_scope:"d",metric_definition:{yield:true},leakage_checks:{pass:true},anti_gaming_checks:{pass:true},proposed_change:"better sampling"});
 assert.equal(metaGate({candidate:c,independent_evaluation:true,independent_judge:false}).ok,false);
 assert.equal(metaGate({candidate:c,independent_evaluation:true,independent_judge:true}).ok,true);
});
