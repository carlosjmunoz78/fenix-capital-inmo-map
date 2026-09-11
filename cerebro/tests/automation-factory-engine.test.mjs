import test from 'node:test';
import assert from 'node:assert/strict';
import {planAutomation} from '../platform/automation-factory-engine.mjs';
const context={company_id:'fenix',engine_id:'AUTO-001',environment:'PREPROD',version:'0.1.0'};
const input={context,authorized:true,confidence:.95,trigger:{type:'EVENT'},actions:[{type:'CALL_ENGINE',target_engine_id:'DOC-001'},{type:'WRITE_AUDIT'}]};
test('builds plan only and requires QA/policy',()=>{const r=planAutomation(input);assert.equal(r.status,'AUTOMATION_PLAN');assert.equal(r.qa_required,true);assert.equal(r.policy_gate_required,true);assert.equal(r.executed,false)});
test('blocks unsafe writes, sends and spend',()=>{assert.equal(planAutomation({...input,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(planAutomation({...input,requires_external_send:true}).reason,'HIGH_RISK');assert.equal(planAutomation({...input,estimated_cost_eur:1}).reason,'MONEY_LIMIT')});
test('fails closed on confidence/context/action',()=>{assert.equal(planAutomation({...input,confidence:.3}).reason,'LOW_CONFIDENCE');assert.throws(()=>planAutomation({...input,context:{...context,environment:'PROD'}}),/UNSAFE_CONTEXT/);assert.throws(()=>planAutomation({...input,actions:[{type:'SHELL'}]}),/INVALID_ACTION_0/)});
