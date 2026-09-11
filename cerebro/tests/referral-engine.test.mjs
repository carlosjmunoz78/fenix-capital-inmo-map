import test from 'node:test';
import assert from 'node:assert/strict';
import {planReferral} from '../customer/referral-engine.mjs';
const context={company_id:'fenix',engine_id:'REF-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:0.9,source_refs:['post:1'],satisfaction_score:92,relationship_stage:'POSTSIGNATURE'};
test('REF-001 prepares referral and testimonial plan',()=>{const r=planReferral(base);assert.equal(r.status,'REFERRAL_PLAN_READY');assert.equal(r.eligible,true);assert.ok(r.actions.includes('ASK_FOR_REFERRAL'));assert.ok(r.actions.includes('ASK_FOR_TESTIMONIAL'));assert.equal(r.executed,false);});
test('REF-001 blocks PROD writes and unauthorized use',()=>{assert.equal(planReferral({...base,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(planReferral({...base,authorized:false}).reason,'POLICY_CONFLICT');});
test('REF-001 honors human request and low confidence',()=>{assert.equal(planReferral({...base,customer_requests_human:true}).reason,'CUSTOMER_HUMAN_REQUEST');assert.equal(planReferral({...base,confidence:0.2}).reason,'LOW_CONFIDENCE');});
test('REF-001 nurtures before referral when not eligible',()=>{const r=planReferral({...base,satisfaction_score:60});assert.equal(r.eligible,false);assert.ok(r.actions.includes('NURTURE_BEFORE_REFERRAL'));});
