import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const WAN_ADAPTER_VERSION = '2.7.1';
export const WAN_UPSTREAM_REPO = 'https://github.com/Wan-Video/Wan-Animate-2.git';
export const WAN_UPSTREAM_SHA = '3ad2fef7d61d6200c9c653e0fe47be7616b323f3';
export const WAN_MODEL_ID = 'Wan-AI/Wan2.2-Animate-2-14B';

function required(value, name) {
  if (value === undefined || value === null || String(value).trim() === '') throw new Error(`WAN_MISSING_${name}`);
  return String(value);
}

function probeNvidia() {
  const r = spawnSync('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'], { encoding: 'utf8' });
  if (r.error || r.status !== 0 || !String(r.stdout || '').trim()) return { available: false, gpus: [] };
  return { available: true, gpus: String(r.stdout).trim().split(/\r?\n/).map((line) => {
    const [name, memoryMiB] = line.split(',').map((x) => x.trim());
    return { name, memory_mib: Number(memoryMiB) || null };
  }) };
}

function readRepoHead(root) {
  if (!root || !fs.existsSync(path.join(root, '.git'))) return null;
  const r = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) return null;
  return String(r.stdout || '').trim() || null;
}

export function buildWanAnimate2ShotV27({
  shot,
  identity,
  prompt,
  company_id = process.env.CEREBRO_COMPANY_ID || 'fenix',
  environment = process.env.CEREBRO_ENVIRONMENT || 'PREPROD',
  runtime_root = process.env.CEREBRO_WAN_ANIMATE2_ROOT || '',
  output_root = process.env.CEREBRO_WAN_OUTPUT_ROOT || '.cerebro-v27/wan',
  mode = 'DISTILLED',
  width = 720,
  height = 1280,
  fps = 24,
  clip_len = 81,
  seed = -1,
  dry_run = false,
} = {}) {
  const shotId = required(shot?.shot_id, 'SHOT_ID');
  const identityId = required(identity?.identity_id || shot?.identity_id, 'IDENTITY_ID');
  const referenceImage = required(identity?.reference_image, 'REFERENCE_IMAGE');
  const drivingVideo = required(shot?.driving_video, 'DRIVING_VIDEO');
  const promptText = required(prompt, 'PROMPT');
  const companyId = required(company_id, 'COMPANY_ID');
  const env = required(environment, 'ENVIRONMENT');

  if (!Number.isInteger(Number(width)) || Number(width) <= 0) throw new Error('WAN_WIDTH_INVALID');
  if (!Number.isInteger(Number(height)) || Number(height) <= 0) throw new Error('WAN_HEIGHT_INVALID');
  if (!Number.isInteger(Number(fps)) || Number(fps) <= 0) throw new Error('WAN_FPS_INVALID');

  const normalizedMode = String(mode).toUpperCase();
  if (!['DISTILLED', 'BASE'].includes(normalizedMode)) throw new Error('WAN_MODE_INVALID');

  const scriptRel = 'infer/wan_animate_2_demo.py';
  const configRel = normalizedMode === 'DISTILLED' ? 'infer/wan_animate_2_distillation.yaml' : 'infer/wan_animate_2.yaml';
  const rootForCommand = runtime_root || '<CEREBRO_WAN_ANIMATE2_ROOT>';
  const script = path.join(rootForCommand, scriptRel);
  const config = path.join(rootForCommand, configRel);
  const shotOutput = path.join(output_root, companyId, identityId, shotId);

  const args = [
    script,
    '--prompt', promptText,
    '--refer-img-file', referenceImage,
    '--refer-video-file', drivingVideo,
    '--config', config,
    '--width', String(width),
    '--height', String(height),
    '--fps', String(fps),
    '--clip_len', String(clip_len),
    '--sample_guide_scale', normalizedMode === 'DISTILLED' ? '1.0' : '3.0',
    '--step', normalizedMode === 'DISTILLED' ? '10' : '40',
    '--seed', String(seed),
    '--prompt_ref', '人物动作的参考视频',
    '--output-dir', shotOutput,
  ];

  const nvidia = probeNvidia();
  const repoHead = runtime_root ? readRepoHead(runtime_root) : null;
  const scriptExists = Boolean(runtime_root && fs.existsSync(path.join(runtime_root, scriptRel)));
  const configExists = Boolean(runtime_root && fs.existsSync(path.join(runtime_root, configRel)));
  const inputsExist = fs.existsSync(referenceImage) && fs.existsSync(drivingVideo);
  const pinMatches = repoHead === WAN_UPSTREAM_SHA;
  const ready = nvidia.available && scriptExists && configExists && inputsExist && pinMatches;
  const blockers = [
    ...(!nvidia.available ? ['CUDA_GPU_UNAVAILABLE'] : []),
    ...(!runtime_root ? ['WAN_RUNTIME_ROOT_UNSET'] : []),
    ...(runtime_root && !scriptExists ? ['WAN_INFERENCE_SCRIPT_MISSING'] : []),
    ...(runtime_root && !configExists ? ['WAN_CONFIG_MISSING'] : []),
    ...(runtime_root && repoHead && !pinMatches ? [`WAN_UPSTREAM_SHA_MISMATCH:${repoHead}`] : []),
    ...(runtime_root && !repoHead ? ['WAN_REPO_HEAD_UNVERIFIED'] : []),
    ...(!inputsExist ? ['WAN_INPUTS_UNAVAILABLE'] : []),
  ];

  return {
    schema_version: '1.1.0', adapter_version: WAN_ADAPTER_VERSION,
    company_id: companyId, engine_id: 'CREATIVE-WAN-ANIMATE2-V27', environment: env, version: 'v2.7',
    upstream: { repo: WAN_UPSTREAM_REPO, pinned_sha: WAN_UPSTREAM_SHA, model_id: WAN_MODEL_ID, license: 'Apache-2.0' },
    shot_id: shotId, identity_id: identityId, mode: normalizedMode,
    command: { executable: 'python', args, cwd: runtime_root || null, output_root: shotOutput },
    runtime_probe: { nvidia, runtime_root: runtime_root || null, repo_head: repoHead, pin_matches: pinMatches, script_exists: scriptExists, config_exists: configExists, inputs_exist: inputsExist },
    state: ready ? 'READY_PREPROD' : 'CAPABILITY_BLOCKED', blockers, dry_run: Boolean(dry_run),
    human_required: false, publish_authorized: false, promotion_eligible: false, additional_recurring_cost_eur: 0,
    baseline_preserved: 'Creative Studio V2.6.2',
  };
}

export function assertWanAdapterV27(report) {
  if (report.publish_authorized !== false || report.promotion_eligible !== false) throw new Error('WAN_GATE_MUST_FAIL_CLOSED');
  if (report.additional_recurring_cost_eur !== 0) throw new Error('WAN_RECURRING_COST_GATE_RED');
  if (report.human_required !== false) throw new Error('WAN_CAPABILITY_BLOCK_MUST_NOT_BE_HUMAN_REQUIRED');
  if (report.upstream.pinned_sha !== WAN_UPSTREAM_SHA) throw new Error('WAN_UPSTREAM_PIN_DRIFT');
  if (!report.company_id || !report.environment || !report.engine_id || !report.version) throw new Error('WAN_MULTIEMPRESA_CONTEXT_MISSING');
  if (!report.command.args.includes('--refer-img-file') || !report.command.args.includes('--refer-video-file')) throw new Error('WAN_OFFICIAL_INPUT_FLAGS_MISSING');
  if (report.mode === 'DISTILLED') {
    const step = report.command.args[report.command.args.indexOf('--step') + 1];
    const scale = report.command.args[report.command.args.indexOf('--sample_guide_scale') + 1];
    if (step !== '10' || scale !== '1.0') throw new Error('WAN_DISTILLED_OFFICIAL_SETTINGS_DRIFT');
  }
  return report;
}

export function executeWanAnimate2ShotV27(options = {}) {
  const report = assertWanAdapterV27(buildWanAnimate2ShotV27(options));
  if (options.dry_run) return report;
  if (report.state !== 'READY_PREPROD') throw new Error(`WAN_CAPABILITY_BLOCKED:${report.blockers.join(',')}`);
  fs.mkdirSync(report.command.output_root, { recursive: true });
  const r = spawnSync(report.command.executable, report.command.args, { cwd: report.command.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.error || r.status !== 0) throw new Error(`WAN_INFERENCE_FAILED:${r.stderr || r.stdout || r.error?.message}`);
  return { ...report, state: 'RENDERED_PREPROD', stdout: r.stdout, stderr: r.stderr };
}
