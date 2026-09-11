import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPropertyRisk} from '../property/property-risk-engine.mjs';
const context={company_id:'fenix',engine_id:'PROP-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:.95,source_refs:['reg:1','cat:1']};
test('PROP-001 separates property risk from financial profile',()=>{const r=assessPropertyRisk({...base,new_build:true,cadastral_mismatch:true});assert.equal(r.status,'PROPERTY_RISK_READY');assert.equal(r.financial_profile_score,null);assert.equal(r.property_risk_score,25);assert.equal(r.executed,false);});
test('PROP-001 escalates legal complexity',()=>{const r=assessPropertyRisk({...base,encumbrances:true});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'LEGAL_REQUIRED');assert.equal(r.legal_escalation,true);});
test('PROP-001 enforces safety',()=>{assert.equal(assessPropertyRisk({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(assessPropertyRisk({...base,confidence:.2}).reason,'LOW_CONFIDENCE');assert.throws(()=>assessPropertyRisk({...base,source_refs:[]}));});
