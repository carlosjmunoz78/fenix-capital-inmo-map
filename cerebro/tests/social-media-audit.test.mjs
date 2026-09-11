import test from 'node:test';
import assert from 'node:assert/strict';
import {planSocialMediaAudit} from '../social/social-media-audit.mjs';
const context={company_id:'fenix',engine_id:'SOCAUD-001',environment:'SCAFFOLD',version:'0.1.0'};
test('SOCAUD-001 builds zero-cost public audit plan',()=>{const r=planSocialMediaAudit({context,authorized:true,profiles:['instagram.com/fenix','linkedin.com/company/fenix'],estimated_additional_cost_eur:0});assert.equal(r.status,'PLAN_READY');assert.equal(r.mode,'READ_ONLY_PUBLIC_AUDIT');assert.equal(r.executed,false);assert.equal(r.additional_cost_target_eur,0);assert.ok(r.checks.includes('branding_consistency'));});
test('SOCAUD-001 blocks unauthorized/cost/prod',()=>{assert.equal(planSocialMediaAudit({context,authorized:false,profiles:['x']}).reason,'POLICY_CONFLICT');assert.equal(planSocialMediaAudit({context,authorized:true,profiles:['x'],estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT');assert.equal(planSocialMediaAudit({context,authorized:true,profiles:['x'],requires_prod_write:true}).reason,'HIGH_RISK');});
test('SOCAUD-001 fails closed',()=>{assert.throws(()=>planSocialMediaAudit({context,authorized:true,profiles:[]}));assert.throws(()=>planSocialMediaAudit({context:{...context,engine_id:'WAUD-001'},authorized:true,profiles:['x']}));});
