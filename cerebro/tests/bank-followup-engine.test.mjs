import test from 'node:test';
import assert from 'node:assert/strict';
import {planBankFollowup} from '../banking/bank-followup-engine.mjs';
const context={company_id:'fenix',engine_id:'BNK-005',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:.95,source_refs:['comm:1'],bank:'BankA',contact_ref:'contact:1',last_contact_at:'2026-09-08T12:00:00Z',sla_hours:48,preferred_channels:['email'],now:'2026-09-11T12:00:00Z'};
test('BNK-005 creates due follow-up plan',()=>{const r=planBankFollowup(base);assert.equal(r.status,'BANK_FOLLOWUP_PLAN_READY');assert.equal(r.due,true);assert.equal(r.next_action,'PREPARE_FOLLOWUP');assert.equal(r.channel,'email');assert.equal(r.executed,false);});
test('BNK-005 waits before SLA',()=>{const r=planBankFollowup({...base,last_contact_at:'2026-09-11T00:00:00Z'});assert.equal(r.due,false);assert.equal(r.next_action,'WAIT_UNTIL_SLA');});
test('BNK-005 enforces policy/evidence',()=>{assert.equal(planBankFollowup({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(planBankFollowup({...base,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(planBankFollowup({...base,confidence:.2}).reason,'LOW_CONFIDENCE');assert.throws(()=>planBankFollowup({...base,source_refs:[]}));});
