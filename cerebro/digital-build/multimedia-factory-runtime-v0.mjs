import crypto from 'node:crypto';

const ENVIRONMENT = 'PREPROD';
const VERSION = 'multimedia-factory-v0';
const OWNER_ENGINE = 'FACT-001';
const CAPABILITY_ID = 'DIGITAL-BUILD-MULTIMEDIA';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;

export const HUMAN_REQUIRED_REASONS = Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);
const HUMAN_REASON_SET = new Set(HUMAN_REQUIRED_REASONS);

export const PHASE14_BLOCKS = Object.freeze({
  COMFYUI: 162,
  Z_IMAGE_TURBO: 163,
  QWEN3_TTS: 164,
  HYPERFRAMES: 165,
  PROCEDURAL_FILM: 166,
  OPENMONTAGE: 167,
  LTX_VIDEO: 168,
  WATCH: 169,
  FFMPEG: 170,
  OPEN_SORA: 171,
  REMOTION: 172,
  FISH_AUDIO: 173,
  ELEVENLABS: 174,
  OPEN_GENERATIVE_AI: 175
});

export const ADAPTER_CATALOG = Object.freeze({
  COMFYUI: Object.freeze({ block: 162, modality: 'WORKFLOW_VISUAL_AI', decision: 'P1', cost_class: 'LOCAL_OR_SELF_HOSTED', execution: 'ADAPTER_SEAM_ONLY' }),
  Z_IMAGE_TURBO: Object.freeze({ block: 163, modality: 'IMAGE', decision: 'LAB', cost_class: 'LOCAL_MODEL_CANDIDATE', execution: 'LAB_SEAM_ONLY' }),
  QWEN3_TTS: Object.freeze({ block: 164, modality: 'VOICE', decision: 'P1', cost_class: 'LOCAL_MODEL_CANDIDATE', execution: 'ADAPTER_SEAM_ONLY' }),
  HYPERFRAMES: Object.freeze({ block: 165, modality: 'PROGRAMMATIC_VIDEO', decision: 'P1', cost_class: 'AVAILABLE_CAPABILITY_REFERENCE', execution: 'ADAPTER_SEAM_ONLY' }),
  PROCEDURAL_FILM: Object.freeze({ block: 166, modality: 'EXPLAINER_DOODLE_VIDEO', decision: 'P1', cost_class: 'OPEN_SOURCE_CANDIDATE', execution: 'ADAPTER_SEAM_ONLY' }),
  OPENMONTAGE: Object.freeze({ block: 167, modality: 'VIDEO_EDITING', decision: 'LAB', cost_class: 'OPEN_SOURCE_CANDIDATE', execution: 'LAB_SEAM_ONLY' }),
  LTX_VIDEO: Object.freeze({ block: 168, modality: 'LOCAL_GENERATIVE_VIDEO', decision: 'LAB', cost_class: 'LOCAL_MODEL_CANDIDATE', execution: 'LAB_SEAM_ONLY' }),
  WATCH: Object.freeze({ block: 169, modality: 'VIDEO_UNDERSTANDING', decision: 'P1', cost_class: 'CAPABILITY_REFERENCE', execution: 'ADAPTER_SEAM_ONLY' }),
  FFMPEG: Object.freeze({ block: 170, modality: 'MEDIA_COMPOSITION', decision: 'REUSE', cost_class: 'OPEN_SOURCE', execution: 'REUSE_IF_PRESENT' }),
  OPEN_SORA: Object.freeze({ block: 171, modality: 'HEAVY_GENERATIVE_VIDEO', decision: 'HOLD_HARDWARE', cost_class: 'HEAVY_LOCAL_COMPUTE', execution: 'DISABLED' }),
  REMOTION: Object.freeze({ block: 172, modality: 'PROGRAMMATIC_VIDEO_REFERENCE', decision: 'HOLD_LICENSE', cost_class: 'LICENSE_REVIEW_REQUIRED', execution: 'DISABLED' }),
  FISH_AUDIO: Object.freeze({ block: 173, modality: 'VOICE_BENCHMARK', decision: 'HOLD_COMMERCIAL', cost_class: 'COMMERCIAL', execution: 'DISABLED' }),
  ELEVENLABS: Object.freeze({ block: 174, modality: 'VOICE_BENCHMARK', decision: 'HOLD_COMMERCIAL', cost_class: 'COMMERCIAL', execution: 'DISABLED' }),
  OPEN_GENERATIVE_AI: Object.freeze({ block: 175, modality: 'WORKFLOW_REFERENCE', decision: 'CATALOG_ONLY', cost_class: 'REFERENCE', execution: 'DISABLED' })
});

const FORBIDDEN_KEYS = new Set([
  'email','phone','name','full_name','address','dni','nif','nie','iban','bank_account',
  'password','secret','token','jwt','api_key','apikey','access_token','refresh_token','private_key',
  'raw_media','raw_audio','raw_video','raw_image','voice_sample','face_embedding','biometric_template'
]);

function text(value, label, max = 240) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}
function safeRef(value, label) {
  const out = text(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label} must be an opaque safe reference`);
  return out;
}
function bool(value, label) {
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean`);
  return value;
}
function finite(value, label, { min = -Infinity, max = Infinity } = {}) {
  const out = Number(value);
  if (!Number.isFinite(out) || out < min || out > max) throw new TypeError(`${label} invalid`);
  return out;
}
function stableHash(value, size = 32) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, size);
}
function assertPlainData(value, label = 'input', seen = new WeakSet()) {
  if (value === null || ['string','boolean','undefined'].includes(typeof value)) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${label} contains non-finite number`);
    return;
  }
  if (typeof value !== 'object') throw new TypeError(`${label} contains unsupported value`);
  if (seen.has(value)) throw new TypeError(`${label} contains circular data`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((item, index) => assertPlainData(item, `${label}[${index}]`, seen));
      return;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError(`${label} must contain plain data`);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (descriptor.get || descriptor.set) throw new TypeError(`${label}.${key} accessor forbidden`);
      if (!descriptor.enumerable) continue;
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new Error(`raw PII/secret/media field forbidden: ${label}.${key}`);
      assertPlainData(descriptor.value, `${label}.${key}`, seen);
    }
  } finally { seen.delete(value); }
}
function normalizeContext(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('context object required');
  assertPlainData(raw, 'context');
  const out = Object.freeze({
    company_id: text(raw.company_id, 'context.company_id', 120),
    engine_id: text(raw.engine_id, 'context.engine_id', 80),
    capability_id: text(raw.capability_id, 'context.capability_id', 120),
    environment: text(raw.environment, 'context.environment', 40).toUpperCase(),
    version: text(raw.version, 'context.version', 80)
  });
  if (out.engine_id !== OWNER_ENGINE) throw new Error(`context.engine_id must be ${OWNER_ENGINE}`);
  if (out.capability_id !== CAPABILITY_ID) throw new Error(`context.capability_id must be ${CAPABILITY_ID}`);
  if (out.environment !== ENVIRONMENT) throw new Error('multimedia factory V0 accepts exact PREPROD only');
  return out;
}
function humanReason(value) {
  const out = text(value, 'human_required_reason', 80).toUpperCase();
  if (!HUMAN_REASON_SET.has(out)) throw new Error('noncanonical HUMAN_REQUIRED reason');
  return out;
}
function blocked(code, reason, detail, extra = {}) {
  return Object.freeze({ allowed: false, status: 'BLOCKED', code, blocker: 'HUMAN_REQUIRED', human_required_reason: humanReason(reason), detail, external_side_effect_executed: false, prod_authorized: false, ...extra });
}
function commonGate(raw) {
  assertPlainData(raw, 'request');
  const context = normalizeContext(raw.context);
  const targetCompany = raw.target_company_id == null ? context.company_id : text(raw.target_company_id, 'target_company_id', 120);
  if (targetCompany !== context.company_id) return blocked('COMPANY_SCOPE_MISMATCH', 'SECURITY_INCIDENT', 'Cross-company multimedia execution denied.');
  const confidence = finite(raw.confidence ?? 1, 'confidence', { min: 0, max: 1 });
  if (confidence < 0.75) return blocked('LOW_CONFIDENCE', 'LOW_CONFIDENCE', 'Confidence below PREPROD threshold.');
  if (raw.high_risk === true) return blocked('HIGH_RISK_CASE', 'HIGH_RISK', 'High-risk media case requires human handling.');
  if (raw.customer_human_request === true) return blocked('CUSTOMER_HUMAN_REQUEST', 'CUSTOMER_HUMAN_REQUEST', 'Customer explicitly requested a human.');
  if (raw.prod_write_requested === true) return blocked('PROD_WRITE_DISABLED', 'POLICY_CONFLICT', 'Multimedia V0 cannot write PROD.');
  return Object.freeze({ allowed: true, context, confidence });
}
function adapterName(value) {
  const key = text(value, 'adapter', 80).toUpperCase().replaceAll('-', '_').replaceAll(' ', '_').replaceAll('/', '_');
  const aliases = { LTX_VIDEO_LTX_2: 'LTX_VIDEO', OPEN_SORA: 'OPEN_SORA', OPEN_GENERATIVE_AI: 'OPEN_GENERATIVE_AI', Z_IMAGE_TURBO: 'Z_IMAGE_TURBO', QWEN3_TTS: 'QWEN3_TTS' };
  const normalized = aliases[key] ?? key;
  if (!ADAPTER_CATALOG[normalized]) throw new Error(`unknown multimedia adapter: ${value}`);
  return normalized;
}
function executionGate(raw, adapter) {
  if (raw.install_requested === true || raw.download_model_requested === true || raw.external_process_requested === true || raw.network_call_requested === true) {
    return blocked('PHYSICAL_EXECUTION_DISABLED', 'POLICY_CONFLICT', 'V0 catalogs and plans adapters; it does not install, download models, spawn tools or call providers.');
  }
  if (raw.purchase_requested === true || raw.subscription_requested === true || raw.paid_api_requested === true) {
    return blocked('PAID_EXECUTION_DISABLED', 'MONEY_LIMIT', 'No paid multimedia purchase/subscription/API is authorized in V0.');
  }
  const meta = ADAPTER_CATALOG[adapter];
  if (meta.decision === 'HOLD_HARDWARE') return blocked('ADAPTER_HOLD_HARDWARE', 'POLICY_CONFLICT', `${adapter} remains HOLD pending hardware evidence.`, { adapter_status: meta.decision });
  if (meta.decision === 'HOLD_LICENSE') return blocked('ADAPTER_HOLD_LICENSE', 'LEGAL_REQUIRED', `${adapter} remains HOLD pending license review.`, { adapter_status: meta.decision });
  if (meta.decision === 'HOLD_COMMERCIAL') return blocked('ADAPTER_HOLD_COMMERCIAL', 'MONEY_LIMIT', `${adapter} remains HOLD commercial.`, { adapter_status: meta.decision });
  if (meta.decision === 'CATALOG_ONLY') return blocked('ADAPTER_CATALOG_ONLY', 'POLICY_CONFLICT', `${adapter} is reference/catalog only.`, { adapter_status: meta.decision });
  return Object.freeze({ allowed: true });
}

export function getMultimediaAdapterCatalog(raw = {}) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  return Object.freeze({
    allowed: true,
    status: 'MULTIMEDIA_ADAPTER_CATALOG_READY',
    company_id: gate.context.company_id,
    engine_id: OWNER_ENGINE,
    capability_id: CAPABILITY_ID,
    environment: ENVIRONMENT,
    version: VERSION,
    adapters: ADAPTER_CATALOG,
    new_engine_created: false,
    physical_installation_verified: false,
    repository_binding_verified: false,
    additional_cost_eur: 0,
    external_side_effect_executed: false
  });
}

export function planMultimediaTask(raw = {}) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  const adapter = adapterName(raw.adapter);
  const execution = executionGate(raw, adapter);
  if (!execution.allowed) return execution;
  const meta = ADAPTER_CATALOG[adapter];
  const taskType = text(raw.task_type, 'task_type', 80).toUpperCase();
  const allowedTaskTypes = new Set(['IMAGE_GENERATION','VOICE_SYNTHESIS','VIDEO_GENERATION','VIDEO_EDITING','VIDEO_UNDERSTANDING','MEDIA_COMPOSITION','EXPLAINER_VIDEO','VISUAL_WORKFLOW']);
  if (!allowedTaskTypes.has(taskType)) throw new Error(`unsupported task_type: ${taskType}`);
  return Object.freeze({
    allowed: true,
    status: 'MULTIMEDIA_TASK_PLAN_READY',
    block: meta.block,
    company_id: gate.context.company_id,
    engine_id: OWNER_ENGINE,
    capability_id: CAPABILITY_ID,
    environment: ENVIRONMENT,
    version: VERSION,
    request_id: safeRef(raw.request_id, 'request_id'),
    asset_ref: safeRef(raw.asset_ref, 'asset_ref'),
    adapter,
    adapter_decision: meta.decision,
    modality: meta.modality,
    task_type: taskType,
    route_engine: 'ROUTE-001',
    zero_cost_engine: 'FREE-001',
    evaluation_engine: 'EVA-001',
    observability_engine: 'OBSERV-001',
    selected_runtime_state: 'PLAN_ONLY_NOT_PHYSICALLY_BOUND',
    install_authorized: false,
    model_download_authorized: false,
    network_call_authorized: false,
    external_process_authorized: false,
    provider_call_authorized: false,
    artifact_publish_authorized: false,
    prod_authorized: false,
    trading_access: false,
    additional_cost_eur: 0,
    external_side_effect_executed: false
  });
}

export function buildFfmpegReusePlan(raw = {}) {
  const result = planMultimediaTask({ ...raw, adapter: 'FFMPEG', task_type: 'MEDIA_COMPOSITION' });
  if (!result.allowed) return result;
  return Object.freeze({
    ...result,
    status: 'FFMPEG_REUSE_PLAN_READY',
    reuse_existing_required: true,
    binary_presence_verified: bool(raw.binary_presence_verified ?? false, 'binary_presence_verified'),
    binary_version_ref: raw.binary_version_ref == null ? null : safeRef(raw.binary_version_ref, 'binary_version_ref'),
    install_if_missing_authorized: false,
    command_execution_authorized: false
  });
}

export function buildVoiceProviderBenchmark(raw = {}) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  const provider = adapterName(raw.adapter);
  if (!['QWEN3_TTS','FISH_AUDIO','ELEVENLABS'].includes(provider)) throw new Error('voice benchmark adapter must be QWEN3_TTS, FISH_AUDIO or ELEVENLABS');
  const meta = ADAPTER_CATALOG[provider];
  const quality = finite(raw.quality_score, 'quality_score', { min: 0, max: 100 });
  const latency = finite(raw.latency_score, 'latency_score', { min: 0, max: 100 });
  const privacy = finite(raw.privacy_score, 'privacy_score', { min: 0, max: 100 });
  const cost = finite(raw.cost_score, 'cost_score', { min: 0, max: 100 });
  const aggregate = Number(((quality * 0.4) + (latency * 0.15) + (privacy * 0.25) + (cost * 0.2)).toFixed(2));
  return Object.freeze({
    allowed: true,
    status: 'VOICE_PROVIDER_BENCHMARK_RECORDED',
    block: meta.block,
    company_id: gate.context.company_id,
    engine_id: OWNER_ENGINE,
    capability_id: CAPABILITY_ID,
    provider,
    canonical_decision: meta.decision,
    benchmark_score: aggregate,
    quality_score: quality,
    latency_score: latency,
    privacy_score: privacy,
    cost_score: cost,
    physical_call_executed: false,
    paid_execution_authorized: false,
    promotion_authorized: false,
    additional_cost_eur: 0,
    external_side_effect_executed: false
  });
}

export function buildVideoPipelinePlan(raw = {}) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  if (!Array.isArray(raw.stage_adapters) || raw.stage_adapters.length < 1 || raw.stage_adapters.length > 8) throw new TypeError('stage_adapters must contain 1-8 adapters');
  const stages = raw.stage_adapters.map((value, index) => {
    const adapter = adapterName(value);
    const meta = ADAPTER_CATALOG[adapter];
    if (['HOLD_HARDWARE','HOLD_LICENSE','HOLD_COMMERCIAL','CATALOG_ONLY'].includes(meta.decision)) throw new Error(`stage_adapters[${index}] is not eligible for active PREPROD plan: ${adapter}`);
    return Object.freeze({ order: index + 1, adapter, modality: meta.modality, decision: meta.decision });
  });
  return Object.freeze({
    allowed: true,
    status: 'VIDEO_PIPELINE_PLAN_READY',
    company_id: gate.context.company_id,
    engine_id: OWNER_ENGINE,
    capability_id: CAPABILITY_ID,
    pipeline_ref: safeRef(raw.pipeline_ref, 'pipeline_ref'),
    asset_ref: safeRef(raw.asset_ref, 'asset_ref'),
    stages: Object.freeze(stages),
    execution_router: 'ROUTE-001',
    evaluation_engine: 'EVA-001',
    final_composition_preference: stages.some(stage => stage.adapter === 'FFMPEG') ? 'FFMPEG_REUSE' : 'FFMPEG_REUSE_TO_BE_AUDITED',
    executable: false,
    artifact_publish_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function buildLicenseAndCostGate(raw = {}) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  const adapter = adapterName(raw.adapter);
  const meta = ADAPTER_CATALOG[adapter];
  const licenseVerified = bool(raw.license_verified ?? false, 'license_verified');
  const zeroCostVerified = bool(raw.zero_cost_verified ?? false, 'zero_cost_verified');
  const hardwareFitVerified = bool(raw.hardware_fit_verified ?? false, 'hardware_fit_verified');
  const eligible = licenseVerified && zeroCostVerified && hardwareFitVerified && !['HOLD_HARDWARE','HOLD_LICENSE','HOLD_COMMERCIAL','CATALOG_ONLY'].includes(meta.decision);
  return Object.freeze({
    allowed: true,
    status: eligible ? 'MULTIMEDIA_GATE_ELIGIBLE_FOR_LAB' : 'MULTIMEDIA_GATE_HOLD',
    company_id: gate.context.company_id,
    engine_id: OWNER_ENGINE,
    capability_id: CAPABILITY_ID,
    adapter,
    canonical_decision: meta.decision,
    license_verified: licenseVerified,
    zero_cost_verified: zeroCostVerified,
    hardware_fit_verified: hardwareFitVerified,
    eligible_for_lab: eligible,
    install_authorized: false,
    purchase_authorized: false,
    promotion_authorized: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function buildMultimediaTelemetry(raw = {}) {
  assertPlainData(raw, 'telemetry_request');
  const context = normalizeContext(raw.context);
  return Object.freeze({
    company_id: context.company_id,
    engine_id: OWNER_ENGINE,
    capability_id: CAPABILITY_ID,
    environment: ENVIRONMENT,
    version: VERSION,
    event_ref_hash: stableHash(safeRef(raw.event_ref, 'event_ref')),
    event_type: text(raw.event_type, 'event_type', 80).toUpperCase(),
    observability_target: 'OBSERV-001',
    finops_target: 'FINOPS-001',
    raw_media_persisted: false,
    raw_pii_persisted: false,
    external_side_effect_executed: false,
    additional_cost_eur: 0
  });
}

export function createMultimediaLedger() {
  const entries = new Map();
  return Object.freeze({
    execute(raw) {
      const result = planMultimediaTask(raw);
      if (!result.allowed) return result;
      const key = `${result.company_id}|${CAPABILITY_ID}|${result.request_id}|${result.adapter}|${result.task_type}`;
      const fingerprint = stableHash(result);
      if (entries.has(key)) {
        const previous = entries.get(key);
        if (previous.fingerprint !== fingerprint) return blocked('IDEMPOTENCY_CONFLICT', 'POLICY_CONFLICT', 'Multimedia idempotency key reused with a different fingerprint.');
        return Object.freeze({ ...previous.result, duplicate: true, idempotency_key: key });
      }
      const stored = Object.freeze({ ...result, duplicate: false, idempotency_key: key, request_fingerprint: fingerprint });
      entries.set(key, Object.freeze({ fingerprint, result: stored }));
      return stored;
    },
    size() { return entries.size; }
  });
}

export const PHASE14_CONTRACT = Object.freeze({
  environment: ENVIRONMENT,
  version: VERSION,
  owner_engine: OWNER_ENGINE,
  capability_id: CAPABILITY_ID,
  blocks: Object.freeze([162,163,164,165,166,167,168,169,170,171,172,173,174,175]),
  new_engine_created: false,
  architecture: 'DIGITAL_BUILD_SHARED_CAPABILITY_NOT_ONE_ENGINE_PER_TOOL',
  dependencies: Object.freeze(['FACT-001','ROUTE-001','FREE-001','EVA-001','OBSERV-001','FINOPS-001']),
  additional_cost_target_eur: 0,
  installs_authorized: false,
  model_downloads_authorized: false,
  paid_provider_calls_authorized: false,
  artifact_publish_authorized: false,
  prod_authorized: false,
  trading_access: false,
  supabase_required_for_v0_runtime: false
});
