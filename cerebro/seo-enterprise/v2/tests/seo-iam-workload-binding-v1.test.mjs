import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync(new URL('../seo-iam-workload-binding-v1.json',import.meta.url),'utf8'));
test('32/141 real corpus job evidence, distinct 3 verified provider jobs, not IAM agents or PROD grants',()=>{
 assert.equal(p.environment,'PREPROD');
 assert.equal(p.evidence.run_conclusion,'success');
 assert.equal(p.evidence.frozen_documents_read,200);
 assert.equal(p.evidence.logical_specialist_work_units_completed,141);
 assert.equal(p.evidence.logical_departments_with_corpus_evidence,32);
 assert.equal(p.roles.length,3);
 assert.equal(new Set(p.roles.map(x=>x.github_job_id)).size,3);
 assert.equal(p.roles.every(x=>x.individual_cerebro_iam_principal_id===null),true);
 assert.equal(p.limitations.real_individual_subagent_iam_accounts_created,0);
 assert.equal(p.limitations.full_seo_prod_departments_certified,0);
 assert.equal(p.evidence.external_wordpress_mutations,0);
 assert.equal(p.limitations.wordpress_auto_publishing_authorized,false);
 assert.equal(p.evidence.newly_purchased_services_eur,0);
});
