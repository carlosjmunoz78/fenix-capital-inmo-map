import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCreativeOutputPlan, listCreativeOutputCatalog, OUTPUT_PRESETS } from '../runtime/creative-output-pipeline-v1.mjs';

const base = (overrides={}) => ({
  company_id:'fenix',
  engine_id:'SOC-001',
  environment:'PREPROD',
  version:'v1',
  request_id:'creative:req:001',
  asset_ref:'creative:asset:001',
  brand_profile_ref:'brand:fenix:capital:v1',
  brief_ref:'brief:social:001',
  channel:'INSTAGRAM',
  output_type:'STATIC_POST',
  expected_cost_eur:0,
  confidence:1,
  ...overrides
});

test('catalog exposes shared outputs without publication authority', () => {
  const out = listCreativeOutputCatalog();
  assert.equal(out.default_additional_cost_eur,0);
  assert.equal(out.publication_authority,false);
  assert.ok(out.channels.includes('SEO'));
  assert.ok(out.channels.includes('FACEBOOK'));
  assert.ok(out.outputs.REEL);
  assert.ok(out.outputs.CAROUSEL);
});

test('every output preset builds in PREPROD with zero cost', () => {
  for (const outputType of Object.keys(OUTPUT_PRESETS)) {
    const out = buildCreativeOutputPlan(base({
      output_type:outputType,
      channel: outputType === 'SEO_IMAGE' ? 'SEO' : 'INSTAGRAM',
      page_count: outputType === 'CAROUSEL' ? 7 : undefined
    }));
    assert.equal(out.ok,true,outputType);
    assert.equal(out.status,'CREATIVE_OUTPUT_PLAN_READY',outputType);
    assert.equal(out.additional_cost_eur,0,outputType);
    assert.equal(out.publish_authorized,false,outputType);
    assert.equal(out.brand_gate.required,true,outputType);
  }
});

test('carousel is multi-page brand-governed and never publishes by itself', () => {
  const out = buildCreativeOutputPlan(base({output_type:'CAROUSEL',page_count:8,publish_requested:true}));
  assert.equal(out.page_count,8);
  assert.equal(out.preset.multi_page,true);
  assert.equal(out.publication.requested,true);
  assert.equal(out.publication.authorized,false);
  assert.equal(out.publication.authority_owner,'SOC-001');
});

test('reel uses shared Multimedia Factory path with captions and deterministic render policy', () => {
  const out = buildCreativeOutputPlan(base({
    output_type:'REEL',
    voice_requested:true,
    generated_visuals_required:true,
    source_clips_present:true,
    duration_sec:35,
    ffmpeg_binary_verified:true,
    ffmpeg_binary_version_ref:'ffmpeg:verified:v1'
  }));
  assert.equal(out.route.capability_id,'DIGITAL-BUILD-MULTIMEDIA');
  assert.equal(out.video.duration_sec,35);
  assert.equal(out.video.captions_required,true);
  assert.equal(out.video.render_policy.deterministic,true);
  assert.equal(out.video.render_policy.visual_identity_required,true);
  assert.ok(out.video.stages.some(s => s.adapter === 'QWEN3_TTS'));
  assert.ok(out.video.stages.some(s => s.adapter === 'HYPERFRAMES'));
  assert.ok(out.video.stages.some(s => s.adapter === 'OPENMONTAGE'));
  assert.ok(out.video.stages.some(s => s.adapter === 'FFMPEG'));
  assert.ok(out.qa_gates.includes('CAPTIONS'));
});

test('SEO image is available to SEO-001 through the shared local visual route', () => {
  const out = buildCreativeOutputPlan(base({engine_id:'SEO-001',channel:'SEO',output_type:'SEO_IMAGE'}));
  assert.equal(out.ok,true);
  assert.equal(out.route.capability_id,'CREATIVE-VISUAL-LOCAL-V1');
  assert.equal(out.preset.width,1200);
  assert.equal(out.preset.height,630);
});

test('Canva-native requirement falls back safely in PREPROD when OAuth binding is not green', () => {
  const out = buildCreativeOutputPlan(base({
    output_type:'CAROUSEL',
    page_count:5,
    canva_native_required:true,
    canva_binding_green:false,
    local_fallback_allowed:true
  }));
  assert.equal(out.ok,true);
  assert.equal(out.route.capability_id,'CREATIVE-VISUAL-LOCAL-V1');
  assert.equal(out.route.status,'PREPROD_FALLBACK_WITH_CAPABILITY_GAP');
});

test('paid provider or non-zero incremental spend is MONEY_LIMIT', () => {
  const paid = buildCreativeOutputPlan(base({paid_provider_requested:true}));
  assert.equal(paid.status,'HUMAN_REQUIRED');
  assert.equal(paid.reason,'MONEY_LIMIT');
  const cost = buildCreativeOutputPlan(base({expected_cost_eur:0.01}));
  assert.equal(cost.status,'HUMAN_REQUIRED');
  assert.equal(cost.reason,'MONEY_LIMIT');
});

test('cross-company request fails closed as SECURITY_INCIDENT', () => {
  const out = buildCreativeOutputPlan(base({target_company_id:'other-company'}));
  assert.equal(out.status,'HUMAN_REQUIRED');
  assert.equal(out.reason,'SECURITY_INCIDENT');
});

test('brand identity is mandatory', () => {
  assert.throws(() => buildCreativeOutputPlan(base({brand_profile_ref:''})),/BRAND_PROFILE_REF_REQUIRED/);
});

test('PROD fails closed until pipeline certification is explicit', () => {
  const out = buildCreativeOutputPlan(base({environment:'PROD'}));
  assert.equal(out.ok,false);
  assert.equal(out.status,'HOLD_CREATIVE_PIPELINE_NOT_PROD_CERTIFIED');
  assert.equal(out.publish_authorized,false);
});

test('low confidence and high risk use canonical human exceptions', () => {
  const low = buildCreativeOutputPlan(base({confidence:0.5}));
  assert.equal(low.reason,'LOW_CONFIDENCE');
  const risk = buildCreativeOutputPlan(base({high_risk:true}));
  assert.equal(risk.reason,'HIGH_RISK');
});
