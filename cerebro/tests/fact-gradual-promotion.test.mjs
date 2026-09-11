import test from 'node:test';import assert from 'node:assert/strict';import {planGradualPromotion} from '../factory/fact-gradual-promotion.mjs';
const base={context:{company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',version:'0.1.0'},evidence_refs:['run://1'],rollback_verified:true,preprod_passed:true,initial_traffic_percent:10,prod_requested:false,autonomy_approved:false};
test('FACT gradual promotion creates staged plan',()=>{const r=planGradualPromotion(base);assert.equal(r.status,'PROMOTION_PLAN_READY');assert.deepEqual(r.steps,[10,20,100])});
test('FACT gradual promotion blocks missing rollback',()=>{assert.equal(planGradualPromotion({...base,rollback_verified:false}).status,'BLOCKED')});
test('FACT gradual promotion requires human for PROD without autonomy',()=>{assert.equal(planGradualPromotion({...base,prod_requested:true}).reason,'HIGH_RISK')});
