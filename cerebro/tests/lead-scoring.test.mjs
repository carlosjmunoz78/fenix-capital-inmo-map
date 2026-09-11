import test from 'node:test';import assert from 'node:assert/strict';import {scoreLead} from '../sales/lead-scoring.mjs';
const context={company_id:'fenix',engine_id:'LEAD-001',environment:'PREPROD',version:'0.1.0'};const base={context,authorized:true,requires_prod_write:false,lead_ref:'lead://1',fit_score:.9,intent_score:.8,urgency_score:.7,value_score:.6,confidence:.9,evidence_refs:['crm://history/1']};
test('LEAD-001 scores deterministically',()=>{const r=scoreLead(base);assert.equal(r.status,'LEAD_SCORED');assert.equal(r.model,'HEURISTIC_V0');assert.equal(r.ml_required,false);assert.equal(r.priority,'P1');assert.equal(r.next_action,'CONTACT_NOW');});
test('LEAD-001 escalates low confidence',()=>{assert.equal(scoreLead({...base,confidence:.3}).reason,'LOW_CONFIDENCE');});
test('LEAD-001 blocks PROD write before auth',()=>{assert.equal(scoreLead({...base,authorized:false,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(scoreLead({...base,authorized:false}).reason,'POLICY_CONFLICT');});
test('LEAD-001 rejects malformed metrics and gates',()=>{assert.throws(()=>scoreLead({...base,fit_score:2}));assert.throws(()=>scoreLead({...base,requires_prod_write:'true'}));});
