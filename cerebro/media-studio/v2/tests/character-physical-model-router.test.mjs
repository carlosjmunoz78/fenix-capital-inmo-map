import test from 'node:test';
import assert from 'node:assert/strict';
import {routeCharacterPhysicalModels,assertCharacterModelPromotionEvidence,listCharacterPhysicalCandidates} from '../runtime/character-physical-model-router.mjs';

test('Qwen3-TTS is a zero-cost commercial voice-clone benchmark candidate in EU but never auto-installs',()=>{
  const plan=routeCharacterPhysicalModels({capability:'VOICE',territory:'EU',commercial:true,zero_cost_required:true});
  const qwen=plan.eligible_candidates.find(x=>x.candidate_id==='CHAR-QWEN3-TTS-06B-BASE');
  assert.ok(qwen);
  assert.equal(qwen.decision,'BENCHMARK_REQUIRED');
  assert.equal(qwen.install_authorized,false);
  assert.equal(qwen.prod_binding_authorized,false);
});

test('MuseTalk is routable for lip sync while dependency audit remains part of physical promotion evidence',()=>{
  const plan=routeCharacterPhysicalModels({capability:'LIPSYNC',territory:'EU',commercial:true,zero_cost_required:true});
  const muse=plan.eligible_candidates.find(x=>x.candidate_id==='CHAR-MUSETALK');
  assert.ok(muse);
  assert.equal(muse.decision,'BENCHMARK_REQUIRED');
});

test('Hunyuan3D 2.1 is denied in EU territory',()=>{
  const plan=routeCharacterPhysicalModels({capability:'IMAGE_TO_3D',territory:'EU',commercial:true,zero_cost_required:true,include_hold:true});
  assert.equal(plan.candidates.some(x=>x.candidate_id==='CHAR-HUNYUAN3D-21'&&x.eligible),false);
  const registry=listCharacterPhysicalCandidates();
  assert.ok(registry.candidates.find(x=>x.id==='CHAR-HUNYUAN3D-21').territory_exclusions.includes('EU'));
});

test('InsightFace pretrained models do not enter zero-cost commercial routing',()=>{
  const plan=routeCharacterPhysicalModels({capability:'FACE_SWAP',territory:'EU',commercial:true,zero_cost_required:true,include_hold:true});
  assert.equal(plan.eligible_candidates.some(x=>x.candidate_id==='CHAR-INSIGHTFACE-PRETRAINED'),false);
});

test('InstantID and LivePortrait are not silently eligible under zero-cost commercial policy',()=>{
  const image=routeCharacterPhysicalModels({capability:'IDENTITY_PRESERVING_IMAGE_GENERATION',territory:'EU',commercial:true,zero_cost_required:true,include_hold:true});
  assert.equal(image.eligible_candidates.some(x=>x.candidate_id==='CHAR-INSTANTID'),false);
  const motion=routeCharacterPhysicalModels({capability:'MOTION',territory:'EU',commercial:true,zero_cost_required:true,include_hold:true});
  assert.equal(motion.eligible_candidates.some(x=>x.candidate_id==='CHAR-LIVEPORTRAIT'),false);
});

test('IP-Adapter non-FaceID path may enter benchmark but base model remains separately governed',()=>{
  const plan=routeCharacterPhysicalModels({capability:'IMAGE_IDENTITY',territory:'EU',commercial:true,zero_cost_required:true});
  const ip=plan.eligible_candidates.find(x=>x.candidate_id==='CHAR-IP-ADAPTER');
  assert.ok(ip);
  assert.equal(ip.registry_status,'BENCHMARK_PRIORITY_1_BASE_MODEL_CONDITIONAL');
});

test('promotion gate fails closed until every physical, legal, cost, rollback and tribunal proof is green',()=>{
  const incomplete=assertCharacterModelPromotionEvidence({candidate_id:'CHAR-QWEN3-TTS-06B-BASE',evidence:{license_status:'PASS'}});
  assert.equal(incomplete.allowed,false);
  assert.ok(incomplete.missing.includes('benchmark_status'));
  assert.ok(incomplete.missing.includes('rollback_proven'));
  const complete=assertCharacterModelPromotionEvidence({candidate_id:'CHAR-QWEN3-TTS-06B-BASE',evidence:{
    source_pinned:true,artifact_hashes:['sha256:test'],license_status:'PASS',dependency_license_status:'PASS',security_status:'PASS',physical_smoke:'PASS',benchmark_status:'PASS',rights_provenance_status:'PASS',rollback_proven:true,rebuild_proven:true,measured_cost_eur:0,tribunal_status:'PASS'
  }});
  assert.deepEqual(complete,{allowed:true,reason:'PREPROD_PHYSICAL_PROMOTION_GATE_PASS',missing:[]});
});

test('HOLD or REJECT registry states cannot be overridden by fabricated green evidence',()=>{
  const evidence={source_pinned:true,artifact_hashes:['sha256:test'],license_status:'PASS',dependency_license_status:'PASS',security_status:'PASS',physical_smoke:'PASS',benchmark_status:'PASS',rights_provenance_status:'PASS',rollback_proven:true,rebuild_proven:true,measured_cost_eur:0,tribunal_status:'PASS'};
  const hold=assertCharacterModelPromotionEvidence({candidate_id:'CHAR-LIVEPORTRAIT',evidence});
  const reject=assertCharacterModelPromotionEvidence({candidate_id:'CHAR-HUNYUAN3D-21',evidence});
  assert.equal(hold.allowed,false);
  assert.match(hold.reason,/REGISTRY_BLOCK/);
  assert.equal(reject.allowed,false);
  assert.match(reject.reason,/REGISTRY_BLOCK/);
});
