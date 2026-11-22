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

test('SEO agents and subagents own work; plugins are subordinate, replaceable tools',()=>{
 const a=contract.architecture;
 assert.equal(a.operating_principle,'AGENTS_AND_SUBAGENTS_DO_THE_ORDINARY_WORK;PLUGINS_ARE_NON_DECISION_MAKING_EXECUTION_ADAPTERS');
 assert.equal(a.accountability.execution_owner,'CEREBRO_AGENT_AND_SUBAGENT_TEAMS');
 assert.equal(a.accountability.plugin_autonomous_decision_making,false);
 assert.equal(a.agent_workflow.current_state,'DEFINED_NOT_RUNTIME_BOUND');
 assert.equal(a.agent_workflow.for_each_task[1],'DELEGATE_TO_SPECIALIST_SUBAGENTS');
 assert.equal(a.plugin_contract.role,'AUXILIARY_WORDPRESS_TOOL_AND_PERMISSIONED_ADAPTER');
 assert.equal(a.plugin_contract.work_ownership,'NONE');
 assert.equal(a.plugin_contract.execution_without_agent_authorization,'DENY');
 assert.equal(a.plugin_contract.requires_signed_mission_or_explicit_approved_job,true);
 assert.equal(a.plugin_contract.new_plugin_subscription_required,false);
 for (const forbidden of ['OWN_SEO_STRATEGY','WRITE_CONTENT_AS_THE_AUTHORITATIVE_AGENT','SUPERVISE_OR_REWARD_AGENTS','PROMOTE_STAGING_TO_PROD_WITHOUT_CEREBRO_APPROVAL']){
  assert.ok(a.plugin_contract.must_not.includes(forbidden));
 }
 for (const department of a.functional_departments){
  assert.equal(department.work_owner,'CEREBRO_DEPARTMENT_HEAD_AND_SUBAGENTS');
  assert.equal(department.plugin_role,'OPTIONAL_TOOL_ONLY');
 }
 assert.equal(contract.release.plugin_direct_promotion_forbidden,true);
});

test('SEO workforce is precisely 14 agents and 70 subagents per sector family',()=>{
 const plan=contract.architecture.family_workforce_plan;
 assert.equal(plan.agents_per_family,14);
 assert.equal(plan.subagents_per_agent,5);
 assert.equal(plan.subagents_per_family,70);
 assert.equal(plan.number_of_families,3);
 assert.equal(plan.total_family_agents,42);
 assert.equal(plan.total_family_subagents,210);
 assert.equal(plan.total_family_execution_roles,252);
 assert.equal(plan.execution_bindings_verified,false);
 for(const family of contract.architecture.sector_families){
  assert.equal(family.target_agents,14);
  assert.equal(family.target_subagents,70);
  assert.equal(family.staffing_status,'DEFINED_NOT_MATERIALIZED');
 }
});
