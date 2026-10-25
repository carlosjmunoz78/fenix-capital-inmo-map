import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const VOICE_DELIVERY_VERSION = '2.7.0';

function run(bin, args, { allowFailure = false } = {}) {
  const result = spawnSync(bin, args, { encoding: 'utf8' });
  if (!allowFailure && (result.error || result.status !== 0)) {
    const detail = result.stderr || result.stdout || result.error?.message || 'unknown error';
    throw new Error(`${bin.toUpperCase()}_FAILED: ${detail}`);
  }
  return result;
}

function parseLoudnormJson(stderr) {
  const matches = String(stderr || '').match(/\{[\s\S]*?\}/g) || [];
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(matches[i]);
      if (parsed.input_i !== undefined && parsed.input_tp !== undefined) return parsed;
    } catch {}
  }
  throw new Error('LOUDNORM_ANALYSIS_JSON_NOT_FOUND');
}

function parseEbur128(stderr) {
  const text = String(stderr || '');
  const summary = text.slice(text.lastIndexOf('Summary:'));
  const integrated = Number(summary.match(/I:\s+(-?[0-9.]+) LUFS/)?.[1]);
  const truePeak = Number(summary.match(/Peak:\s+(-?[0-9.]+) dBFS/)?.[1]);
  const lra = Number(summary.match(/LRA:\s+(-?[0-9.]+) LU/)?.[1]);
  return {
    integrated_lufs: Number.isFinite(integrated) ? integrated : null,
    true_peak_dbfs: Number.isFinite(truePeak) ? truePeak : null,
    lra_lu: Number.isFinite(lra) ? lra : null,
  };
}

function ffprobe(file) {
  const result = run('ffprobe', [
    '-v', 'error', '-show_entries', 'stream=codec_name,sample_rate,channels,sample_fmt:format=duration,size', '-of', 'json', file,
  ]);
  return JSON.parse(result.stdout);
}

export function masterVoiceDeliveryV27({
  input,
  output,
  targetLufs = -16,
  targetTruePeakDbfs = -1.5,
  targetLra = 7,
  sampleRate = 48000,
  channels = 2,
} = {}) {
  if (!input || !output) throw new Error('VOICE_DELIVERY_INPUT_OUTPUT_REQUIRED');
  if (!fs.existsSync(input)) throw new Error(`VOICE_DELIVERY_INPUT_NOT_FOUND:${input}`);
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const analysis = run('ffmpeg', [
    '-hide_banner', '-nostats', '-i', input,
    '-af', `loudnorm=I=${targetLufs}:LRA=${targetLra}:TP=${targetTruePeakDbfs}:print_format=json`,
    '-f', 'null', '-',
  ]);
  const measured = parseLoudnormJson(analysis.stderr);

  const filter = [
    `loudnorm=I=${targetLufs}:LRA=${targetLra}:TP=${targetTruePeakDbfs}`,
    `measured_I=${measured.input_i}`,
    `measured_LRA=${measured.input_lra}`,
    `measured_TP=${measured.input_tp}`,
    `measured_thresh=${measured.input_thresh}`,
    `offset=${measured.target_offset}`,
    'linear=true',
    'print_format=summary',
  ].join(':');

  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', input,
    '-af', filter,
    '-ar', String(sampleRate), '-ac', String(channels),
    '-c:a', 'pcm_s24le', '-y', output,
  ]);

  const probe = ffprobe(output);
  const verify = run('ffmpeg', [
    '-hide_banner', '-nostats', '-i', output,
    '-af', 'ebur128=peak=true', '-f', 'null', '-',
  ], { allowFailure: true });
  const loudness = parseEbur128(verify.stderr);
  const stream = probe.streams?.[0] || {};
  const duration = Number(probe.format?.duration || 0);

  const report = {
    schema_version: '1.0.0',
    mastering_version: VOICE_DELIVERY_VERSION,
    input,
    output,
    target: {
      integrated_lufs: targetLufs,
      true_peak_dbfs: targetTruePeakDbfs,
      lra_lu: targetLra,
      sample_rate_hz: sampleRate,
      channels,
    },
    measured_input: measured,
    measured_output: loudness,
    physical_output: {
      codec: stream.codec_name || null,
      sample_fmt: stream.sample_fmt || null,
      sample_rate_hz: Number(stream.sample_rate || 0),
      channels: Number(stream.channels || 0),
      duration_seconds: duration,
      bytes: Number(probe.format?.size || 0),
    },
    raw_preserved: true,
    publish_authorized: false,
    promotion_eligible: false,
    additional_recurring_cost_eur: 0,
  };

  if (report.physical_output.sample_rate_hz !== sampleRate) throw new Error('VOICE_DELIVERY_SAMPLE_RATE_GATE_RED');
  if (report.physical_output.channels !== channels) throw new Error('VOICE_DELIVERY_CHANNEL_GATE_RED');
  if (!(duration > 0)) throw new Error('VOICE_DELIVERY_DURATION_GATE_RED');
  if (loudness.true_peak_dbfs !== null && loudness.true_peak_dbfs > targetTruePeakDbfs + 0.2) {
    throw new Error(`VOICE_DELIVERY_TRUE_PEAK_GATE_RED:${loudness.true_peak_dbfs}`);
  }
  if (loudness.integrated_lufs !== null && Math.abs(loudness.integrated_lufs - targetLufs) > 0.6) {
    throw new Error(`VOICE_DELIVERY_LOUDNESS_GATE_RED:${loudness.integrated_lufs}`);
  }

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('creative-voice-delivery-v27.mjs')) {
  const [input, output, reportFile] = process.argv.slice(2);
  const report = masterVoiceDeliveryV27({ input, output });
  if (reportFile) {
    fs.mkdirSync(path.dirname(reportFile), { recursive: true });
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
  }
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
