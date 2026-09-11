import test from 'node:test';import assert from 'node:assert/strict';import {assessLegalCase} from '../legal/legal-triage-engine.mjs';
const base={context:{company_id:'fenix',engine_id:'LEG-001',environment:'PREPROD'},authorized:true,confidence:.95,source_refs:['ev:1']};
test('safe triage',()=>{const r=assessLegalCase({...base,issues:[{type:'CONTRACT',severity:2}]});assert.equal(r.status,'LEGAL_TRIAGE_READY');assert.equal(r.legal_decision,false);assert.equal(r.executed,false)});
test('legal gate',()=>{assert.equal(assessLegalCase({...base,issues:[{severity:4}]}).reason,'LEGAL_REQUIRED')});
test('signature gate',()=>{assert.equal(assessLegalCase({...base,issues:[{requires_signature:true}]}).reason,'SIGNATURE_REQUIRED')});
test('confidence gate',()=>{assert.equal(assessLegalCase({...base,confidence:.2,issues:[]}).reason,'LOW_CONFIDENCE')});
