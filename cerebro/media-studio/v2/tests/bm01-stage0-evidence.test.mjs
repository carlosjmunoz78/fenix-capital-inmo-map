import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBm01Stage0Evidence} from '../benchmarks/bm01-stage0-evidence.mjs';

function report(overrides={}){return {state_type:'CEREBRO_UMS_BM01_STAGE0_REPORT_V1',environment:'PREPROD',identity_type:'SYNTHETIC_ORIGINAL',real_person_reference:false,character_id:'UMS-SYNTH-CHAR-001',character_bible_sha256:'a'.repeat(64),installation_performed:false,network_download_performed:false,external_network_used_by_test:false,observed_at:'2026-10-25T15:00:00Z',reference_assets:[
  {view:'FRONT',mime:'image/png',sha256:'1'.repeat(64),bytes:1000,width:512,height:512},
  {view:'PROFILE_LEFT',mime:'image/png',sha256:'2'.repeat(64),bytes:1000,width:512,height:512},
  {view:'THREE_QUARTER_RIGHT',mime:'image/png',sha256:'3'.repeat(64),bytes:1000,width:512,height:512}
],...overrides};}

test('valid synthetic stage 0 proves references but never grants BM-01 pass',()=>{
  const evidence=validateBm01Stage0Evidence(report());
  assert.equal(evidence.status,'BM01_STAGE0_REFERENCE_GREEN');
  assert.equal(evidence.benchmark_id,'BM-01');
  assert.equal(evidence.benchmark_state,'NOT_RUN');
  assert.equal(evidence.benchmark_credit,false);
  assert.equal(evidence.readiness_mutation,false);
  assert.equal(evidence.operational_claim,false);
  assert.deepEqual(evidence.missing_for_bm01_pass,['VIDEO_IDENTITY_PROOF','THREE_D_REFERENCE_PROOF','CROSS_MODAL_CONSISTENCY_METRICS']);
});

test('real-person reference cannot enter synthetic BM-01 stage 0',()=>{
  assert.throws(()=>validateBm01Stage0Evidence(report({real_person_reference:true})),/SYNTHETIC_ORIGINAL_REQUIRED/);
});

test('all three distinct physical reference views are mandatory',()=>{
  const missing=report();missing.reference_assets=missing.reference_assets.slice(0,2);
  assert.throws(()=>validateBm01Stage0Evidence(missing),/THREE_QUARTER_RIGHT_REFERENCE_INVALID/);
  const duplicate=report();duplicate.reference_assets[2].sha256='2'.repeat(64);
  assert.throws(()=>validateBm01Stage0Evidence(duplicate),/REFERENCES_NOT_DISTINCT/);
});

test('network or install activity fails closed',()=>{
  assert.throws(()=>validateBm01Stage0Evidence(report({network_download_performed:true})),/ZERO_INSTALL_ZERO_NETWORK/);
});
