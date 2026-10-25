import { assertWanAdapterV27, buildWanAnimate2ShotV27, WAN_UPSTREAM_SHA } from '../runtime/creative-wan-animate2-adapter-v27.mjs';

const report = assertWanAdapterV27(buildWanAnimate2ShotV27({
  shot: {
    shot_id: 'hook-001',
    identity_id: 'FENIX-PRESENTER-001',
    driving_video: '/nonexistent/driving.mp4',
  },
  identity: {
    identity_id: 'FENIX-PRESENTER-001',
    reference_image: '/nonexistent/reference.png',
  },
  prompt: 'Persona profesional de Fénix Capital en un entorno residencial luminoso, identidad consistente, plano cinematográfico vertical.',
  runtime_root: '',
  output_root: '.cerebro-v27/wan',
  mode: 'DISTILLED',
  width: 720,
  height: 1280,
  fps: 24,
  clip_len: 81,
  seed: 42,
  dry_run: true,
}));

if (report.upstream.pinned_sha !== WAN_UPSTREAM_SHA) throw new Error('WAN_PIN_NOT_FIXED');
if (report.state !== 'CAPABILITY_BLOCKED') throw new Error(`EXPECTED_CAPABILITY_BLOCKED_GOT:${report.state}`);
if (report.human_required !== false) throw new Error('CAPABILITY_BLOCK_MUST_NOT_REQUEST_HUMAN');
if (!report.blockers.includes('WAN_RUNTIME_ROOT_UNSET')) throw new Error('WAN_RUNTIME_BLOCKER_MISSING');
if (!report.blockers.includes('WAN_INPUTS_UNAVAILABLE')) throw new Error('WAN_INPUT_BLOCKER_MISSING');

const args = report.command.args;
const expected = new Map([
  ['--refer-img-file', '/nonexistent/reference.png'],
  ['--refer-video-file', '/nonexistent/driving.mp4'],
  ['--width', '720'],
  ['--height', '1280'],
  ['--fps', '24'],
  ['--clip_len', '81'],
  ['--sample_guide_scale', '1.0'],
  ['--step', '10'],
  ['--seed', '42'],
]);
for (const [flag, value] of expected) {
  const idx = args.indexOf(flag);
  if (idx < 0 || args[idx + 1] !== value) throw new Error(`WAN_FLAG_DRIFT:${flag}`);
}

const out = process.env.CEREBRO_WAN_SMOKE_REPORT;
if (out) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
}
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
