import test from 'node:test';
import assert from 'node:assert/strict';
import {planNegotiation} from '../banking/bank-negotiation-engine.mjs';
const context={company_id:'fenix',engine_id:'BNK-006',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:.95,source_refs:['bnk:history'],bank:'BankA',benchmark:{rate_pct:2.5},current_offer:{rate_pct:3.1},approved_range:{min_rate_pct:2.4,max_rate_pct:2.8}};
test('BNK-006 creates bounded plan',()=>{const r=planNegotiation(base);assert.equal(r.status,'BANK_NEGOTIATION_PLAN_READY');assert.equal(r.target_rate_pct,2.5);assert.equal(r.within_approved_range,true);assert.ok(r.arguments.includes('BENCHMARK_GAP'));assert.equal(r.external_communication,false);assert.equal(r.executed,false);});
test('BNK-006 enforces policy and evidence',()=>{assert.equal(planNegotiation({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(planNegotiation({...base,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(planNegotiation({...base,confidence:.1}).reason,'LOW_CONFIDENCE');assert.throws(()=>planNegotiation({...base,source_refs:[]}));});
