import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateSeoReleaseCandidate} from '../runtime/release-evidence-gate.mjs';
const contract=JSON.parse(readFileSync(new URL('../enterprise-family-staging.contract.json',import.meta.url),'utf8'));

function completeFixture(){
 const ref='proof:seo-e2e-verified-benchmark-20261105';
 return {
  context:{company_id:'fenix-capital',engine_id:'SEO-001',environment:'STAGING',target_environment:'PROD',staging_host:'staging.fenixcapital.es',production_host:'fenixcapital.es'},
  additional_cost_eur:0,side_effect_already_executed:false,policy:{prod_write_authorized:false},
  independent_review:{status:'PASS',self_certified:false},
  evidence:Object.fromEntries(['inventory_ref','dependency_map_ref','staging_snapshot_ref','prod_readonly_baseline_ref','old_vs_new_ref','rollback_drill_ref','independent_verdict_ref','change_manifest_ref','canary_monitoring_plan_ref'].map(k=>[k,ref])),
  checks:Object.fromEntries(contract.required_staging_to_prod_gates.map(k=>[k,{status:'PASS',proof_ref:ref}]))
 };
}
test('release gate fails closed without proof and never writes or deploys',()=>{
 const result=evaluateSeoReleaseCandidate({});
 assert.equal(result.result,'BLOCKED');
 assert.ok(result.failure_count>20);
 assert.equal(result.grants_prod_write,false);
 assert.equal(result.executes_wordpress_mutation,false);
 assert.equal(result.creates_release,false);
});
test('a complete synthetic fixture is only eligible for separate review, never released',()=>{
 const result=evaluateSeoReleaseCandidate(completeFixture());
 assert.equal(result.result,'ELIGIBLE_FOR_SEPARATE_GOVERNED_RELEASE_REVIEW');
 assert.equal(result.proof_is_physically_independent_verified,false);
 assert.equal(result.requires_separate_live_evidence_validation,true);
 assert.equal(result.grants_prod_write,false);
});
test('missing physical proof or failing any gate prevents release eligibility',()=>{
 const x=completeFixture();delete x.evidence.rollback_drill_ref;
 x.checks.FORMS_TO_CRM_E2E_AND_CONSENT={status:'PASS',proof_ref:''};
 const result=evaluateSeoReleaseCandidate(x);
 assert.equal(result.result,'BLOCKED');
 assert.ok(result.failures.includes('MISSING_OR_INVALID_EVIDENCE:rollback_drill_ref'));
 assert.ok(result.failures.includes('GATE_UNPROVEN:FORMS_TO_CRM_E2E_AND_CONSENT'));
});
test('auto-granted PROD authority, wrong environment, cost and self-certification are blocked',()=>{
 const x=completeFixture();
 x.context.environment='PROD';x.additional_cost_eur=1;
 x.policy.prod_write_authorized=true;x.independent_review.self_certified=true;
 const result=evaluateSeoReleaseCandidate(x);
 assert.equal(result.result,'BLOCKED');
 for(const code of ['SOURCE_MUST_BE_STAGING','ZERO_ADDITIONAL_COST_NOT_CONFIRMED','UNEXPECTED_PROD_AUTHORITY','INDEPENDENT_REVIEW_UNPROVEN'])
  assert.ok(result.failures.includes(code),code);
});
