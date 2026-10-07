import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWrapperPlans} from '../skills/skill-wrapper-plan.mjs';

const prelab={results:[
  {candidate_id:'c1',prelab_state:'STATIC_PRELAB_READY_INSTRUCTION_ONLY',upstream_head_commit:'abc',bundle_static_flags:[]},
  {candidate_id:'c2',prelab_state:'SECURITY_REVIEW_REQUIRED',upstream_head_commit:'def',bundle_static_flags:['PROCESS_EXEC']}
]};
const shortlist={results:[
  {candidate_id:'c1',source_ref:'https://directory/x',upstream_full_name:'acme/x',upstream_head_commit:'abc',manifest_path:'skills/x/SKILL.md',manifest_sha256:'1'.repeat(64),top_domain:'software-engineering-devops',suggested_engine_bindings:['FACT-001','QA-001'],repo_license_spdx:'MIT'},
  {candidate_id:'c2',source_ref:'https://directory/y',upstream_full_name:'acme/y',upstream_head_commit:'def',manifest_path:'skills/y/SKILL.md',manifest_sha256:'2'.repeat(64),top_domain:'agent-ai-orchestration',suggested_engine_bindings:['ORCH-001'],repo_license_spdx:'MIT'}
]};
const manifests={results:[
  {candidate_id:'c1',declared_name:'skill-x',declared_description:'Useful instructions',sha256:'1'.repeat(64),upstream_head_commit:'abc'},
  {candidate_id:'c2',declared_name:'skill-y',declared_description:'Risky',sha256:'2'.repeat(64),upstream_head_commit:'def'}
]};
const licenses={results:[
  {candidate_id:'c1',status:'EXACT_LICENSE_FILE_EVIDENCE',exact_evidence:[{fetched:true,path:'LICENSE',sha256:'a'.repeat(64),detected_family:'MIT'}]}
]};

test('only static pre-LAB ready candidates receive wrapper plans',()=>{
  const report=buildWrapperPlans(prelab,shortlist,manifests,licenses);
  assert.equal(report.wrapper_plans,1);
  assert.equal(report.plans[0].candidate_id,'c1');
});

test('wrapper plan is disabled and denies every side effect by default',()=>{
  const plan=buildWrapperPlans(prelab,shortlist,manifests,licenses).plans[0];
  assert.equal(plan.enabled,false);
  assert.equal(plan.execution_authorized,false);
  assert.equal(plan.install_authorized,false);
  assert.equal(plan.prod_authorized,false);
  assert.deepEqual(plan.permissions,{network:false,filesystem_read:false,filesystem_write:false,credentials:false,external_actions:false,prod_write:false,trading_access:false});
});

test('wrapper preserves exact provenance and leaves contracts unresolved for LAB',()=>{
  const plan=buildWrapperPlans(prelab,shortlist,manifests,licenses).plans[0];
  assert.equal(plan.provenance.upstream_head_commit,'abc');
  assert.equal(plan.provenance.manifest_sha256,'1'.repeat(64));
  assert.equal(plan.provenance.legal_compatibility,'UNASSESSED');
  assert.equal(plan.contract.inputs,'UNRESOLVED_LAB_CONTRACT');
  assert.equal(plan.contract.outputs,'UNRESOLVED_LAB_CONTRACT');
});

test('software engineering candidate is classified shared without creating engine id',()=>{
  const plan=buildWrapperPlans(prelab,shortlist,manifests,licenses).plans[0];
  assert.equal(plan.skill_class,'SHARED');
  assert.equal(plan.new_engine_id,false);
  assert.equal(plan.owner_engine_id,'FACT-001');
});
