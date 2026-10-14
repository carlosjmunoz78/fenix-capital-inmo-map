import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADAPTER_CATALOG,
  HUMAN_REQUIRED_REASONS,
  PHASE14_BLOCKS,
  PHASE14_CONTRACT,
  buildFfmpegReusePlan,
  buildLicenseAndCostGate,
  buildMultimediaTelemetry,
  buildVideoPipelinePlan,
  buildVoiceProviderBenchmark,
  createMultimediaLedger,
  getMultimediaAdapterCatalog,
  planMultimediaTask
} from '../digital-build/multimedia-factory-runtime-v0.mjs';

const context = Object.freeze({
  company_id: 'fenix', engine_id: 'FACT-001', capability_id: 'DIGITAL-BUILD-MULTIMEDIA', environment: 'PREPROD', version: '0.1.0'
});
const base = Object.freeze({ context, request_id: 'media:req:001', asset_ref: 'asset:001', adapter: 'COMFYUI', task_type: 'VISUAL_WORKFLOW', confidence: 0.95 });

test('phase 14 covers exact blocks 162-175 as one shared capability, not fourteen engines', () => {
  assert.deepEqual(PHASE14_CONTRACT.blocks, [162,163,164,165,166,167,168,169,170,171,172,173,174,175]);
  assert.equal(PHASE14_CONTRACT.new_engine_created, false);
  assert.equal(PHASE14_CONTRACT.owner_engine, 'FACT-001');
  assert.equal(PHASE14_CONTRACT.capability_id, 'DIGITAL-BUILD-MULTIMEDIA');
  assert.equal(PHASE14_CONTRACT.architecture, 'DIGITAL_BUILD_SHARED_CAPABILITY_NOT_ONE_ENGINE_PER_TOOL');
  assert.equal(PHASE14_CONTRACT.additional_cost_target_eur, 0);
});

test('catalog preserves canonical decision for every 162-175 adapter', () => {
  const catalog = getMultimediaAdapterCatalog({ context });
  assert.equal(catalog.allowed, true);
  assert.equal(Object.keys(catalog.adapters).length, 14);
  assert.equal(catalog.adapters.COMFYUI.decision, 'P1');
  assert.equal(catalog.adapters.Z_IMAGE_TURBO.decision, 'LAB');
  assert.equal(catalog.adapters.QWEN3_TTS.decision, 'P1');
  assert.equal(catalog.adapters.HYPERFRAMES.decision, 'P1');
  assert.equal(catalog.adapters.PROCEDURAL_FILM.decision, 'P1');
  assert.equal(catalog.adapters.OPENMONTAGE.decision, 'LAB');
  assert.equal(catalog.adapters.LTX_VIDEO.decision, 'LAB');
  assert.equal(catalog.adapters.WATCH.decision, 'P1');
  assert.equal(catalog.adapters.FFMPEG.decision, 'REUSE');
  assert.equal(catalog.adapters.OPEN_SORA.decision, 'HOLD_HARDWARE');
  assert.equal(catalog.adapters.REMOTION.decision, 'HOLD_LICENSE');
  assert.equal(catalog.adapters.FISH_AUDIO.decision, 'HOLD_COMMERCIAL');
  assert.equal(catalog.adapters.ELEVENLABS.decision, 'HOLD_COMMERCIAL');
  assert.equal(catalog.adapters.OPEN_GENERATIVE_AI.decision, 'CATALOG_ONLY');
  assert.equal(catalog.physical_installation_verified, false);
  assert.equal(catalog.repository_binding_verified, false);
});

test('P1/LAB/reuse adapters generate plan-only routes through existing engines', () => {
  const cases = [
    ['COMFYUI','VISUAL_WORKFLOW',162],
    ['Z-IMAGE-TURBO','IMAGE_GENERATION',163],
    ['QWEN3-TTS','VOICE_SYNTHESIS',164],
    ['HYPERFRAMES','VIDEO_GENERATION',165],
    ['PROCEDURAL-FILM','EXPLAINER_VIDEO',166],
    ['OPENMONTAGE','VIDEO_EDITING',167],
    ['LTX-VIDEO/LTX-2','VIDEO_GENERATION',168],
    ['WATCH','VIDEO_UNDERSTANDING',169],
    ['FFMPEG','MEDIA_COMPOSITION',170]
  ];
  for (const [adapter, task_type, block] of cases) {
    const result = planMultimediaTask({ ...base, request_id: `media:${block}`, adapter, task_type });
    assert.equal(result.allowed, true, adapter);
    assert.equal(result.block, block, adapter);
    assert.equal(result.route_engine, 'ROUTE-001', adapter);
    assert.equal(result.zero_cost_engine, 'FREE-001', adapter);
    assert.equal(result.evaluation_engine, 'EVA-001', adapter);
    assert.equal(result.observability_engine, 'OBSERV-001', adapter);
    assert.equal(result.external_process_authorized, false, adapter);
    assert.equal(result.network_call_authorized, false, adapter);
    assert.equal(result.provider_call_authorized, false, adapter);
    assert.equal(result.additional_cost_eur, 0, adapter);
  }
});

test('171 Open-Sora remains HOLD hardware', () => {
  const result = planMultimediaTask({ ...base, adapter: 'OPEN-SORA', task_type: 'VIDEO_GENERATION' });
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'ADAPTER_HOLD_HARDWARE');
  assert.equal(result.adapter_status, 'HOLD_HARDWARE');
  assert.equal(result.human_required_reason, 'POLICY_CONFLICT');
});

test('172 Remotion remains HOLD pending license review', () => {
  const result = planMultimediaTask({ ...base, adapter: 'REMOTION', task_type: 'VIDEO_GENERATION' });
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'ADAPTER_HOLD_LICENSE');
  assert.equal(result.human_required_reason, 'LEGAL_REQUIRED');
});

test('173-174 commercial voice benchmarks remain HOLD and do not incur spend', () => {
  for (const adapter of ['FISH-AUDIO','ELEVENLABS']) {
    const result = planMultimediaTask({ ...base, adapter, task_type: 'VOICE_SYNTHESIS' });
    assert.equal(result.allowed, false, adapter);
    assert.equal(result.code, 'ADAPTER_HOLD_COMMERCIAL', adapter);
    assert.equal(result.human_required_reason, 'MONEY_LIMIT', adapter);
    assert.equal(result.external_side_effect_executed, false, adapter);
  }
});

test('175 Open Generative AI is catalog-only, never executable', () => {
  const result = planMultimediaTask({ ...base, adapter: 'OPEN-GENERATIVE-AI', task_type: 'VISUAL_WORKFLOW' });
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'ADAPTER_CATALOG_ONLY');
  assert.equal(result.human_required_reason, 'POLICY_CONFLICT');
});

test('FFmpeg is reuse-if-present and absence never triggers silent installation', () => {
  const missing = buildFfmpegReusePlan({ ...base, binary_presence_verified: false });
  assert.equal(missing.allowed, true);
  assert.equal(missing.block, PHASE14_BLOCKS.FFMPEG);
  assert.equal(missing.reuse_existing_required, true);
  assert.equal(missing.binary_presence_verified, false);
  assert.equal(missing.install_if_missing_authorized, false);
  assert.equal(missing.command_execution_authorized, false);

  const present = buildFfmpegReusePlan({ ...base, request_id: 'media:ffmpeg:present', binary_presence_verified: true, binary_version_ref: 'ffmpeg:version:verified' });
  assert.equal(present.binary_presence_verified, true);
  assert.equal(present.binary_version_ref, 'ffmpeg:version:verified');
});

test('physical install/download/process/network attempts are fail-closed', () => {
  for (const flag of ['install_requested','download_model_requested','external_process_requested','network_call_requested']) {
    const result = planMultimediaTask({ ...base, [flag]: true });
    assert.equal(result.allowed, false, flag);
    assert.equal(result.code, 'PHYSICAL_EXECUTION_DISABLED', flag);
    assert.equal(result.human_required_reason, 'POLICY_CONFLICT', flag);
  }
});

test('paid API, purchase and subscription attempts are MONEY_LIMIT', () => {
  for (const flag of ['purchase_requested','subscription_requested','paid_api_requested']) {
    const result = planMultimediaTask({ ...base, [flag]: true });
    assert.equal(result.allowed, false, flag);
    assert.equal(result.code, 'PAID_EXECUTION_DISABLED', flag);
    assert.equal(result.human_required_reason, 'MONEY_LIMIT', flag);
  }
});

test('Qwen/Fish/ElevenLabs benchmark records score without provider calls or promotion', () => {
  for (const adapter of ['QWEN3-TTS','FISH-AUDIO','ELEVENLABS']) {
    const result = buildVoiceProviderBenchmark({
      context, adapter, quality_score: 90, latency_score: 80, privacy_score: 85, cost_score: 95
    });
    assert.equal(result.allowed, true, adapter);
    assert.equal(result.benchmark_score, 88.25, adapter);
    assert.equal(result.physical_call_executed, false, adapter);
    assert.equal(result.paid_execution_authorized, false, adapter);
    assert.equal(result.promotion_authorized, false, adapter);
  }
});

test('video pipeline accepts only eligible stages and remains non-executable', () => {
  const result = buildVideoPipelinePlan({
    context, pipeline_ref: 'pipeline:video:001', asset_ref: 'asset:001',
    stage_adapters: ['WATCH','HYPERFRAMES','FFMPEG']
  });
  assert.equal(result.allowed, true);
  assert.equal(result.stages.length, 3);
  assert.equal(result.final_composition_preference, 'FFMPEG_REUSE');
  assert.equal(result.executable, false);
  assert.equal(result.artifact_publish_authorized, false);

  assert.throws(() => buildVideoPipelinePlan({ context, pipeline_ref: 'p:2', asset_ref: 'a:2', stage_adapters: ['OPEN-SORA'] }), /not eligible/);
});

test('license/cost/hardware gate never authorizes install or purchase', () => {
  const eligible = buildLicenseAndCostGate({ context, adapter: 'COMFYUI', license_verified: true, zero_cost_verified: true, hardware_fit_verified: true });
  assert.equal(eligible.allowed, true);
  assert.equal(eligible.eligible_for_lab, true);
  assert.equal(eligible.install_authorized, false);
  assert.equal(eligible.purchase_authorized, false);
  assert.equal(eligible.promotion_authorized, false);

  const held = buildLicenseAndCostGate({ context, adapter: 'REMOTION', license_verified: false, zero_cost_verified: true, hardware_fit_verified: true });
  assert.equal(held.eligible_for_lab, false);
});

test('tenant isolation, exact PREPROD and raw media/secrets are fail-closed', () => {
  const cross = planMultimediaTask({ ...base, target_company_id: 'other-company' });
  assert.equal(cross.allowed, false);
  assert.equal(cross.human_required_reason, 'SECURITY_INCIDENT');
  assert.throws(() => planMultimediaTask({ ...base, context: { ...context, environment: 'PROD' } }), /exact PREPROD only/);
  assert.throws(() => planMultimediaTask({ ...base, access_token: 'secret' }), /raw PII\/secret\/media field forbidden/);
  assert.throws(() => planMultimediaTask({ ...base, raw_video: 'bytes' }), /raw PII\/secret\/media field forbidden/);
});

test('multimedia telemetry targets observability/FinOps and stores no raw media', () => {
  const result = buildMultimediaTelemetry({ context, event_ref: 'event:media:001', event_type: 'adapter_plan' });
  assert.equal(result.observability_target, 'OBSERV-001');
  assert.equal(result.finops_target, 'FINOPS-001');
  assert.match(result.event_ref_hash, /^[a-f0-9]{32}$/);
  assert.equal(result.raw_media_persisted, false);
  assert.equal(result.raw_pii_persisted, false);
});

test('multimedia ledger is idempotent and conflicts fail closed', () => {
  const ledger = createMultimediaLedger();
  const first = ledger.execute(base);
  const duplicate = ledger.execute(base);
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(ledger.size(), 1);
  const conflict = ledger.execute({ ...base, asset_ref: 'asset:002' });
  assert.equal(conflict.allowed, false);
  assert.equal(conflict.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(conflict.human_required_reason, 'POLICY_CONFLICT');
  assert.equal(ledger.size(), 1);
});

test('only canonical HUMAN_REQUIRED reasons are configured', () => {
  assert.deepEqual(HUMAN_REQUIRED_REASONS, [
    'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
    'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
  ]);
  const low = planMultimediaTask({ ...base, confidence: 0.5 });
  assert.equal(low.allowed, false);
  assert.equal(low.human_required_reason, 'LOW_CONFIDENCE');
});
