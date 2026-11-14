import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSeoPhase2AllRolesCurriculum,verifySeoPhase2AllRolesCurriculum}
 from '../runtime/seo-phase2-all-roles-curriculum-v1.mjs';

test('phase 2 binds individual specialist knowledge + oversight study for 191/191 templates',()=>{
 const c=buildSeoPhase2AllRolesCurriculum();
 assert.equal(c.state,'PHASE2_ALL_ROLE_STUDY_AND_EXAMS_PREPARED_NOT_LIVE_TRAINED');
 assert.deepEqual(c.counts,{specialist:141,oversight:50,all_roles:191,
  specialist_cases:423,oversight_drill_templates:150,all_drill_templates:573});
 assert.equal(c.roles.length,191);
 assert.equal(c.drills.length,573);
 assert.equal(new Set(c.roles.map(x=>x.role_id)).size,191);
 assert.equal(new Set(c.drills.map(x=>x.case_id)).size,573);
 assert.equal(c.source_doc_count,200);
 assert.equal(c.source_media_count,629);
 assert.equal(c.training_actual_subject_matter_attempts,0);
 assert.equal(c.independently_authenticated_agents,0);
 assert.equal(c.prod_certified_departments,0);
 assert.equal(c.external_writes,0);
 for(const p of c.roles){
  assert.equal(p.role_policy_id,'SEO_V2_OWNER_EXCELLENCE_ALL_191_ROLES_V1');
  assert.equal(p.owner_decision_authority,'AUTHENTICATED_OWNER_ONLY');
  assert.equal(p.obey_applicable_law_security_and_privacy,true);
  assert.equal(p.owner_precedent_cannot_auto_grant_access,true);
  assert.equal(p.owner_repetition_threshold_for_precedent_candidate,3);
  assert.equal(p.excellence_independent_evaluation_required,true);
  assert.equal(p.reward_suggestion_owner_review_only,true);
  assert.equal(p.replacement_requires_shadow_and_rollback,true);
  assert.equal(p.role_template_only,true);
  assert.equal(p.iam_agent_authenticated,false);
  assert.equal(p.certified_in_prod,false);
  assert.deepEqual(p.permissions_granted,[]);
  assert.equal(p.exercises.length,3);
  assert.equal(p.source_refs.every(x=>!x.includes('staging')),true);
  assert.ok(p.knowledge_pack_refs.length>=1);
  assert.equal(p.external_web_requests,0);
 }
 const specialist=c.roles.find(x=>x.role_id==='SEO-D05:SPECIALIST:01');
 assert.ok(specialist);
 assert.ok(specialist.expertise.length>3);
 assert.equal(specialist.knowledge_pack_refs.length,1);
 assert.equal(c.drills.filter(x=>x.role_id===specialist.role_id).length,3);
 assert.equal(c.drills.filter(x=>x.role_id==='SEO:GLOBAL:JUDGE').length,3);
 assert.equal(c.drills.filter(x=>x.role_id==='SEO:GLOBAL:GUARDIAN').length,3);
 assert.equal(verifySeoPhase2AllRolesCurriculum(c).status,'PHASE2_ALL_191_ROLE_CURRICULUM_VERIFIED');
});
test('tampering with training claims cannot pass verification',()=>{
 const value=buildSeoPhase2AllRolesCurriculum();
 const forged={...value,prod_certified_departments:32};
 assert.throws(()=>verifySeoPhase2AllRolesCurriculum(forged),/SEO_PHASE2_RECOMPUTE_FAILED/);
});
