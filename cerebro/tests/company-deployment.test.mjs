import test from 'node:test';import assert from 'node:assert/strict';import {planCompanyDeployment} from '../company/company-deployment.mjs';
const base={context:{company_id:'fenix',engine_id:'COMP-DEP-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,requires_prod_write:false,estimated_additional_cost_eur:0};
test('COMP-DEP creates gated deployment plan',()=>{const r=planCompanyDeployment(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.deployment_gates.includes('rollback_test'),true)});
test('COMP-DEP blocks prod write',()=>{assert.equal(planCompanyDeployment({...base,requires_prod_write:true}).reason,'HIGH_RISK')});
test('COMP-DEP blocks cost',()=>{assert.equal(planCompanyDeployment({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT')});
