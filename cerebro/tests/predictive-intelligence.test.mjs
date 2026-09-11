import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreEarlySignal} from '../predictive-intelligence.mjs';
const context={company_id:'fenix',engine_id:'FRC-001',environment:'SCAFFOLD',version:'0.1.0'};
const signal={signal_id:'sig-1',observed_at:'2026-09-11T00:00:00Z',source_ref:'evidence://sig-1',confidence:0.9,impact:90,urgency:80,reversibility:90,cost_eur:0};
test('scores strong early signal',()=>{const r=scoreEarlySignal({context,signal,prod_write:false,trading_access:false});assert.equal(r.status,'EARLY_SIGNAL_SCORED');assert.equal(r.decision,'ACT_PLAN');assert.equal(r.executed,false);});
test('low confidence requires human',()=>{const r=scoreEarlySignal({context,signal:{...signal,confidence:0.5},prod_write:false,trading_access:false});assert.equal(r.reason,'LOW_CONFIDENCE');});
test('paid action requires MONEY_LIMIT',()=>{const r=scoreEarlySignal({context,signal:{...signal,cost_eur:1},prod_write:false,trading_access:false});assert.equal(r.reason,'MONEY_LIMIT');});
test('prod/trading fail closed',()=>{assert.equal(scoreEarlySignal({context,signal,prod_write:true,trading_access:false}).reason,'HIGH_RISK');assert.equal(scoreEarlySignal({context,signal,prod_write:false,trading_access:true}).reason,'POLICY_CONFLICT');});
