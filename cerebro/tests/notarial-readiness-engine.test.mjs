import test from 'node:test';
import assert from 'node:assert/strict';
import {assessNotarialReadiness} from '../notarial/notarial-readiness-engine.mjs';
const context={company_id:'fenix',engine_id:'NOT-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:.95,source_refs:['notary:case1'],fein_ready:true,acta_ready:true,payment_plan_ready:true,agenda_ready:true,parties_confirmed:true,signature_required:true};
test('NOT-001 escalates only mandatory signature when ready',()=>{const r=assessNotarialReadiness(base);assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'SIGNATURE_REQUIRED');assert.equal(r.readiness_score,100);});
test('NOT-001 returns missing preparation',()=>{const r=assessNotarialReadiness({...base,agenda_ready:false});assert.equal(r.status,'NOTARIAL_PREPARATION_REQUIRED');assert.ok(r.missing.includes('AGENDA_READY'));});
test('NOT-001 enforces policy/evidence',()=>{assert.equal(assessNotarialReadiness({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(assessNotarialReadiness({...base,confidence:.2}).reason,'LOW_CONFIDENCE');assert.throws(()=>assessNotarialReadiness({...base,source_refs:[]}));});
