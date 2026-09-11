import test from 'node:test';
import assert from 'node:assert/strict';
import {nextCompanyOnboardingStep} from '../company-onboarding.mjs';
const context={company_id:'fenix',engine_id:'COMP-ONB-001',environment:'SCAFFOLD',version:'0.1.0'};
test('advances deterministic next state',()=>{const r=nextCompanyOnboardingStep({context,current_state:'DISCOVERED',authorized:false,estimated_additional_cost_eur:0});assert.equal(r.status,'PLAN_READY');assert.equal(r.next_state,'REGISTERED');});
test('authorization gap fails closed',()=>{const r=nextCompanyOnboardingStep({context,current_state:'REGISTERED',authorized:false,estimated_additional_cost_eur:0});assert.equal(r.reason,'POLICY_CONFLICT');});
test('paid step requires MONEY_LIMIT',()=>{const r=nextCompanyOnboardingStep({context,current_state:'AUTHORIZED',authorized:true,estimated_additional_cost_eur:1});assert.equal(r.reason,'MONEY_LIMIT');});
test('PREPROD to production requires HIGH_RISK human gate',()=>{const r=nextCompanyOnboardingStep({context,current_state:'PREPROD_READY',authorized:true,estimated_additional_cost_eur:0});assert.equal(r.reason,'HIGH_RISK');assert.equal(r.next_state,'PRODUCTION');});
