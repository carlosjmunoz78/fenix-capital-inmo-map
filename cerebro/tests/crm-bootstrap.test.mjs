import test from 'node:test';import assert from 'node:assert/strict';import {planCrmBootstrap} from '../bootstrap/crm-bootstrap.mjs';
const base={context:{company_id:'fenix',engine_id:'CRMBOOT-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,estimated_additional_cost_eur:0,requires_prod_write:false};
test('CRMBOOT-001 returns zero-cost plan',()=>{const r=planCrmBootstrap(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.prod_writes,false);assert.equal(r.outputs.includes('rollback_plan'),true);});
test('CRMBOOT-001 blocks cost',()=>assert.equal(planCrmBootstrap({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT'));
test('CRMBOOT-001 blocks prod write',()=>assert.equal(planCrmBootstrap({...base,requires_prod_write:true}).reason,'HIGH_RISK'));
test('CRMBOOT-001 requires authorization',()=>assert.equal(planCrmBootstrap({...base,authorized:false}).reason,'POLICY_CONFLICT'));
