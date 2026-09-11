import test from 'node:test';import assert from 'node:assert/strict';import {planMarketingBootstrap} from '../bootstrap/marketing-bootstrap.mjs';
const base={context:{company_id:'fenix',engine_id:'MKTBOOT-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,estimated_additional_cost_eur:0,requires_prod_write:false};
test('MKTBOOT-001 returns zero-cost read-only plan',()=>{const r=planMarketingBootstrap(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.mode,'READ_ONLY_BOOTSTRAP_PLAN');assert.equal(r.prerequisites.includes('SEOBOOT-001'),true);assert.equal(r.prerequisites.includes('SOCBOOT-001'),true);});
test('MKTBOOT-001 blocks cost',()=>{assert.equal(planMarketingBootstrap({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT');});
test('MKTBOOT-001 blocks prod write',()=>{assert.equal(planMarketingBootstrap({...base,requires_prod_write:true}).reason,'HIGH_RISK');});
test('MKTBOOT-001 requires authorization',()=>{assert.equal(planMarketingBootstrap({...base,authorized:false}).reason,'POLICY_CONFLICT');});
