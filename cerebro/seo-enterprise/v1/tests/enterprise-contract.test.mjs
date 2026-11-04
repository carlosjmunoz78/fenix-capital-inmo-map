import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const contract=JSON.parse(fs.readFileSync(new URL('../enterprise-family-staging.contract.json',import.meta.url),'utf8'));
test('SEO enterprise is one reused engine with 14 functional departments and 3 families',()=>{
 assert.equal(contract.engine_id,'SEO-001');
 assert.equal(contract.architecture.functional_departments.length,14);
 assert.equal(contract.architecture.sector_families.length,3);
 assert.equal(new Set(contract.architecture.functional_departments.map(x=>x.department_id)).size,14);
 assert.equal(new Set(contract.architecture.sector_families.map(x=>x.family_id)).size,3);
 for(const dept of contract.architecture.functional_departments){
   assert.equal(dept.status,'DEFINED_CANDIDATE_NOT_MATERIALIZED');
   assert.ok(dept.skills.length>=4,dept.department_id);
 }
 for(const family of contract.architecture.sector_families) assert.equal(family.status,'DEFINED_CANDIDATE_NO_LIVE_EXECUTION');
 assert.equal(contract.preservation.create_new_engines,false);
 assert.equal(contract.architecture.no_per_role_servers,true);
 assert.equal(contract.architecture.company_isolation,true);
});
test('Web PROD is strictly protected; staging is not automatically promotable',()=>{
 assert.equal(contract.environments.staging.url,'https://staging.fenixcapital.es');
 assert.equal(contract.environments.production.url,'https://fenixcapital.es');
 assert.equal(contract.environments.staging.robots_expected,'NOINDEX');
 assert.equal(contract.environments.production.writes_allowed,false);
 assert.equal(contract.environments.staging.promote_from_staging_automatically,false);
 assert.equal(contract.release.default,'BLOCKED');
 assert.equal(contract.release.prod_write,'NOT_GRANTED_BY_THIS_CONTRACT');
 assert.equal(contract.release.staging_write,'NOT_GRANTED_BY_THIS_CONTRACT');
 assert.equal(contract.preservation.mutate_wordpress,false);
 assert.equal(contract.preservation.mutate_app_crm_supabase,false);
 assert.equal(contract.preservation.spend_eur,0);
});
test('CEREBRO merit applies to all internal governance roles without self-certification',()=>{
 assert.equal(contract.architecture.oversight.applies_to_all_roles_including_oversight,true);
 assert.equal(contract.architecture.oversight.never_self_certify,true);
 assert.equal(contract.architecture.oversight.ultimate_human_authority,'AUTHORIZED_OWNER');
 assert.match(contract.architecture.oversight.merit_policy_binding_status,/PENDING/);
 for(const role of ['SEO_DIRECTOR','FAMILY_SUPERVISOR','TRIBUNAL_QUALITY','TRIBUNAL_POLICY','RIGHTS_AND_SECURITY_GUARD']){
  assert.ok(contract.architecture.oversight.roles.includes(role),role);
 }
});
test('Every release demands evidence, a tested rollback and no false SEO success',()=>{
 const gates=contract.required_staging_to_prod_gates;
 for(const id of ['PROD_INDEXABILITY_AND_SELF_CANONICAL','BACKUP_EXISTS','RESTORE_TEST_PASS','NO_CRITICAL_REGRESSION','REAL_LOCAL_DIFFERENTIATION','YMYL_SOURCE_VALIDATION','FORMS_TO_CRM_E2E_AND_CONSENT','NO_DUPLICATE_QUERY_OWNER','OWNER_REVIEW_ONLY_IF_CANONICAL_HUMAN_REQUIRED']){
   assert.ok(gates.includes(id),id);
 }
 assert.equal(contract.release.require_evidence_receipt,true);
 assert.equal(contract.release.rollback_before_release,true);
 assert.equal(contract.release.canary_then_expand,true);
 assert.equal(contract.release.owner_exception_codes.length,8);
 assert.equal(contract.city_complete,'CITY_COMPLETE_V2_REQUIRED_BEFORE_CITY_CERTIFICATION');
 assert.equal(contract.measurables.only_measure_verified_data,true);
 assert.ok(contract.open_gates.length>=5);
});
