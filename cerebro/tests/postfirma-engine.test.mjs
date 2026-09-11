import test from 'node:test';
import assert from 'node:assert/strict';
import {planPostFirma} from '../customer/postfirma-engine.mjs';
const context={company_id:'fenix',engine_id:'POST-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,signature_required:false,legal_required:false,confidence:0.9,source_refs:['firma:exp-1'],payments_verified:false,fenix_fees_verified:true,partner_commission_verified:false,provision_status_known:true,supplies_change_required:true,community_change_required:false};
test('POST-001 creates safe postfirma plan',()=>{const r=planPostFirma(base);assert.equal(r.status,'POSTFIRMA_PLAN_READY');assert.equal(r.plan_only,true);assert.equal(r.executed,false);assert.equal(r.prod_writes,false);assert.equal(r.read_only,true);assert.ok(r.actions.includes('VERIFY_PAYMENTS'));assert.ok(r.actions.includes('VERIFY_PARTNER_COMMISSION'));assert.ok(r.actions.includes('PREPARE_SUPPLIES_CHANGE'));});
test('POST-001 gates PROD and authorization',()=>{assert.equal(planPostFirma({...base,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(planPostFirma({...base,authorized:false}).reason,'POLICY_CONFLICT');});
test('POST-001 respects signature/legal and low confidence',()=>{assert.equal(planPostFirma({...base,signature_required:true}).reason,'SIGNATURE_REQUIRED');assert.equal(planPostFirma({...base,legal_required:true}).reason,'LEGAL_REQUIRED');assert.equal(planPostFirma({...base,confidence:0.2}).reason,'LOW_CONFIDENCE');});
test('POST-001 requires evidence and safe environment',()=>{assert.throws(()=>planPostFirma({...base,source_refs:[]}));assert.throws(()=>planPostFirma({...base,context:{...context,environment:'PROD'}}));});
