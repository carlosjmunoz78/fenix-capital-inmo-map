import test from 'node:test';import assert from 'node:assert/strict';import {planCompanyOffboarding} from '../company/company-offboarding.mjs';
const base={context:{company_id:'fenix',engine_id:'COMP-OFF-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,estimated_additional_cost_eur:0,legal_hold:false};
test('COMP-OFF creates reversible zero-cost offboarding plan',()=>{const r=planCompanyOffboarding(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.data_delete,false);assert.equal(r.restore_test_required,true)});
test('COMP-OFF blocks legal hold and cost',()=>{assert.equal(planCompanyOffboarding({...base,legal_hold:true}).reason,'LEGAL_REQUIRED');assert.equal(planCompanyOffboarding({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT')});
