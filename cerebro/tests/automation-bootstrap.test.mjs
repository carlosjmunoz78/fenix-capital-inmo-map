import test from 'node:test';import assert from 'node:assert/strict';import {planAutomationBootstrap} from '../bootstrap/automation-bootstrap.mjs';
const base={context:{company_id:'fenix',engine_id:'AUTBOOT-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,estimated_additional_cost_eur:0,requires_prod_write:false};
test('AUTBOOT-001 returns safe plan',()=>{const r=planAutomationBootstrap(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.outputs.includes('idempotency_plan'),true);assert.equal(r.outputs.includes('rollback_plan'),true);});
test('AUTBOOT-001 blocks cost',()=>assert.equal(planAutomationBootstrap({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT'));
test('AUTBOOT-001 blocks prod write',()=>assert.equal(planAutomationBootstrap({...base,requires_prod_write:true}).reason,'HIGH_RISK'));
test('AUTBOOT-001 requires authorization',()=>assert.equal(planAutomationBootstrap({...base,authorized:false}).reason,'POLICY_CONFLICT'));
