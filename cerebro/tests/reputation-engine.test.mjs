import test from 'node:test';
import assert from 'node:assert/strict';
import {planReputation} from '../customer/reputation-engine.mjs';
const context={company_id:'fenix',engine_id:'REP-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,legal_risk:false,confidence:0.9,source_refs:['review:1'],rating:5,review_text:'Excelente servicio'};
test('REP-001 prepares thank-you and referral followup',()=>{const r=planReputation(base);assert.equal(r.status,'REPUTATION_PLAN_READY');assert.ok(r.actions.includes('PREPARE_THANK_YOU_RESPONSE'));assert.ok(r.actions.includes('CONSIDER_REFERRAL_FOLLOWUP'));assert.equal(r.response_mode,'DRAFT_ONLY');assert.equal(r.executed,false);});
test('REP-001 prepares recovery for negative reviews',()=>{const r=planReputation({...base,rating:1,review_text:'Mala experiencia'});assert.ok(r.actions.includes('ESCALATE_AND_PREPARE_RESPONSE'));});
test('REP-001 gates risk and authorization',()=>{assert.equal(planReputation({...base,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(planReputation({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(planReputation({...base,legal_risk:true}).reason,'LEGAL_REQUIRED');});
test('REP-001 rejects low confidence or missing evidence',()=>{assert.equal(planReputation({...base,confidence:0.2}).reason,'LOW_CONFIDENCE');assert.throws(()=>planReputation({...base,source_refs:[]}));});
