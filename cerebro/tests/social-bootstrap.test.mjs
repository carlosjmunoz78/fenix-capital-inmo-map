import test from 'node:test';import assert from 'node:assert/strict';import {planSocialBootstrap} from '../bootstrap/social-bootstrap.mjs';
const base={context:{company_id:'fenix',engine_id:'SOCBOOT-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,estimated_additional_cost_eur:0,requires_prod_write:false};
test('SOCBOOT-001 returns zero-cost read-only plan',()=>{const r=planSocialBootstrap(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.mode,'READ_ONLY_BOOTSTRAP_PLAN');assert.equal(r.prerequisites.includes('SOCAUD-001'),true);});
test('SOCBOOT-001 blocks cost',()=>{assert.equal(planSocialBootstrap({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT');});
test('SOCBOOT-001 blocks prod write',()=>{assert.equal(planSocialBootstrap({...base,requires_prod_write:true}).reason,'HIGH_RISK');});
test('SOCBOOT-001 requires authorization',()=>{assert.equal(planSocialBootstrap({...base,authorized:false}).reason,'POLICY_CONFLICT');});
