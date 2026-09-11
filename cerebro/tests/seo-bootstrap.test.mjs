import test from 'node:test';import assert from 'node:assert/strict';import {planSeoBootstrap} from '../bootstrap/seo-bootstrap.mjs';
const base={context:{company_id:'fenix',engine_id:'SEOBOOT-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,estimated_additional_cost_eur:0,requires_prod_write:false};
test('SEOBOOT-001 returns zero-cost read-only plan',()=>{const r=planSeoBootstrap(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.mode,'READ_ONLY_BOOTSTRAP_PLAN');assert.equal(r.additional_cost_target_eur,0);assert.equal(r.prerequisites.includes('KW-001'),true);});
test('SEOBOOT-001 blocks cost',()=>{assert.equal(planSeoBootstrap({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT');});
test('SEOBOOT-001 blocks prod write',()=>{assert.equal(planSeoBootstrap({...base,requires_prod_write:true}).reason,'HIGH_RISK');});
test('SEOBOOT-001 requires authorization',()=>{assert.equal(planSeoBootstrap({...base,authorized:false}).reason,'POLICY_CONFLICT');});
