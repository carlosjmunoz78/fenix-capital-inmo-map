import test from 'node:test';
import assert from 'node:assert/strict';
import {listSeoDepartments,getSeoDepartmentKnowledge,compileSeoSpecialistMission,trainingGate,workforceStatus} from '../runtime/seo-specialist-workforce-v2.mjs';
test('32 packs, 141 specialist roles, 8 families, no IAM inflation',()=>{
 const x=workforceStatus();
 assert.equal(x.departments,32);assert.equal(x.subagent_role_templates,141);
 assert.equal(x.real_iam_agents_verified,0);assert.equal(x.departments_certified_prod,0);
 assert.equal(x.publish_authorized,false);
 assert.equal(listSeoDepartments().length,32);
 const roles=new Set();
 for(let n=1;n<=32;n++){
  const id='SEO-D'+String(n).padStart(2,'0');const p=getSeoDepartmentKnowledge(id);
  assert.equal(p.department_id,id);
  assert.ok(p.knowledge.operational_directives.length>=6);
  assert.ok(p.knowledge.required_outputs.length>=3);
  assert.ok(p.training.subject_specific_drills.length>=3);
  assert.equal(p.workforce.subagents.length,p.knowledge.competencies.length);
  assert.equal(p.readiness.real_iam_actors_provisioned,0);
  assert.equal(p.readiness.certified_for_production,false);
  for(const a of p.workforce.subagents){assert.ok(!roles.has(a.role_id));roles.add(a.role_id);assert.equal(a.iam_principal_id,null);assert.ok(a.forbidden_actions.includes('SELF_PROMOTE'))}
 }
 assert.equal(roles.size,141);
});
test('safe plan is read-only, uses existing evidence and does not invent certifications',()=>{
 const p=getSeoDepartmentKnowledge('SEO-D05');
 const plan=compileSeoSpecialistMission({company_id:'fenix',department_id:'SEO-D05',
 subagent_role_id:p.workforce.subagents[1].role_id,request_id:'SEO_QUERY_001',
 objective:'Crear propuesta de keyword-intent sin recrawl',environment:'LAB',
 source_refs:['canonical:inventory:2026-11-05'],allow_writes:false,allow_paid_ai:false,budget_eur:0});
 assert.equal(plan.state,'LAB_PLAN_NOT_EXECUTED');assert.equal(plan.can_publish,false);
 assert.equal(plan.created_real_job,false);assert.equal(plan.sources_read_by_this_function,false);
 assert.equal(plan.handoff_to,'SEO-D31:INDEPENDENT_QA');
});
test('unsafe scope, cross-company, self-awarded identity and evidence-free work are rejected',()=>{
 const base={company_id:'fenix',department_id:'SEO-D31',subagent_role_id:getSeoDepartmentKnowledge('SEO-D31').workforce.subagents[0].role_id,
 request_id:'SEO_SECU_001',objective:'Revisar prueba documental existente',source_refs:['canonical:inventory'],allow_writes:false,allow_paid_ai:false,budget_eur:0};
 const deny=(patch,why)=>assert.throws(()=>compileSeoSpecialistMission({...base,...patch}),new RegExp(why));
 deny({company_id:'other'},'TENANT_OR_ENV');deny({environment:'PROD'},'TENANT_OR_ENV');
 deny({allow_writes:true},'READ_ONLY');deny({budget_eur:1},'READ_ONLY');deny({allow_paid_ai:true},'READ_ONLY');
 deny({source_refs:[]},'SOURCE_PROVENANCE');deny({subagent_role_id:'SEO-D01:SPECIALIST:01'},'ROLE_SCOPE');
 deny({owner_approved:true},'UNVERIFIED_AUTHORITY');
 deny({iam_principal_id:'IAM-fake'},'UNVERIFIED_AUTHORITY');
 deny({publish:true},'UNVERIFIED_AUTHORITY');
});
test('simulated success or self-declared training never activates PROD',()=>{
 assert.equal(trainingGate('SEO-D32').certified_for_prod,false);
 assert.equal(trainingGate('SEO-D32',{missions:[{verified_real:false}]}).eligible_for_external_human_authority_review,false);
 const valid={missions:Array.from({length:3},()=>({verified_real:true,independent_qa:true,owner_policy_approved:true,tribunal_passed:true})),
  iam_principal_verified:true,shadow_passed:true,rollback_tested:true};
 assert.equal(trainingGate('SEO-D32',valid).eligible_for_external_human_authority_review,true);
 assert.equal(trainingGate('SEO-D32',valid).certified_for_prod,false);
});
