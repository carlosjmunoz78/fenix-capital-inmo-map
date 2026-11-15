import test from 'node:test';
import assert from 'node:assert/strict';
import {auditSeoDepartmentReadiness} from '../runtime/seo-department-ops-supervisor-v1.mjs';
test('all 32 knowledge packs, all 141 templates, 191 roles and 573 drills are complete, not autonomous',()=>{
 const x=auditSeoDepartmentReadiness();
 assert.equal(x.department_count,32);
 assert.equal(x.specialist_template_count,141);
 assert.equal(x.role_count,191);
 assert.equal(x.training_cases_prepared,573);
 assert.equal(x.departments.every(y=>y.knowledge_package_present&&y.prepared_exercises===y.specialist_templates*3),true);
 assert.equal(x.departments.every(y=>y.certified_prod===false&&y.active_independent_specialists_verified===0),true);
 assert.equal(x.real_google_metrics_read,false);
 assert.equal(x.actual_paid_model_calls,0);
 assert.equal(x.release_decision,'HOLD');
});
test('no unverified evidence can self-promote SEO to GSC / IAM / professional exam / backup',()=>{
 for(const key of ['agent_iam_verified','professional_exams_passed','prod_certified','gsc_authenticated','wordpress_restorable_backup']){
  assert.throws(()=>auditSeoDepartmentReadiness({externalEvidence:{[key]:true}}),/UNATTESTED_EXTERNAL_EVIDENCE/);
 }
 assert.throws(()=>auditSeoDepartmentReadiness({environment:'PROD'}),/INPUT_OR_ENVIRONMENT/);
});
