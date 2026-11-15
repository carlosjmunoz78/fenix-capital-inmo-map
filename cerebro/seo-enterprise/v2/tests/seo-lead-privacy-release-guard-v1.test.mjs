import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSeo001LeadPrivacyRelease,requirements} from '../runtime/seo-lead-privacy-release-guard-v1.mjs';
test('evidence-free web lead release cannot progress',()=>{
 const x=evaluateSeo001LeadPrivacyRelease({});
 assert.equal(x.release_decision,'HOLD');
 assert.equal(x.checks_passed,0);
 assert.equal(x.pending_evidence.length,11);
 assert.equal(x.wordpress_prod_writes_allowed,false);
 assert.equal(x.customer_contact_allowed,false);
});
test('missing Elementor real privacy proof alone keeps the release blocked',()=>{
 const receipt=Object.fromEntries(requirements.map(x=>[x,true]));
 receipt.elementor_real_privacy_value_e2e=false;
 const x=evaluateSeo001LeadPrivacyRelease(receipt);
 assert.equal(x.release_decision,'HOLD');
 assert.deepEqual(x.pending_evidence,['elementor_real_privacy_value_e2e']);
});
test('even every checked receipt only permits independent review, never self-approval',()=>{
 const receipt=Object.fromEntries(requirements.map(x=>[x,true]));
 const x=evaluateSeo001LeadPrivacyRelease(receipt);
 assert.equal(x.release_decision,'READY_FOR_PRIVATE_REVIEW');
 assert.equal(x.independently_certified,false);
 assert.equal(x.crm_prod_writes_allowed,false);
 assert.equal(x.synthetic_client_data_in_production_allowed,false);
});
test('unknown evidence or non-boolean truthy values never bypass proof',()=>{
 assert.throws(()=>evaluateSeo001LeadPrivacyRelease({is_done:true}),/UNKNOWN_EVIDENCE/);
 const x=evaluateSeo001LeadPrivacyRelease({full_private_restore_attested:'true'});
 assert.equal(x.checks_passed,0);
 assert.ok(x.pending_evidence.includes('full_private_restore_attested'));
});
