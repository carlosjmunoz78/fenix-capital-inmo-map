import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const a=JSON.parse(readFileSync(new URL('../organization.manifest.json',import.meta.url),'utf8'));
test('v2: exactly 8 professional families and 32 departments, no duplicated IDs',()=>{
 assert.equal(a.professional_family_count,8);
 assert.equal(a.department_count,32);
 assert.equal(a.professional_families.length,8);
 assert.equal(a.departments.length,32);
 assert.equal(new Set(a.departments.map(x=>x.department_id)).size,32);
 for(const family of a.professional_families){
  assert.equal(family.department_ids.length,4);
  for(const id of family.department_ids)assert.equal(a.departments.filter(d=>d.department_id===id&&d.family_id===family.family_id).length,1);
 }
});
test('v2: sector verticals are separate and workforce targets not made up',()=>{
 assert.deepEqual(a.sector_specializations.map(x=>x.id),['FIN_MORTGAGE','REAL_ESTATE','ECOMMERCE','TECH_SAAS']);
 assert.equal(a.headcount_policy.fixed_agent_count_rejected,true);
 assert.equal(a.status,'DEFINED_ARCHITECTURE_NOT_EXECUTED');
 assert.equal(a.preserve_original_engine,true);
 assert.equal(a.cost_additional_eur,0);
});
test('v2: all creators AND supervisors and judges subject to merit, training and replacement',()=>{
 const m=a.merit_and_replacement;
 for(const x of ['AGENT','SUBAGENT','DIRECTOR','DEPARTMENT_HEAD','SUPERVISOR','JUDGE','TRIBUNAL','GUARDIAN','META_SUPERVISOR','QA_AGENT'])assert.ok(m.applies_to.includes(x),x);
 for(const x of ['INDEPENDENT_EVALUATOR','MERIT_REWARDS','ROLE_SPECIFIC_TRAINING','CONTROLLED_REPLACEMENT','ROLLBACK_PLAN'])assert.ok(m.every_role_must_have.includes(x),x);
 assert.equal(m.review_of_oversight_by_independent_peers,true);
 for(const x of ['SELF_REWARD','SELF_CERTIFY','SELF_GRANT_PERMISSIONS'])assert.ok(m.forbidden.includes(x),x);
});
test('v2: ordinary work is agent-led; auxiliary plugin cannot command or publish',()=>{
 assert.equal(a.agent_tool_relationship.work_owner,'CEREBRO_AGENT_SUBAGENT_RUNTIME');
 assert.equal(a.agent_tool_relationship.wordpress_plugin_role,'OPTIONAL_EXECUTION_ADAPTER');
 assert.equal(a.agent_tool_relationship.plugin_governs_strategy,false);
 assert.equal(a.agent_tool_relationship.plugin_governs_merit,false);
 assert.equal(a.agent_tool_relationship.plugin_auto_publishes,false);
 assert.equal(a.staging_first.prod_mutation_allowed_by_this_document,false);
 assert.equal(a.staging_first.stage_mutation_allowed_by_this_document,false);
});
