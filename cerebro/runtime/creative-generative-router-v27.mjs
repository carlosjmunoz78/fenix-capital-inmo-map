import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const GENERATIVE_ROUTER_VERSION = '2.7.0';

export const ENGINE_CATALOG = Object.freeze({
  WAN_ANIMATE_2: {
    kind: 'VIDEO_CHARACTER_ANIMATION',
    upstream: 'Wan-Video/Wan-Animate-2',
    license: 'Apache-2.0',
    commercial_policy: 'ALLOWED_BY_UPSTREAM_LICENSE',
    preferred: true,
    requires: ['CUDA_GPU', 'LOCAL_MODEL_RUNTIME', 'DRIVING_VIDEO_OR_MOTION_REFERENCE'],
  },
  LTX_2_X: {
    kind: 'GENERATIVE_AUDIO_VIDEO',
    upstream: 'Lightricks/LTX-2',
    license: 'LTX-2.x Community License',
    commercial_policy: 'PROD_BLOCKED_UNLESS_LICENSE_ELIGIBILITY_EXPLICITLY_CONFIRMED',
    preferred: false,
    requires: ['CUDA_GPU', 'LOCAL_MODEL_RUNTIME', 'LICENSE_GATE'],
  },
  CHATTERBOX_MTL_V3: {
    kind: 'TTS',
    upstream: 'resemble-ai/chatterbox',
    license: 'MIT',
    commercial_policy: 'ALLOWED_BY_UPSTREAM_LICENSE',
    preferred: true,
    requires: ['PYTHON_3_10_PLUS'],
  },
});

function envTrue(value) {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

function pathExists(value) {
  return Boolean(value && fs.existsSync(value));
}

function probeNvidia() {
  try {
    const raw = execFileSync(
      'nvidia-smi',
      ['--query-gpu=name,memory.total,driver_version', '--format=csv,noheader,nounits'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 },
    ).trim();
    if (!raw) return { available: false, gpus: [] };
    const gpus = raw.split(/\r?\n/).map((line) => {
      const [name, memoryMiB, driver] = line.split(',').map((part) => part.trim());
      return {
        name,
        memory_mib: Number(memoryMiB),
        memory_gib: Number.isFinite(Number(memoryMiB)) ? Number((Number(memoryMiB) / 1024).toFixed(2)) : null,
        driver,
      };
    });
    return { available: gpus.length > 0, gpus };
  } catch {
    return { available: false, gpus: [] };
  }
}

export function probeGenerativeCapabilities(env = process.env) {
  const nvidia = probeNvidia();
  const wanRoot = env.CEREBRO_WAN_ANIMATE2_ROOT || '';
  const ltxRoot = env.CEREBRO_LTX2_ROOT || '';
  const wanRuntime = pathExists(wanRoot) && (
    pathExists(`${wanRoot}/infer/wan_animate_2_gradio_distillation.py`) ||
    pathExists(`${wanRoot}/infer/wan_animate_2_gradio.py`)
  );
  const ltxRuntime = pathExists(ltxRoot);
  const ltxLicenseOk = envTrue(env.CEREBRO_LTX_COMMERCIAL_LICENSE_OK) || envTrue(env.CEREBRO_LTX_ENTITY_BELOW_UPSTREAM_REVENUE_THRESHOLD_CONFIRMED);

  const videoCandidates = [
    {
      engine: 'WAN_ANIMATE_2',
      ready: nvidia.available && wanRuntime,
      blockers: [
        ...(!nvidia.available ? ['CUDA_GPU_UNAVAILABLE'] : []),
        ...(!wanRuntime ? ['WAN_LOCAL_RUNTIME_UNAVAILABLE'] : []),
      ],
    },
    {
      engine: 'LTX_2_X',
      ready: nvidia.available && ltxRuntime && ltxLicenseOk,
      blockers: [
        ...(!nvidia.available ? ['CUDA_GPU_UNAVAILABLE'] : []),
        ...(!ltxRuntime ? ['LTX_LOCAL_RUNTIME_UNAVAILABLE'] : []),
        ...(!ltxLicenseOk ? ['LTX_PROD_LICENSE_ELIGIBILITY_UNCONFIRMED'] : []),
      ],
    },
  ];

  const selected = videoCandidates.find((candidate) => candidate.ready) || null;
  const state = selected ? 'READY_PREPROD' : 'CAPABILITY_BLOCKED';

  return {
    schema_version: '1.0.0',
    router_version: GENERATIVE_ROUTER_VERSION,
    environment: env.CEREBRO_ENVIRONMENT || 'PREPROD',
    company_id: env.CEREBRO_COMPANY_ID || 'fenix',
    engine_id: 'CREATIVE-STUDIO-GEN-V27',
    version: 'v2.7',
    host: {
      platform: os.platform(),
      arch: os.arch(),
      cpu_count: os.cpus()?.length ?? null,
      total_ram_gib: Number((os.totalmem() / 1024 ** 3).toFixed(2)),
      nvidia,
    },
    candidates: videoCandidates,
    selected_video_engine: selected?.engine ?? null,
    state,
    block_reason: selected ? null : 'GPU_OR_LOCAL_GENERATIVE_RUNTIME_UNAVAILABLE',
    human_required: false,
    publish_authorized: false,
    promotion_eligible: false,
    additional_recurring_cost_eur: 0,
    baseline_preserved: 'Creative Studio V2.6.2',
    policy: {
      stock_people_as_primary_cast: false,
      synthetic_identity_must_be_governed: true,
      same_character_across_shots: true,
      no_prod_without_human_creative_gate: true,
      fail_closed_on_license_uncertainty: true,
    },
  };
}

export function assertRouterFailClosed(report) {
  if (report.publish_authorized !== false) throw new Error('V2.7 router must keep publication blocked.');
  if (report.promotion_eligible !== false) throw new Error('V2.7 router must keep promotion blocked.');
  if (report.additional_recurring_cost_eur !== 0) throw new Error('V2.7 router must remain zero recurring cost by default.');
  if (report.state === 'READY_PREPROD' && !report.selected_video_engine) throw new Error('READY_PREPROD requires a selected engine.');
  if (report.state === 'CAPABILITY_BLOCKED' && report.human_required !== false) {
    throw new Error('Missing GPU/runtime is a capability block, not HUMAN_REQUIRED.');
  }
  return report;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  const report = assertRouterFailClosed(probeGenerativeCapabilities());
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
