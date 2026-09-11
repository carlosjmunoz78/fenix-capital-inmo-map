import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSla} from '../operations/sla-engine.mjs';
const context={company_id:'fenix',engine_id:'SLA-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:.95,source_refs:['sla:1'],process:'BANK_FOLLOWUP',third_party:'BankA',severity:'NORMAL',opened_at:'2026-09-09T12:00:00Z',now:'2026-09-11T12:00:00Z',sla_hours:48};
test('SLA-001 evaluates normal SLA',()=>{const r=evaluateSla(base);assert.equal(r.status,'SLA_EVALUATED');assert.equal(r.breached,false);assert.equal(r.next_action,'WAIT');});
test('SLA-001 triggers follow-up on breach',()=>{const r=evaluateSla({...base,now:'2026-09-12T12:00:00Z'});assert.equal(r.breached,true);assert.equal(r.next_action,'TRIGGER_FOLLOWUP');});
test('SLA-001 escalates critical breach',()=>{const r=evaluateSla({...base,severity:'CRITICAL',now:'2026-09-10T12:00:00Z'});assert.equal(r.human_required,true);assert.equal(r.human_reason,'HIGH_RISK');});
test('SLA-001 enforces policy/evidence',()=>{assert.equal(evaluateSla({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(evaluateSla({...base,confidence:.2}).reason,'LOW_CONFIDENCE');assert.throws(()=>evaluateSla({...base,source_refs:[]}));});
