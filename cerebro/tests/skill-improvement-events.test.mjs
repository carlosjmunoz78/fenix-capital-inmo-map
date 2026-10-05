import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSkillImprovementEventProposals} from '../skills/skill-improvement-events.mjs';

const shortlist={results:[
  {candidate_id:'gap',disposition:'GAP_REVIEW_REQUIRED',source_ref:'https://d/gap',upstream_full_name:'acme/gap',upstream_head_commit:'a1',suggested_engine_bindings:['FACT-001']},
  {candidate_id:'sec',disposition:'QUARANTINE_SECURITY_REVIEW',source_ref:'https://d/sec',upstream_full_name:'acme/sec',upstream_head_commit:'b1',suggested_engine_bindings:['SEC-001'],static_flags:['SHELL_PIPE_EXEC']},
  {candidate_id:'lic',disposition:'LICENSE_REVIEW_REQUIRED',source_ref:'https://d/lic',upstream_full_name:'acme/lic',upstream_head_commit:'c1',repo_license_spdx:null,suggested_engine_bindings:['FACT-001']},
  {candidate_id:'perm',disposition:'PERMISSION_REVIEW_REQUIRED',source_ref:'https://d/perm',upstream_full_name:'acme/perm',upstream_head_commit:'d1',static_flags:['SECRET_ACCESS_MENTION'],suggested_engine_bindings:['IAM-001']}
]};
const prelab={results:[
  {candidate_id:'testsec',prelab_state:'TEST_CODE_REVIEW_REQUIRED',source_ref:'https://d/test',upstream_full_name:'acme/test',upstream_head_commit:'e1',bundle_static_flags:['DESTRUCTIVE_FS']}
]};
const wrappers={plans:[{
  wrapper_id:'skillwrap:x',candidate_id:'ready',domain:'software-engineering-devops',skill_class:'SHARED',engine_bindings:['FACT-001','QA-001'],next_gate:'BUILD_NORMALIZED_INSTRUCTION_WRAPPER_IN_LAB_WITHOUT_EXTERNAL_EXECUTION',provenance:{source_ref:'https://d/ready',upstream_full_name:'acme/ready',upstream_head_commit:'f1',manifest_path:'skills/x/SKILL.md',manifest_sha256:'1'.repeat(64)}
}]};

test('emits gap, security, license, permission and static-ready proposals',()=>{
  const report=buildSkillImprovementEventProposals(shortlist,prelab,wrappers);
  assert.equal(report.event_counts.CAPABILITY_GAP_DETECTED,1);
  assert.equal(report.event_counts.SECURITY_ADVISORY,2);
  assert.equal(report.event_counts.SKILL_LICENSE_REVIEW_REQUIRED,1);
  assert.equal(report.event_counts.SKILL_PERMISSION_REVIEW_REQUIRED,1);
  assert.equal(report.event_counts.SKILL_CANDIDATE_STATIC_READY,1);
});

test('events are never published or PROD-authorized from this layer',()=>{
  const report=buildSkillImprovementEventProposals(shortlist,prelab,wrappers);
  assert.equal(report.publish_authorized,false);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.rsi_hook_status,'DEFINED_NOT_CONNECTED');
  for(const event of report.events){
    assert.equal(event.publish_authorized,false);
    assert.equal(event.prod_authorized,false);
    assert.equal(event.environment,'PREPROD_CANDIDATE');
  }
});

test('event identifiers are stable and deduplicated',()=>{
  const a=buildSkillImprovementEventProposals(shortlist,prelab,wrappers);
  const b=buildSkillImprovementEventProposals(shortlist,prelab,wrappers);
  assert.deepEqual(a.events.map(x=>x.event_id),b.events.map(x=>x.event_id));
  assert.equal(new Set(a.events.map(x=>x.event_id)).size,a.events.length);
});
