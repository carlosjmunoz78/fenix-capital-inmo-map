import test from 'node:test';
import assert from 'node:assert/strict';
import {assessVendorContract} from '../vendors/vendor-contract-engine.mjs';
const ctx={company_id:'co1',engine_id:'VCON-001',environment:'PREPROD',version:'0.1.0'};
test('finds missing clauses',()=>{const r=assessVendorContract({context:ctx,authorized:true,confidence:.9,source_refs:['vcon:1'],contract_ref:'c1',clauses:[{type:'SCOPE'},{type:'PRICE'}]}); assert.equal(r.status,'CONTRACT_GAPS_FOUND'); assert.equal(r.signature_execute,false);});
test('escalates risky clause',()=>{const r=assessVendorContract({context:ctx,authorized:true,confidence:.9,source_refs:['vcon:2'],contract_ref:'c2',clauses:[{type:'SCOPE',risk_score:80}]}); assert.equal(r.reason,'LEGAL_REQUIRED');});
test('gates low confidence',()=>{assert.equal(assessVendorContract({context:ctx,authorized:true,confidence:.5,source_refs:['x'],contract_ref:'c',clauses:[]}).reason,'LOW_CONFIDENCE');});
