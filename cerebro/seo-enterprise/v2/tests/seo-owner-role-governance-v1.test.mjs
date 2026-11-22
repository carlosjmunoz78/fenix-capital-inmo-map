import test from 'node:test';
import assert from 'node:assert/strict';
import {
 allSeoRolePolicyBindings,seoRoleOwnerPolicy,prepareSeoOwnerPrecedentCandidate,
 evaluateSeoExcellenceCandidate
} from '../runtime/seo-owner-role-governance-v1.mjs';
import {getSeoDepartmentKnowledge,listSeoDepartments,compileSeoSpecialistMission,workforceStatus}
 from '../runtime/seo-specialist-workforce-v2.mjs';
const policy='SEO_V2_OWNER_EXCELLENCE_ALL_191_ROLES_V1';

test('all 191 SEO roles inherit exact owner governance, including judges and guardians',()=>{
 const r=allSeoRolePolicyBindings();
 assert.equal(r.policy_id,policy);
 assert.equal(r.roles.length,191);
 assert.equal(r.role_count,191);
 assert.equal(new Set(r.roles.map(x=>x.role_id)).size,191);
 const counts=Object.fromEntries(['DIRECTOR','SUPERVISOR','DEPARTMENT_HEAD','SPECIALIST','JUDGE','GUARDIAN']
   .map(kind=>[kind,r.roles.filter(x=>x.kind===kind).length]));
 assert.deepEqual(counts,{DIRECTOR:8,SUPERVISOR:8,DEPARTMENT_HEAD:32,SPECIALIST:141,JUDGE:1,GUARDIAN:1});
 for(const x of r.roles){
  const inherited=seoRoleOwnerPolicy(x.role_id);
  assert.equal(inherited.policy_id,policy);
  assert.equal(inherited.directives.business_authority,'AUTHENTICATED_OWNER');
  assert.equal(inherited.directives.laws_and_security_remain_mandatory,true);
  assert.equal(inherited.directives.seek_excellence_with_independent_review,true);
  assert.equal(inherited.directives.rewards_require_explicit_trusted_owner_gate,true);
  assert.equal(inherited.directives.owner_decides_general_rule_or_exception,true);
  assert.equal(inherited.directives.three_verified_same_scope_owner_precedents_required,true);
  assert.equal(inherited.directives.no_prod_writes,true);
  assert.equal(inherited.independent_agent_iam_verified,false);
 }
 assert.throws(()=>seoRoleOwnerPolicy('SEO-UNKNOWN'),/UNREGISTERED_ROLE/);
});
test('all department knowledge and specialist mission contracts carry the policy by inheritance',()=>{
 const d=listSeoDepartments();
 assert.equal(d.length,32);
 assert.equal(d.every(x=>x.owner_governance_policy_id===policy),true);
 let total=0;
 for(const entry of d){
  const p=getSeoDepartmentKnowledge(entry.department_id);
  for(const role of ['department_head','family_director','family_supervisor','tribunal','guardian'])
   assert.equal(p.owner_excellence_governance[role].policy_id,policy);
  for(const sub of p.workforce.subagents){
   assert.equal(sub.owner_excellence_governance.policy_id,policy);
   total++;
  }
 }
 assert.equal(total,141);
 const p=getSeoDepartmentKnowledge('SEO-D05');
 const x=compileSeoSpecialistMission({company_id:'fenix',department_id:'SEO-D05',
  subagent_role_id:p.workforce.subagents[0].role_id,request_id:'SEO_POLICY_001',
  objective:'Aplicar gobernanza en misión segura del corpus aceptado',
  source_refs:['cerebro/seo-enterprise/v2/data/fenix-prod-wp-url-media-inventory-2026-11-05-v1.json'],
  allow_writes:false,allow_paid_ai:false,budget_eur:0});
 assert.equal(x.owner_excellence_governance.policy_id,policy);
 assert.equal(x.can_publish,false);
 assert.equal(workforceStatus().inherited_owner_governance_roles,191);
});
test('three consistent owner-attested GENERAL decisions create only reviewable scoped precedent, not authority',()=>{
 const base={company_id:'fenix',engine_id:'SEO-001',topic_key:'editorial_tone',
  scope_key:'seo_existing_blog',decision:'usar_tono_claro',classification:'GENERAL_RULE',
  owner_source:'TRUSTED_OWNER_GATEWAY_ATTESTED'};
 const decisions=[1,2,3].map(n=>({...base,decision_id:'o'+n,owner_receipt_id:'sig'+n}));
 const a=prepareSeoOwnerPrecedentCandidate({decisions,topic_key:base.topic_key,scope_key:base.scope_key});
 assert.equal(a.reusable_general_rule,true);
 assert.equal(a.owner_authenticated_by_this_function,false);
 assert.equal(a.live_automation_authorized,false);
 assert.equal(a.permission_granted,false);
 for(const subset of [[],decisions.slice(0,2),decisions.map(x=>({...x,owner_source:'CHAT_TEXT_ONLY'}))]){
  assert.equal(prepareSeoOwnerPrecedentCandidate({decisions:subset,topic_key:base.topic_key,scope_key:base.scope_key}).reusable_general_rule,false);
 }
 const exception=prepareSeoOwnerPrecedentCandidate({decisions:[{...decisions[0],classification:'EXCEPTION'}],
   topic_key:base.topic_key,scope_key:base.scope_key});
 assert.equal(exception.reusable_general_rule,false);
 assert.equal(exception.status,'EXCEPTION_REQUIRES_OWNER_EACH_CASE');
 assert.throws(()=>prepareSeoOwnerPrecedentCandidate({decisions:[decisions[0],decisions[0]],
  topic_key:base.topic_key,scope_key:base.scope_key}),/PRECEDENT_REPLAY/);
});
test('excellent performance yields candidate for owner review, never role privilege or automatic replacement',()=>{
 const role_id='SEO-D05:SPECIALIST:01';
 const proof={independent_qa:true,tribunal_passed:true,score:96,quality:94,safety:100,security_incident:false};
 const a=evaluateSeoExcellenceCandidate({role_id,missions:[proof,proof,proof]});
 assert.equal(a.reward_candidate,'OWNER_REVIEW_REQUIRED');
 assert.equal(a.privilege_granted,false);
 assert.equal(a.agent_replaced,false);
 assert.equal(a.final_owner_decision_required,true);
 assert.equal(evaluateSeoExcellenceCandidate({role_id,missions:[proof]}).reward_candidate,'NOT_ELIGIBLE');
 assert.throws(()=>evaluateSeoExcellenceCandidate({role_id:'SEO:FAKE',missions:[proof]}),/UNREGISTERED_ROLE/);
});
