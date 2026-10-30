import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(MODULE_DIR, '../data');
export const NEURONAL_SOURCE_TARGET_V1 = path.join(DATA_DIR, 'neuronal-superparallel-v1.json.gz.b64');
export const NEURONAL_SOURCE_EXPECTED_LENGTH_V1 = 19868;
export const NEURONAL_SOURCE_EXPECTED_SHA256_V1 = 'cae799ed67c9f2e3bad4e9fe640667acaf38a0ad3b2212ddc4d46c90157c3933';

export function ensureNeuronalSourceV1({ data_dir = DATA_DIR, target = NEURONAL_SOURCE_TARGET_V1 } = {}) {
  const parts = Array.from({ length: 8 }, (_, index) =>
    path.join(data_dir, `neuronal-superparallel-v1.part${String(index + 1).padStart(2, '0')}.b64`));
  const encoded = parts.map(file => fs.readFileSync(file, 'utf8').trim()).join('');
  if (encoded.length !== NEURONAL_SOURCE_EXPECTED_LENGTH_V1) throw new Error(`NEURONAL_SOURCE_LENGTH_MISMATCH:${encoded.length}`);
  const digest = createHash('sha256').update(encoded).digest('hex');
  if (digest !== NEURONAL_SOURCE_EXPECTED_SHA256_V1) throw new Error(`NEURONAL_SOURCE_SHA256_MISMATCH:${digest}`);
  const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').trim() : '';
  if (existing !== encoded) fs.writeFileSync(target, `${encoded}\n`, 'utf8');
  return Object.freeze({ ok: true, target, parts: parts.length, length: encoded.length, sha256: digest, changed: existing !== encoded });
}

export const NEURONAL_SOURCE_INTEGRITY_V1_CONTRACT = Object.freeze({
  campaign_id: 'NEURONAL-SUPERPARALLEL-V1',
  parts: 8,
  expected_length: NEURONAL_SOURCE_EXPECTED_LENGTH_V1,
  expected_sha256: NEURONAL_SOURCE_EXPECTED_SHA256_V1,
  deterministic_rebuild: true,
  additional_cost_eur: 0,
  prod_authorized: false,
  trading_access: false,
});
