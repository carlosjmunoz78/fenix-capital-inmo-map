import test from "node:test";
import assert from "node:assert/strict";
import {createPromotionPlan,advancePromotion,postMonitor} from "../runtime/promotion-pipeline.mjs";
const mk=()=>createPromotionPlan({company_id:"f",engine_id:"LRN-001",baseline_version:"1",candidate_version:"2",judge_decision:"PASS",rollback_ref:"rb1",post_metrics:{error_rate:{max:.1}},canary_percent:5});

test("promotion requires judge, rollback and PREPROD",()=>{
 assert.throws(()=>createPromotionPlan({company_id:"f",engine_id:"x",baseline_version:"1",candidate_version:"2",judge_decision:"FAIL",rollback_ref:"r",post_metrics:{m:{max:1}}}));
 assert.throws(()=>createPromotionPlan({company_id:"f",engine_id:"x",baseline_version:"1",candidate_version:"2",judge_decision:"PASS",rollback_ref:"r",post_metrics:{m:{max:1}},environment:"PROD"}));
});
test("canary cannot become ACTIVE without explicit PROD authorization",()=>{
 let p=mk(); p=advancePromotion(p,{shadow_pass:true}); p=advancePromotion(p,{canary_pass:true});
 assert.equal(p.state,"CANARY"); assert.equal(advancePromotion(p).state,"CANARY");
 assert.equal(advancePromotion(p,{human_prod_authorized:true}).state,"ACTIVE");
});
test("post monitoring auto-selects rollback on threshold breach",()=>{
 const p=mk(); const r=postMonitor({plan:p,observed_metrics:{error_rate:.2}});
 assert.equal(r.decision,"ROLLBACK"); assert.equal(r.rollback_ref,"rb1");
});
test("healthy post monitoring keeps candidate",()=>{
 const p=mk(); assert.equal(postMonitor({plan:p,observed_metrics:{error_rate:.05}}).decision,"KEEP");
});
