import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhysicalBenchmarkPlan,evaluatePhysicalBenchmarkEvidence} from '../benchmarks/physical-benchmark-harness.mjs';

const validRights={consent_status:'VALID',consent_record_id:'CONSENT-VOICE-001',scope:['VOICE_CLONE','VOICE_CONVERSION','TTS','MULTILINGUAL_VOICE'],provenance_record:'prov://consent/001',revocation_process:'revocation://consent/001'};

test('BM-01 creates a physical plan but never claims PASS before evidence',()=>{
  const plan=createPhysicalBenchmarkPlan({benchmark_id:'BM-01',input:{identity_type:'SYNTHETIC_ORIGINAL',character_bible_ref:'asset://character-bible/1',reference_assets:['asset://front','asset://side','asset://expression']}});
  assert.equal(plan.status,'READY_FOR_PHYSICAL_RUN');
  assert.equal(plan.pass_not_claimed,true);
  const result=evaluatePhysicalBenchmarkEvidence(plan,{physical_execution:false});
  assert.equal(result.state,'NOT_RUN');
});

test('BM-03 blocks real voice clone when legal consent evidence is missing',()=>{
  const plan=createPhysicalBenchmarkPlan({benchmark_id:'BM-03',input:{identity_type:'REAL_AUTHORIZED',rights_record:{consent_status:'VALID'},source_audio_refs:['asset://voice/source']}});
  assert.equal(plan.status,'HUMAN_REQUIRED');
  assert.equal(plan.human_required,'LEGAL_REQUIRED');
});

test('BM-03 requires explicit voice-cloning scope even with otherwise valid rights',()=>{
  assert.throws(()=>createPhysicalBenchmarkPlan({benchmark_id:'BM-03',input:{identity_type:'REAL_AUTHORIZED',rights_record:{...validRights,scope:['PHOTO_USE']},source_audio_refs:['asset://voice/source']}}),/BM03_CONSENT_SCOPE/);
});

test('BM-03 valid consent only makes the run ready; it does not pass the benchmark',()=>{
  const plan=createPhysicalBenchmarkPlan({benchmark_id:'BM-03',input:{identity_type:'REAL_AUTHORIZED',rights_record:validRights,source_audio_refs:['asset://voice/source']}});
  assert.equal(plan.status,'READY_FOR_PHYSICAL_RUN');
  assert.equal(plan.pass_not_claimed,true);
  assert.equal(evaluatePhysicalBenchmarkEvidence(plan,{physical_execution:true,artifacts:[],evidence_refs:[],metrics:{}}).state,'FAIL');
});

test('PASS_WITH_EVIDENCE requires physical execution, immutable artifact hashes, refs and green metrics',()=>{
  const plan=createPhysicalBenchmarkPlan({benchmark_id:'BM-01',input:{identity_type:'SYNTHETIC_ORIGINAL',character_bible_ref:'asset://character-bible/1',reference_assets:['asset://front','asset://side','asset://expression']}});
  const artifacts=Array.from({length:4},(_,i)=>({uri:`artifact://bm01/${i}`,sha256:String(i+1).padStart(64,'a')}));
  const result=evaluatePhysicalBenchmarkEvidence(plan,{physical_execution:true,artifacts,evidence_refs:['evidence://run/1','evidence://tribunal/1'],metrics:{quality_gate:'PASS',rights_gate:'PASS',provenance_gate:'PASS'}});
  assert.equal(result.state,'PASS_WITH_EVIDENCE');
  assert.equal(result.immutable_evidence,true);
});
