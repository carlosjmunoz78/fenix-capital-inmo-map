import test from 'node:test';
import assert from 'node:assert/strict';
import {routeBank} from '../banking/bank-routing-engine.mjs';
const context={company_id:'fenix',engine_id:'BNK-003',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:.95,source_refs:['case:1'],denial_reason:'DTI',subsanable:true,attempts:1,max_attempts:3,next_bank_available:true};
test('BNK-003 retries same bank when remediable',()=>{const r=routeBank(base);assert.equal(r.status,'BANK_ROUTE_READY');assert.equal(r.next_action,'RETRY_SAME_BANK_AFTER_REMEDIATION');assert.equal(r.remaining_attempts,2);});
test('BNK-003 routes next bank when not remediable',()=>{const r=routeBank({...base,subsanable:false});assert.equal(r.next_action,'ROUTE_NEXT_BANK');});
test('BNK-003 stops at attempt limit',()=>{const r=routeBank({...base,attempts:3});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'HIGH_RISK');});
test('BNK-003 enforces evidence and policy',()=>{assert.equal(routeBank({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(routeBank({...base,confidence:.2}).reason,'LOW_CONFIDENCE');assert.throws(()=>routeBank({...base,source_refs:[]}));});
