import test from 'node:test';
import assert from 'node:assert/strict';
import { createPhysicalCapabilityRegistry } from '../runtime/physical-capability-registry.mjs';
import { executePremiumProduction } from '../runtime/premium-production-executor.mjs';
import { normalizeProductionJob } from '../runtime/production-job-contract.mjs';
import { CINEMATIC_BLOCKBUSTER_STUDIO_V1 } from '../runtime/studio-quality-standard.mjs';

const CAPABILITIES = ['creative_direction','story_or_script','visual_generation','camera_or_animation','edit','sound','independent_qa'];
const sha = (n) => String(n).padStart(64, 'a').slice(0, 64);

function tribunal(score = 9.3) {
  const review = (role) => ({ independent: true, reviewer_role: role, scores: { overall:score, art_direction:score, visual_richness:score, shot_variety:score, narrative_clarity:score, originality:score, audio_mix:score } });
  return { sampled_frames: 16, reviews: [review('QA-A'),review('QA-B'),review('QA-C')] };
}

function order(overrides = {}) {
  const { creative_payload: payloadOverrides = {}, ...rootOverrides } = overrides;
  return {
    kind:'cerebro.ums.production_order.v1', idempotency_key:'fenix-v2-test', audit_id:'FENIX-V2-TEST', company_id:'fenix', engine_id:'UMS-001', environment:'PREPROD', version:'v2', output_type:'REEL',
    quality_profile:'PREMIUM_CINEMATIC', quality_standard_id:CINEMATIC_BLOCKBUSTER_STUDIO_V1.id, expected_cost_eur:0, publish_requested:false,
    brief:{ objective:'Fénix cinematic premium benchmark', hook:'Tu casa no debería depender de improvisar.' },
    creative_payload:{
      primary_renderer:'PREMIUM_PHYSICAL_RENDERER_V2', legacy_programmatic_renderer_allowed:false,
      execution_capabilities:CAPABILITIES,
      assets:[{scene_role:'advisor',business_context:'mortgage advisory',geographic_context:'Cordoba Spain',source_rights:'AUTHORIZED_FIXTURE',context_relevance_score:0.95,composition:{target_aspect:'9:16',subject_safe:true,reframe_method:'MANUAL_SMART_REFIT'}}],
      narrative:{hook:'Tu casa no debería depender de improvisar.',hook_duration_sec:1.6},
      motion_plan:{still_derived_runtime_ratio:0.15,shot_classes:['LIVE','3D','VFX','CLOSEUP','WIDE']},
      voice:{enabled:true,provider_preference:['QWEN3_TTS_PHYSICAL_PREPROD']},
      audio:{music_required:true,ducking:true,sound_design:'LAYERED_FOLEY_AMBIENCE_TRANSIENTS'},
      subtitles:{enabled:true,horizontal_safe_margin_pct:10,bottom_safe_margin_pct:12,max_lines:2,max_chars_per_line:30,measured_bbox_required:true,style_profile:'DYNAMIC_BRAND_CAPTIONS'},
      qa:{independent_perceptual_tribunal:true,min_sampled_frames:12,subtitle_bbox_validation:true,composition_validation:true,audio_mix_validation:true},
      showcase_coverage:{character_or_human:true,photoreal_or_live_scene:true,three_d_or_vfx:true,design_or_illustration:true,editing_and_camera:true,audio_voice_music:true},
      visual_provenance:{procedural_frame_ratio:0.1,asset_classes:['LIVE_FOOTAGE','CHARACTER_SHOT','THREE_D_RENDER','VFX_COMPOSITE','ILLUSTRATION','COLOR_GRADE']},
      creative_tribunal:tribunal(),
      ...payloadOverrides,
    },
    ...rootOverrides,
  };
}

function reviewEvidence(score = 9.3) {
  return {
    technical_validation:{status:'PASS',validator:'MOCK_TECH_QA',evidence_ref:'evidence/technical.json'},
    showcase_coverage:{character_or_human:true,photoreal_or_live_scene:true,three_d_or_vfx:true,design_or_illustration:true,editing_and_camera:true,audio_voice_music:true},
    visual_provenance:{procedural_frame_ratio:0.1,asset_classes:['LIVE_FOOTAGE','CHARACTER_SHOT','THREE_D_RENDER','VFX_COMPOSITE','ILLUSTRATION','COLOR_GRADE']},
    creative_tribunal:tribunal(score),
  };
}

function registry(state='BOUND_AND_TESTED') {
  return createPhysicalCapabilityRegistry(CAPABILITIES.map((capability, i) => ({ capability, adapter_id:`A${i}`, status:state, license_status:'PASS', security_status:'PASS', cost_status:'ZERO', rollback_defined:true, physical_probe_status:'PASS', artifact_provenance:true })));
}
function preflightRegistry() {
  return {
    visual_motion:{status:'BOUND_AND_TESTED',class:'TRUE_VIDEO'},
    voice:{status:'BOUND_AND_TESTED',provider:'QWEN3_TTS_PHYSICAL_PREPROD',expressive:true,prosody_control:true,locale:'ES-ES'},
    music:{status:'BOUND_AND_TESTED',source_or_model:'AUTHORIZED_SCORE_STACK',rights_verified:true},
  };
}
function adapters(cost=0) {
  return Object.fromEntries(CAPABILITIES.map((capability,i)=>[`A${i}`,{
    async probe(){return {status:'PASS'};},
    async execute(){return {artifact_path:`evidence/${capability}.bin`,artifact_sha256:sha(i+1),tool_id:`TOOL-${i}`,version:'1.0.0',role_id:`ROLE-${i}`,pod_id:`POD-${i}`,provenance_verified:true,cost_eur:cost};}
  }]));
}

test('production contract rejects canary/programmatic primary on premium',()=>{
  assert.throws(()=>normalizeProductionJob(order({creative_payload:{primary_renderer:'PROGRAMMATIC_CANARY'}})),/PROCEDURAL_OR_CANARY_PRIMARY_FORBIDDEN/);
});

test('missing physical capability fails closed as WAITING_FOR_CAPABILITY', async()=>{
  const result=await executePremiumProduction(order(),{capability_registry:createPhysicalCapabilityRegistry([]),adapters:{},preflight_registry:preflightRegistry(),context:{review_evidence:reviewEvidence()}});
  assert.equal(result.status,'WAITING_FOR_CAPABILITY');
});

test('registered-only binding never executes', async()=>{
  const result=await executePremiumProduction(order(),{capability_registry:registry('REGISTERED'),adapters:adapters(),preflight_registry:preflightRegistry(),context:{review_evidence:reviewEvidence()}});
  assert.equal(result.status,'WAITING_FOR_CAPABILITY');
});

test('invalid artifact provenance blocks delivery', async()=>{
  const bad=adapters(); bad.A0={async probe(){return {status:'PASS'};},async execute(){return {artifact_path:'x',tool_id:'T',version:'1',role_id:'R',pod_id:'P',provenance_verified:true,cost_eur:0};}};
  const result=await executePremiumProduction(order(),{capability_registry:registry(),adapters:bad,preflight_registry:preflightRegistry(),context:{review_evidence:reviewEvidence()}});
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reason,'INVALID_ARTIFACT_PROVENANCE');
});

test('spend over zero ceiling escalates MONEY_LIMIT', async()=>{
  const result=await executePremiumProduction(order(),{capability_registry:registry(),adapters:adapters(0.01),preflight_registry:preflightRegistry(),context:{review_evidence:reviewEvidence()}});
  assert.equal(result.status,'HUMAN_REQUIRED');
  assert.equal(result.human_exception_reason,'MONEY_LIMIT');
});

test('planned QA claims inside request never count as acceptance evidence', async()=>{
  const result=await executePremiumProduction(order(),{capability_registry:registry(),adapters:adapters(),preflight_registry:preflightRegistry(),context:{}});
  assert.equal(result.status,'CREATIVE_REJECTED');
  assert.ok(result.quality.reasons.some((r)=>r.code==='MISSING_INDEPENDENT_CREATIVE_TRIBUNAL'));
});

test('creative tribunal below blockbuster floor is rejected', async()=>{
  const result=await executePremiumProduction(order(),{capability_registry:registry(),adapters:adapters(),preflight_registry:preflightRegistry(),context:{review_evidence:reviewEvidence(8.4)}});
  assert.equal(result.status,'CREATIVE_REJECTED');
});

test('fully proven zero-cost chain reaches DELIVERABLE_READY only after both creative gates', async()=>{
  const result=await executePremiumProduction(order(),{capability_registry:registry(),adapters:adapters(),preflight_registry:preflightRegistry(),context:{review_evidence:reviewEvidence()}});
  assert.equal(result.status,'DELIVERABLE_READY');
  assert.equal(result.cost_eur,0);
  assert.equal(result.publish_authorized,false);
  assert.equal(result.quality.status,'PASS');
  assert.equal(result.studio_quality.status,'PASS');
  assert.equal(result.bm13_evidence_candidate.state,'EVIDENCE_READY_FOR_BM13_GATE');
});
