import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const policy=JSON.parse(fs.readFileSync('cerebro/seo-enterprise/v2/registry/seo001-google-structured-data-policy-2026-v1.json','utf8'));
const ops=JSON.parse(fs.readFileSync('cerebro/seo-enterprise/v2/registry/seo001-operational-assurance-plan-v1.json','utf8'));
test('Google FAQ rich result retirement never becomes an automatic markup injection campaign',()=>{
 assert.equal(policy.google_faq_rich_results.retirement_date,'2026-05-07');
 assert.equal(policy.google_faq_rich_results.available_in_google_search,false);
 assert.ok(policy.google_faq_rich_results.authoritative_source.startsWith('https://developers.google.com/search/updates'));
 assert.equal(policy.policy_proposal.do_not_inject_faqpage_just_for_google_rich_results,true);
 assert.equal(policy.policy_proposal.preserve_visible_faq_content,true);
 assert.equal(policy.release.approved_for_production,false);
 assert.equal(policy.release.existing_contract_overridden,false);
});
test('legacy Jaen pilot remains held until all internal QA obligations are proven',()=>{
 assert.equal(policy.legacy_city_contract.page_id,52200);
 assert.equal(policy.legacy_city_contract.physically_verified.http_status,200);
 assert.equal(policy.legacy_city_contract.physically_verified.canonical_ok,true);
 assert.equal(policy.legacy_city_contract.physically_verified.mass_pilot_certified,false);
 assert.equal(policy.release.mass_rollout_allowed,false);
 assert.equal(ops.prod_writes_allowed,false);
 assert.equal(ops.staging_access_allowed,false);
});
