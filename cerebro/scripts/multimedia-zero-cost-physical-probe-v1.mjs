import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { assessMultimediaZeroCostProbe, INVENTORY_SCOPE } from '../runtime/multimedia-zero-cost-physical-inventory-v1.mjs';

const outputPath = process.argv[2] || '/tmp/multimedia-zero-cost-physical-inventory-v1.json';

function firstLine(value) {
  return String(value || '').split(/\r?\n/).map((line) => line.trim()).find(Boolean) || null;
}

function probe(id, candidates, args) {
  for (const candidate of candidates) {
    const result = spawnSync(candidate, args, {
      encoding: 'utf8',
      timeout: 5000,
      env: { ...process.env, NO_COLOR: '1' },
      windowsHide: true
    });
    if (!result.error && result.status === 0) {
      const line = firstLine(result.stdout) || firstLine(result.stderr) || `${candidate}:present`;
      return { id, present: true, version: line.slice(0, 240) };
    }
    if (result.error && result.error.code !== 'ENOENT') {
      throw new Error(`${id} probe failed safely: ${result.error.message}`);
    }
  }
  return { id, present: false, version: null };
}

const raw = {
  scope: INVENTORY_SCOPE,
  environment: 'PREPROD',
  company_id: 'GLOBAL',
  engine_id: 'FACT-001',
  capability_id: 'DIGITAL-BUILD-MULTIMEDIA',
  install_performed: false,
  model_download_performed: false,
  provider_call_performed: false,
  customer_data_used: false,
  prod_write_performed: false,
  spend_eur: 0,
  tools: {
    ffmpeg: probe('ffmpeg', ['ffmpeg'], ['-version']),
    ffprobe: probe('ffprobe', ['ffprobe'], ['-version']),
    imagemagick: probe('imagemagick', ['magick', 'convert'], ['-version']),
    sox: probe('sox', ['sox'], ['--version']),
    espeak_ng: probe('espeak_ng', ['espeak-ng'], ['--version'])
  }
};

const assessment = assessMultimediaZeroCostProbe(raw);
writeFileSync(outputPath, `${JSON.stringify({ raw_probe: raw, assessment }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
console.log(JSON.stringify({
  status: assessment.status,
  scope: assessment.scope,
  verified_capabilities: assessment.verified_capabilities,
  tools: Object.fromEntries(Object.entries(assessment.tools).map(([id, value]) => [id, value.present])),
  evidence_fingerprint: assessment.evidence_fingerprint,
  no_install: true,
  no_model_download: true,
  no_provider_call: true,
  spend_eur: 0
}));
