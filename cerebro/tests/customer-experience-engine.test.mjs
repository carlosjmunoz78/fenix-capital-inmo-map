import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCustomerExperience} from '../customer/customer-experience-engine.mjs';
const context={company_id:'fenix',engine_id:'CX-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:0.9,source_refs:['c360:client-1'],touchpoints:[{channel:'email',stage:'lead',sentiment:0.5,response_minutes:30,issue_open:false},{channel:'phone',stage:'proposal',sentiment:-0.4,response_minutes:240,issue_open:true}]};
test('CX-001 creates read-only plan with score and actions',()=>{const r=evaluateCustomerExperience(base);assert.equal(r.status,'CX_PLAN_READY');assert.equal(r.read_only,true);assert.equal(r.plan_only,true);assert.equal(r.executed,false);assert.equal(r.prod_writes,false);assert.equal(r.source_of_truth_preserved,true);assert.ok(r.actions.includes('RESOLVE_OPEN_ISSUES'));assert.ok(r.actions.includes('REDUCE_RESPONSE_TIME'));});
test('CX-001 blocks PROD writes and unauthorized execution',()=>{assert.equal(evaluateCustomerExperience({...base,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(evaluateCustomerExperience({...base,authorized:false}).reason,'POLICY_CONFLICT');});
test('CX-001 honors explicit human request and low confidence',()=>{assert.equal(evaluateCustomerExperience({...base,customer_requests_human:true}).reason,'CUSTOMER_HUMAN_REQUEST');assert.equal(evaluateCustomerExperience({...base,confidence:0.2}).reason,'LOW_CONFIDENCE');});
test('CX-001 rejects missing evidence and unsafe context',()=>{assert.throws(()=>evaluateCustomerExperience({...base,source_refs:[]}));assert.throws(()=>evaluateCustomerExperience({...base,context:{...context,environment:'PROD'}}));});
