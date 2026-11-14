import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const load=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const charter=load('seo-all-departments-full-lifecycle-v1.json');
const org=load('organization.manifest.json');
const baseline=load('competency-coverage-and-board-v0.json');
const publication=load('seo-prod-draft-autopublish-policy-v0.json');

test('all 8 families and 32 existing departments receive complete SEO missions, no omitted or invented role',()=>{
 assert.equal(charter.family_count,8);
 assert.equal(charter.department_count,32);
 assert.equal(charter.departments.length,32);
 const families=new Map(org.professional_families.map(x=>[x.family_id,x.department_ids]));
 const original=new Map(org.departments.map(x=>[x.department_id,x.family_id]));
 const defined=new Set(charter.departments.map(x=>x.department_id));
 assert.equal(defined.size,32);
 for(const d of charter.departments){
  assert.ok(original.has(d.department_id));
  assert.ok(d.mission.length>14);
  assert.ok(d.evidence_sources.length);
  assert.equal(d.execution_status,'MISSION_DEFINED_NOT_AGENT_PROVISIONED');
  assert.equal(d.active_agent_id,null);
  assert.equal(d.verified_prod_write_scope,false);
  assert.equal(d.owner_only_strategy,true);
  assert.equal(d.audit_before_mutation,true);
  assert.ok(d.planned_shared_runtime.includes('FACT-001'));
  assert.ok(d.planned_shared_runtime.includes('JOB-001'));
  assert.ok(d.planned_shared_runtime.includes('ACTGW-001'));
 }
 assert.deepEqual([...original.keys()].sort(),[...defined].sort());
 for(const f of families.values())assert.equal(f.length,4);
});
test('drafts are temporary onboarding and ALL normal SEO specialties must remain covered',()=>{
 assert.equal(charter.current_operating_model.treat_drafts_as_permanent_department_focus,false);
 assert.equal(charter.current_operating_model.human_review_for_new_urls,'TEMPORARY_TRAINING_PHASE');
 assert.equal(charter.current_operating_model.website,'https://fenixcapital.es');
 assert.equal(publication.graduation.minimum_individually_owner_approved_successful_publications,3);
 assert.equal(charter.autonomy_ladder.length,5);
 assert.deepEqual(charter.autonomy_ladder.map(x=>x.level),['L0','L1','L2','L3','L4']);
 for(const level of charter.autonomy_ladder.filter(x=>['L2','L3','L4'].includes(x.level)))
  assert.equal(level.state,'NOT_ACTIVE');
 assert.equal(charter.current_operating_model.real_prod_iam_or_autopublish_granted,false);
 assert.ok(charter.current_operating_model.existing_published_pages.includes('BACKUP'));
 assert.equal(baseline.progress.fully_ready,0);
 assert.equal(baseline.progress.verified_active_agents,0);
});
test('mass rollout Jaén explicitly held and all SEO fixes gated to preserve existing published URLs',()=>{
 const jaen=charter.specific_priorities.find(x=>x.id==='SEO-P0-JAEN');
 assert.ok(jaen);
 assert.equal(jaen.mass_rollout_allowed,false);
 assert.equal(jaen.state,'OPEN_NOT_RECERTIFIED');
 assert.ok(jaen.departments.includes('SEO-D20'));
 assert.ok(charter.mandatory_release_gates.includes('BACKUP_RESTORE'));
 assert.ok(charter.mandatory_release_gates.includes('ROLLBACK_TEST'));
 assert.ok(charter.mandatory_release_gates.includes('OLD_VS_NEW'));
 assert.ok(charter.no_goals.includes('DELETE_VALID_URLS'));
 assert.equal(charter.current_operating_model.no_unilateral_sitewide_changes,true);
 assert.equal(charter.current_operating_model.wordpress_prod_coreguard_remains_locked,true);
});
test('real website baseline explicitly excludes inferred Google analytics and truncated sitemap conclusions',()=>{
 const b=charter.official_readonly_baseline;
 assert.equal(b.wordpress_published_pages,166);
 assert.equal(b.wordpress_published_posts,34);
 assert.equal(b.wordpress_draft_posts,11);
 assert.equal(b.wordpress_draft_pages,14);
 assert.equal(b.robots_txt_http,200);
 assert.equal(b.sitemap_index_http,200);
 assert.equal(b.page_sitemap_response_truncated,true);
 assert.equal(b.post_sitemap_xml_loc_count,34);
 assert.equal(b.google_search_console_data_connected,false);
 assert.equal(b.current_real_draft_wp_id,52656);
 assert.equal(b.real_draft_published,false);
 assert.equal(b.independent_real_agents_verified,0);
 assert.equal(b.city_pilot_jaen_certified,false);
 const data=charter.specific_priorities.find(x=>x.id==='SEO-P0-DATA');
 assert.equal(data.state,'BLOCKED_NO_NEW_COST');
 assert.ok(charter.no_goals.includes('FAKE_GSC_RANKING_OR_ROI'));
});
