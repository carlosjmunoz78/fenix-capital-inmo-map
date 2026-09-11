import test from 'node:test';import assert from 'node:assert/strict';import {buildExecutionContract} from '../execution/execution-contract.mjs';
const base={context:{company_id:'fenix',identity_id:'id-1',account_id:'acc-1',engine_id:'CMD-001',environment:'LAB',version:'0.1.0'},request_id:'r1',connector_id:'conn-1',action:'read',policy_result:'ALLOW',evidence_ref:'run://1',cost_eur:0,secret_payload_included:false};
test('builds canonical execution record',()=>{const r=buildExecutionContract(base);assert.equal(r.status,'EXECUTION_CONTRACT_READY');assert.equal(r.execution.company_id,'fenix');assert.equal(r.verify_required,true)});
test('blocks unapproved cost',()=>{assert.equal(buildExecutionContract({...base,cost_eur:1}).reason,'MONEY_LIMIT')});
test('blocks secret payload',()=>{assert.equal(buildExecutionContract({...base,secret_payload_included:true}).reason,'SECURITY_INCIDENT')});
