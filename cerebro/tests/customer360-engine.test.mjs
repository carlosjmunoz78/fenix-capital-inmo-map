import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCustomer360Plan} from '../customer/customer360-engine.mjs';

const context={company_id:'fenix',engine_id:'C360-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,record_scope_confirmed:true,requires_prod_write:false,confidence:0.95,customer_ref:'customer:demo',source_refs:['crm:customer:demo','docs:customer:demo']};

test('C360-001 builds read-only aggregation plan',()=>{const r=buildCustomer360Plan(base);assert.equal(r.status,'C360_PLAN_READY');assert.equal(r.read_only,true);assert.equal(r.source_of_truth_preserved,true);assert.equal(r.executed,false);assert.equal(r.prod_writes,false);assert.equal(r.cross_company_access,'deny');});
test('C360-001 gates writes, auth, scope and confidence',()=>{assert.equal(buildCustomer360Plan({...base,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(buildCustomer360Plan({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(buildCustomer360Plan({...base,record_scope_confirmed:false}).reason,'POLICY_CONFLICT');assert.equal(buildCustomer360Plan({...base,confidence:0.2}).reason,'LOW_CONFIDENCE');});
test('C360-001 rejects unsupported domains and unsafe env',()=>{assert.throws(()=>buildCustomer360Plan({...base,requested_domains:['secrets']}));assert.throws(()=>buildCustomer360Plan({...base,context:{...context,environment:'PROD'}}));});
