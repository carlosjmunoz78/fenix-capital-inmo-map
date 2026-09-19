import test from "node:test";
import assert from "node:assert/strict";
import {defineBenchmark,evaluateOldNew,tribunalDecision,validateEvaluatorChange} from "../runtime/evaluation-tribunal.mjs";
const b=defineBenchmark({benchmark_id:"b1",version:"1",metric:"score",holdout_ref:"secret",adversarial_refs:["a1"]});
const old={metrics:{score:.7}}, neu={metrics:{score:.8}};
test("holdout leakage fails closed",()=>assert.throws(()=>evaluateOldNew({benchmark:b,old_result:old,new_result:neu,candidate_visible_holdout:true})));
test("judge cannot be candidate",()=>{
 const e=evaluateOldNew({benchmark:b,old_result:old,new_result:neu});
 assert.equal(tribunalDecision({evaluation:e,judge_id:"NEW",candidate_actor_id:"NEW"}).decision,"FAIL");
});
test("Goodhart rejects metric win when real outcome worsens",()=>{
 const e=evaluateOldNew({benchmark:b,old_result:old,new_result:neu});
 const d=tribunalDecision({evaluation:e,judge_id:"JDG-001",candidate_actor_id:"LRN-001",real_outcome_delta:-1});
 assert.equal(d.reason,"GOODHART_DETECTED"); assert.equal(d.evaluator_improvement_candidate,true);
});
test("equal result asks for more evidence",()=>{
 const e=evaluateOldNew({benchmark:b,old_result:old,new_result:{metrics:{score:.7}}});
 assert.equal(tribunalDecision({evaluation:e,judge_id:"JDG-001",candidate_actor_id:"LRN-001"}).decision,"MORE_EVIDENCE");
});
test("evaluator cannot weaken itself without independent gate",()=>{
 assert.deepEqual(validateEvaluatorChange({reduces_requirements:true,independent_gate:false}),{ok:false,reason:"cannot_weaken_evaluator_without_independent_gate"});
});
