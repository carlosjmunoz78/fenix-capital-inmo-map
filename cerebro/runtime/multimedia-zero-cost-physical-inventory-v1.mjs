import crypto from 'node:crypto';

export const INVENTORY_SCOPE = 'GITHUB_HOSTED_UBUNTU_CI_PREPROD';
export const INVENTORY_VERSION = '1.0.0';
export const CAPABILITY_ID = 'DIGITAL-BUILD-MULTIMEDIA';
export const OWNER_ENGINE_ID = 'FACT-001';

const TOOL_IDS = Object.freeze(['ffmpeg','ffprobe','imagemagick','sox','espeak_ng']);
const SAFE_VERSION = /^[\x20-\x7E]{1,240}$/;

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function requireBool(value, label) {
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean`);
  return value;
}

function normalizeTool(raw, expectedId) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError(`tool ${expectedId} must be object`);
  if (raw.id !== expectedId) throw new Error(`tool id mismatch for ${expectedId}`);
  const present = requireBool(raw.present, `${expectedId}.present`);
  const version = raw.version == null ? null : String(raw.version).trim();
  if (version !== null && !SAFE_VERSION.test(version)) throw new Error(`${expectedId}.version unsafe`);
  if (!present && version !== null) throw new Error(`${expectedId}.version requires present=true`);
  return Object.freeze({ id: expectedId, present, version });
}

export function assessMultimediaZeroCostProbe(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('probe object required');
  if (raw.scope !== INVENTORY_SCOPE) throw new Error(`scope must be ${INVENTORY_SCOPE}`);
  if (String(raw.environment || '').toUpperCase() !== 'PREPROD') throw new Error('exact PREPROD required');
  if (raw.company_id !== 'GLOBAL') throw new Error('physical inventory is GLOBAL scope only');
  if (raw.engine_id !== OWNER_ENGINE_ID) throw new Error(`engine_id must be ${OWNER_ENGINE_ID}`);
  if (raw.capability_id !== CAPABILITY_ID) throw new Error(`capability_id must be ${CAPABILITY_ID}`);
  if (raw.install_performed !== false) throw new Error('install_performed must be false');
  if (raw.model_download_performed !== false) throw new Error('model_download_performed must be false');
  if (raw.provider_call_performed !== false) throw new Error('provider_call_performed must be false');
  if (raw.customer_data_used !== false) throw new Error('customer_data_used must be false');
  if (raw.prod_write_performed !== false) throw new Error('prod_write_performed must be false');
  if (raw.spend_eur !== 0) throw new Error('spend_eur must be 0');

  const inputTools = raw.tools;
  if (!inputTools || typeof inputTools !== 'object' || Array.isArray(inputTools)) throw new TypeError('tools object required');
  const tools = Object.fromEntries(TOOL_IDS.map((id) => [id, normalizeTool(inputTools[id], id)]));
  const ffmpegCore = tools.ffmpeg.present && tools.ffprobe.present;
  const imageLocal = tools.imagemagick.present;
  const audioLocal = tools.sox.present;
  const ttsLocalCli = tools.espeak_ng.present;

  const status = ffmpegCore ? 'VERIFIED_ZERO_COST_MEDIA_CORE_PREPROD' : 'PARTIAL_ZERO_COST_MEDIA_CORE_PREPROD';
  const adapters = Object.freeze({
    FFMPEG: ffmpegCore ? 'PHYSICALLY_PRESENT_REUSE_CANDIDATE' : 'NOT_PRESENT_IN_THIS_RUNTIME',
    IMAGE_LOCAL_PRIMITIVE: imageLocal ? 'PHYSICALLY_PRESENT_OPTIONAL_CANDIDATE' : 'NOT_PRESENT_IN_THIS_RUNTIME',
    AUDIO_LOCAL_PRIMITIVE: audioLocal ? 'PHYSICALLY_PRESENT_OPTIONAL_CANDIDATE' : 'NOT_PRESENT_IN_THIS_RUNTIME',
    TTS_LOCAL_PRIMITIVE: ttsLocalCli ? 'PHYSICALLY_PRESENT_OPTIONAL_CANDIDATE' : 'NOT_PRESENT_IN_THIS_RUNTIME',
    COMFYUI: 'NOT_VERIFIED_NO_INSTALL_NO_DOWNLOAD',
    Z_IMAGE_TURBO: 'NOT_VERIFIED_NO_MODEL_DOWNLOAD',
    QWEN3_TTS: 'NOT_VERIFIED_NO_MODEL_DOWNLOAD',
    LTX_VIDEO: 'NOT_VERIFIED_NO_MODEL_DOWNLOAD',
    OPEN_SORA: 'HOLD_HARDWARE',
    REMOTION: 'HOLD_LICENSE',
    FISH_AUDIO: 'HOLD_COMMERCIAL',
    ELEVENLABS: 'HOLD_COMMERCIAL'
  });

  const decision = Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_MULTIMEDIA_ZERO_COST_PHYSICAL_INVENTORY_ASSESSMENT',
    company_id: 'GLOBAL',
    engine_id: OWNER_ENGINE_ID,
    capability_id: CAPABILITY_ID,
    environment: 'PREPROD',
    version: INVENTORY_VERSION,
    scope: INVENTORY_SCOPE,
    status,
    tools,
    adapters,
    verified_capabilities: Object.freeze({
      deterministic_media_core: ffmpegCore,
      local_image_cli: imageLocal,
      local_audio_cli: audioLocal,
      local_tts_cli: ttsLocalCli
    }),
    boundaries: Object.freeze({
      proves_ci_runner_presence_only: true,
      proves_user_pc_presence: false,
      proves_server_runtime_presence: false,
      proves_gpu_or_model_availability: false,
      proves_media_generation_quality: false,
      grants_external_process_execution_authority: false,
      grants_prod_authority: false,
      install_authorized: false,
      model_download_authorized: false,
      provider_call_authorized: false,
      artifact_publish_authorized: false,
      trading_access: false
    }),
    safety: Object.freeze({
      install_performed: false,
      model_download_performed: false,
      provider_call_performed: false,
      customer_data_used: false,
      prod_write_performed: false,
      spend_eur: 0,
      additional_cost_eur: 0
    }),
    next_gate: ffmpegCore
      ? 'EVALUATE_FFMPEG_READ_ONLY_SMOKE_AND_LICENSE_METADATA_BEFORE_ANY_REAL_MEDIA_EXECUTION'
      : 'KEEP_FFMPEG_REUSE_OPTIONAL_AND_AUDIT_AN_AUTHORIZED_RUNTIME_LATER',
  });

  return Object.freeze({ ...decision, evidence_fingerprint: stableHash(decision) });
}

export function mutationChangesOutcome(probe) {
  const baseline = assessMultimediaZeroCostProbe(probe);
  const mutated = assessMultimediaZeroCostProbe({
    ...probe,
    tools: {
      ...probe.tools,
      ffmpeg: { id: 'ffmpeg', present: false, version: null }
    }
  });
  return Object.freeze({
    baseline_status: baseline.status,
    mutated_status: mutated.status,
    changed: baseline.status !== mutated.status || baseline.adapters.FFMPEG !== mutated.adapters.FFMPEG
  });
}
