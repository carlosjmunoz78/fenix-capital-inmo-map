import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReviewedPrelab} from '../skills/skill-test-only-prelab-review.mjs';

function raw(overrides={}){
  return {results:[{
    candidate_id:'c1',
    prelab_state:'TEST_CODE_REVIEW_REQUIRED',
    next_action:'REVIEW_TEST_ONLY_FLAGS_AND_CONFIRM_NO_RUNTIME_PATH',
    bundle_risk:{state:'TEST_ONLY_FLAGS',runtime_flags:[],test_only_flags:['DESTRUCTIVE_FS'],evidence:[{path:'scripts/test_pack.py',flag:'DESTRUCTIVE_FS',scope:'TEST'}]},
    sandbox_authorized:false,install_authorized:false,prod_authorized:false,
    ...overrides
  }]};
}
function bundles(overrides={}){
  return {results:[{
    candidate_id:'c1',status:'BUNDLE_STATIC_SCAN_COMPLETE',
    fetched_text_files:[
      {path:'scripts/package.py',flags:[]},
      {path:'scripts/test_pack.py',flags:['DESTRUCTIVE_FS']}
    ],
    ...overrides
  }]};
}
function licenses(overrides={}){
  return {results:[{candidate_id:'c1',status:'EXACT_LICENSE_FILE_EVIDENCE',detected_families:['MIT'],repo_license_spdx:'MIT',metadata_matches_detected:true,...overrides}]};
}

test('reviewed test-only flags can advance to wrapper planning without authorizing execution',()=>{
  const report=buildReviewedPrelab(raw(),bundles(),licenses());
  const item=report.results[0];
  assert.equal(item.prelab_state,'STATIC_PRELAB_READY_CODE_BUNDLE_REVIEWED_TEST_ONLY');
  assert.equal(item.test_only_review.status,'GREEN_FOR_WRAPPER_PLANNING_ONLY');
  assert.equal(item.test_only_review.green,true);
  assert.equal(item.sandbox_authorized,false);
  assert.equal(report.external_code_executed,false);
  assert.equal(report.prod_authorized,false);
});

test('flag on runtime/support file remains fail-closed',()=>{
  const report=buildReviewedPrelab(raw(),bundles({fetched_text_files:[{path:'scripts/package.py',flags:['DESTRUCTIVE_FS']},{path:'scripts/test_pack.py',flags:['DESTRUCTIVE_FS']}]}),licenses());
  const item=report.results[0];
  assert.equal(item.prelab_state,'TEST_CODE_REVIEW_REQUIRED');
  assert.equal(item.test_only_review.green,false);
  assert.ok(item.test_only_review.blockers.includes('FLAGGED_RUNTIME_OR_SUPPORT_FILE'));
});

test('runtime risk evidence remains fail-closed',()=>{
  const report=buildReviewedPrelab(raw({bundle_risk:{state:'TEST_ONLY_FLAGS',runtime_flags:['PROCESS_EXEC'],test_only_flags:['DESTRUCTIVE_FS'],evidence:[{path:'scripts/test_pack.py',flag:'DESTRUCTIVE_FS',scope:'TEST'}]}}),bundles(),licenses());
  assert.equal(report.results[0].test_only_review.green,false);
  assert.ok(report.results[0].test_only_review.blockers.includes('RUNTIME_FLAGS_PRESENT'));
});

test('license evidence must remain exact and aligned',()=>{
  const report=buildReviewedPrelab(raw(),bundles(),licenses({detected_families:['Apache-2.0'],repo_license_spdx:'MIT',metadata_matches_detected:false}));
  assert.equal(report.results[0].test_only_review.green,false);
  assert.ok(report.results[0].test_only_review.blockers.includes('LICENSE_EVIDENCE_NOT_EXACT_GREEN'));
});

test('non-review candidates are preserved',()=>{
  const input=raw({prelab_state:'STATIC_PRELAB_READY_INSTRUCTION_ONLY',bundle_risk:{state:'STATIC_CLEAR',runtime_flags:[],test_only_flags:[],evidence:[]}});
  const report=buildReviewedPrelab(input,bundles(),licenses());
  assert.equal(report.results[0].prelab_state,'STATIC_PRELAB_READY_INSTRUCTION_ONLY');
  assert.equal(report.test_only_reviews,0);
  assert.equal(report.raw_prelab_preserved,true);
});
