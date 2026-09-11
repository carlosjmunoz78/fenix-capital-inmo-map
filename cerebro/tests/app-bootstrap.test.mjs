import test from 'node:test';import assert from 'node:assert/strict';import {planAppBootstrap} from '../bootstrap/app-bootstrap.mjs';
const base={context:{company_id:'fenix',engine_id:'APPBOOT-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,estimated_additional_cost_eur:0,requires_prod_write:false};
test('APPBOOT-001 returns safe plan',()=>{const r=planAppBootstrap(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.outputs.includes('behavioral_test_plan'),true);assert.equal(r.outputs.includes('rollback_plan'),true);});
test('APPBOOT-001 blocks cost',()=>assert.equal(planAppBootstrap({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT'));
test('APPBOOT-001 blocks prod write',()=>assert.equal(planAppBootstrap({...base,requires_prod_write:true}).reason,'HIGH_RISK'));
test('APPBOOT-001 requires authorization',()=>assert.equal(planAppBootstrap({...base,authorized:false}).reason,'POLICY_CONFLICT'));
