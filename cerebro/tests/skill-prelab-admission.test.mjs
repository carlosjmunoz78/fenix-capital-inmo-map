import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPrelabAdmission,classifyBundleRisk} from '../skills/skill-prelab-admission.mjs';

function baseShortlist(overrides={}){
  return {results:[{candidate_id:'c1',source_ref:'https://directory/x',upstream_full_name:'acme/x',top_domain:'software-engineering-devops',priority:'P0',disposition:'LAB_REVIEW_CANDIDATE',repo_license_spdx:'MIT',...overrides}]};
}
function baseBundle(overrides={}){
  return {results:[{candidate_id:'c1',status:'BUNDLE_STATIC_SCAN_COMPLETE',code_files_count:0,bundle_static_flags:[],fetched_text_files:[],...overrides}]};
}
function baseLicense(overrides={}){
  return {results:[{candidate_id:'c1',status:'EXACT_LICENSE_FILE_EVIDENCE',detected_families:['MIT'],repo_license_spdx:'MIT',metadata_matches_detected:true,exact_evidence:[{path:'LICENSE',sha256:'a'.repeat(64)}],...overrides}]};
}

test('clean instruction-only P0 candidate becomes static pre-LAB ready but not authorized',()=>{
  const report=buildPrelabAdmission(baseShortlist(),baseBundle(),baseLicense());
  assert.equal(report.priority_scope,'P0');
  assert.equal(report.static_prelab_ready,1);
  assert.equal(report.results[0].prelab_state,'STATIC_PRELAB_READY_INSTRUCTION_ONLY');
  assert.equal(report.results[0].sandbox_authorized,false);
  assert.equal(report.results[0].install_authorized,false);
  assert.equal(report.results[0].prod_authorized,false);
});

test('matching SPDX evidence is accepted even when supplemental NOTICE is unclassified',()=>{
  const license=baseLicense({detected_families:['Apache-2.0','UNKNOWN'],repo_license_spdx:'Apache-2.0',metadata_matches_detected:true});
  const shortlist=baseShortlist({repo_license_spdx:'Apache-2.0'});
  const item=buildPrelabAdmission(shortlist,baseBundle(),license).results[0];
  assert.equal(item.prelab_state,'STATIC_PRELAB_READY_INSTRUCTION_ONLY');
});

test('clean code bundle requires isolated sandbox design and is not auto-executed',()=>{
  const report=buildPrelabAdmission(baseShortlist(),baseBundle({code_files_count:3}),baseLicense());
  assert.equal(report.results[0].prelab_state,'STATIC_PRELAB_READY_CODE_BUNDLE');
  assert.match(report.results[0].next_action,/SANDBOX/);
  assert.equal(report.sandbox_authorized,false);
});

test('runtime execution/destructive flag blocks static admission',()=>{
  const bundles=baseBundle({bundle_static_flags:['PROCESS_EXEC'],fetched_text_files:[{path:'scripts/run.py',flags:['PROCESS_EXEC']}]});
  const item=buildPrelabAdmission(baseShortlist(),bundles,baseLicense()).results[0];
  assert.equal(item.prelab_state,'SECURITY_REVIEW_REQUIRED');
});

test('test-only flags are separated from runtime flags and require focused review',()=>{
  const bundles=baseBundle({bundle_static_flags:['DESTRUCTIVE_FS'],fetched_text_files:[{path:'scripts/test_pack.py',flags:['DESTRUCTIVE_FS']}]});
  const risk=classifyBundleRisk(bundles.results[0]);
  assert.equal(risk.state,'TEST_ONLY_FLAGS');
  const item=buildPrelabAdmission(baseShortlist(),bundles,baseLicense()).results[0];
  assert.equal(item.prelab_state,'TEST_CODE_REVIEW_REQUIRED');
});

test('secret/network runtime flags require permission review',()=>{
  const bundles=baseBundle({bundle_static_flags:['SECRET_ENV_ACCESS'],fetched_text_files:[{path:'scripts/run.py',flags:['SECRET_ENV_ACCESS']}]});
  const item=buildPrelabAdmission(baseShortlist(),bundles,baseLicense()).results[0];
  assert.equal(item.prelab_state,'PERMISSION_REVIEW_REQUIRED');
});

test('license evidence mismatch or absence blocks static admission',()=>{
  const missing=buildPrelabAdmission(baseShortlist(),baseBundle(),{results:[]}).results[0];
  assert.equal(missing.prelab_state,'LICENSE_EVIDENCE_REVIEW_REQUIRED');
  const mismatch=buildPrelabAdmission(baseShortlist(),baseBundle(),baseLicense({metadata_matches_detected:false,detected_families:['Apache-2.0']})).results[0];
  assert.equal(mismatch.prelab_state,'LICENSE_EVIDENCE_REVIEW_REQUIRED');
});

test('existing candidate policy remains authoritative before pre-LAB',()=>{
  const shortlist=baseShortlist({disposition:'PERMISSION_REVIEW_REQUIRED'});
  const item=buildPrelabAdmission(shortlist,baseBundle(),baseLicense()).results[0];
  assert.equal(item.prelab_state,'BLOCKED_BY_EXISTING_POLICY');
});

test('P1/P2 candidates remain out of default P0 admission scope',()=>{
  const shortlist=baseShortlist({priority:'P1'});
  const report=buildPrelabAdmission(shortlist,baseBundle(),baseLicense());
  assert.equal(report.priority_scope,'P0');
  assert.equal(report.results[0].prelab_state,'OUT_OF_SCOPE_PRIORITY');
  assert.equal(report.results[0].next_action,'WAIT_FOR_P1_P2_PASS');
});

test('explicit P1 scope evaluates P1 while preserving P0 out of scope',()=>{
  const shortlist={results:[
    {...baseShortlist().results[0],candidate_id:'p0',priority:'P0'},
    {...baseShortlist().results[0],candidate_id:'p1',priority:'P1'}
  ]};
  const bundles={results:[
    {...baseBundle().results[0],candidate_id:'p0'},
    {...baseBundle().results[0],candidate_id:'p1'}
  ]};
  const licenses={results:[
    {...baseLicense().results[0],candidate_id:'p0'},
    {...baseLicense().results[0],candidate_id:'p1'}
  ]};
  const report=buildPrelabAdmission(shortlist,bundles,licenses,{priority:'P1'});
  assert.equal(report.priority_scope,'P1');
  assert.equal(report.scoped_candidates,1);
  assert.equal(report.static_prelab_ready,1);
  assert.equal(report.results.find((x)=>x.candidate_id==='p0').prelab_state,'OUT_OF_SCOPE_PRIORITY');
  assert.equal(report.results.find((x)=>x.candidate_id==='p1').prelab_state,'STATIC_PRELAB_READY_INSTRUCTION_ONLY');
  assert.equal(report.prod_authorized,false);
});

test('unsupported priority scope fails closed',()=>{
  assert.throws(()=>buildPrelabAdmission(baseShortlist(),baseBundle(),baseLicense(),{priority:'P3'}),/unsupported pre-LAB priority scope/);
});
