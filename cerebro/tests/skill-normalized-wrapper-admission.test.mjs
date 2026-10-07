import test from 'node:test';
import assert from 'node:assert/strict';
import {assessNormalizedWrapperAdmission} from '../skills/skill-normalized-wrapper-admission.mjs';
import {buildAgentBrowserOldVsNew} from '../skills/skill-agent-browser-old-vs-new.mjs';

const candidateId='mcpservers-agent-skills:157e52d4ac5038d53c1a';
const staticLab={results:[{candidate_id:candidateId,domain:'browser-automation-scraping',upstream_full_name:'vercel-labs/agent-browser',upstream_head_commit:'f7c8b071343dda29477a56cb336ea76144c05496',status:'STATIC_LAB_HOLD',coverage_score:88.89,policy_alignment_score:75,hard_blocks:[]}]};
const safePlan={candidate_id:candidateId,wrapper_id:'skillwrap:source-plan',enabled:false,execution_authorized:false,install_authorized:false,prod_authorized:false,new_engine_id:false,owner_engine_id:'FACT-001',domain:'browser-automation-scraping',engine_bindings:['AUTO-001','QA-001'],provenance:{upstream_full_name:'vercel-labs/agent-browser',upstream_head_commit:'f7c8b071343dda29477a56cb336ea76144c05496',manifest_sha256:'3'.repeat(64)},permissions:{network:false,filesystem_read:false,filesystem_write:false,credentials:false,external_actions:false,prod_write:false,trading_access:false},economics:{additional_cost_target_eur:0,paid_service_required:false},next_gate:'BUILD_NORMALIZED_INSTRUCTION_WRAPPER_IN_LAB_WITHOUT_EXTERNAL_EXECUTION'};
const wrappers={plans:[safePlan]};

test('normalized admission preserves raw HOLD and creates a separate wrapper-green gate without relaxing thresholds',()=>{
  const report=assessNormalizedWrapperAdmission(staticLab,wrappers,{observedAt:'2026-10-07T00:00:00Z'});
  assert.equal(report.raw_static_results_mutated,false);
  assert.equal(report.thresholds_relaxed,false);
  assert.equal(report.external_skill_code_executed,false);
  const result=report.results[0];
  assert.equal(result.raw_static_status,'STATIC_LAB_HOLD');
  assert.equal(result.raw_policy_alignment_score,75);
  assert.equal(result.raw_status_preserved,true);
  assert.equal(result.status,'NORMALIZED_WRAPPER_GREEN_FOR_BEHAVIORAL_EVAL');
  assert.equal(result.normalized_policy_alignment_score,100);
  assert.deepEqual(result.blockers,[]);
});

test('raw security hard block can never be wrapper-admitted',()=>{
  const bad=structuredClone(staticLab);bad.results[0].hard_blocks=['ANTI_DETECT'];
  const report=assessNormalizedWrapperAdmission(bad,wrappers);
  assert.equal(report.results[0].status,'BLOCKED_RAW_SECURITY');
  assert.ok(report.results[0].blockers.includes('RAW_STATIC_HARD_BLOCK'));
});

test('only exact approved upstream and fail-closed disabled plan can be wrapper-admitted',()=>{
  const wrong=structuredClone(staticLab);wrong.results[0].upstream_full_name='other/browser';
  let report=assessNormalizedWrapperAdmission(wrong,wrappers);
  assert.equal(report.results[0].status,'BLOCKED_UNAPPROVED_UPSTREAM');
  const unsafe=structuredClone(wrappers);unsafe.plans[0].permissions.external_actions=true;
  report=assessNormalizedWrapperAdmission(staticLab,unsafe);
  assert.equal(report.results[0].status,'NORMALIZED_WRAPPER_HOLD');
  assert.ok(report.results[0].blockers.includes('DISABLED_WRAPPER_PLAN_NOT_FAIL_CLOSED'));
});

test('wrapper-admitted agent-browser receives one isolated OLD-vs-NEW package with exactly six-call shape',()=>{
  const admission=assessNormalizedWrapperAdmission(staticLab,wrappers);
  const values={results:[{candidate_id:candidateId,value_score:88.53}]};
  const report=buildAgentBrowserOldVsNew(admission,values,wrappers,{createdAt:'2026-10-07T00:00:00Z'});
  assert.equal(report.packages_total,1);
  const pkg=report.packages[0];
  assert.equal(pkg.admission_basis,'NORMALIZED_CEREBRO_WRAPPER');
  assert.equal(pkg.raw_static_status,'STATIC_LAB_HOLD');
  assert.equal(pkg.raw_status_preserved,true);
  assert.equal(pkg.fixtures.length,3);
  assert.equal(pkg.fixtures.length*2,6);
  assert.equal(pkg.external_skill_execution_authorized,false);
  assert.equal(pkg.prod_authorized,false);
  assert.equal(pkg.promotion_authorized,false);
});
