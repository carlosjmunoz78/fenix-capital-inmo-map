import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const proposal=JSON.parse(fs.readFileSync('cerebro/seo-enterprise/v2/evidence/SEO001_REAL_LEGAL_SOURCE_REVIEW_HERENCIAS_CORDOBA_2026-11-15.json','utf8'));
const ops=JSON.parse(fs.readFileSync('cerebro/seo-enterprise/v2/registry/seo001-operational-assurance-plan-v1.json','utf8'));
test('owner reported local backup download is not an attested complete restore',()=>{
 const b=ops.wordpress.hostinger_backup_observation;
 assert.equal(b.owner_reported_files_downloaded,true);
 assert.equal(b.owner_reported_database_downloaded,true);
 assert.equal(b.private_preflight_verified,false);
 assert.equal(b.real_restore_tested,false);
 assert.equal(ops.prod_writes_allowed,false);
 assert.equal(ops.staging_access_allowed,false);
});
test('published real estate inheritance article proposal cites primary official legal sources',()=>{
 assert.equal(proposal.source_post_id,46467);
 assert.equal(proposal.http_status,200);
 assert.equal(proposal.editorial_status,'PROPOSED_NO_RELEASE');
 for(const claim of Object.values(proposal.body_claim_review)){
  assert.ok(claim.independent_source.startsWith('https://www.juntadeandalucia.es/'));
 }
 assert.ok(proposal.suggested_section.copy.includes('seis meses'));
 assert.ok(proposal.suggested_section.copy.includes('primeros cinco meses'));
 assert.ok(proposal.required_reviews.includes('SEO-D31_INDEPENDENT_LEGAL_YMYL_REVIEW'));
 assert.ok(proposal.cannot_claim.includes('CTR_GAIN_FORECAST'));
 assert.equal(proposal.security.wordpress_mutations,0);
});
