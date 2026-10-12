import fs from 'node:fs';
import path from 'node:path';
import { coverageSignature, generateSyntheticHuman } from './synthetic-human-population.mjs';

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const count = Math.max(1, Math.min(10000, Number(arg('count', '1000'))));
const out = arg('out', 'artifacts/human-intelligence/population-manifest.v1.json');
const prefix = arg('seed-prefix', 'CEREBRO-HUMAN-POP-V1');

const strategyCounts = {};
const roleCounts = {};
const styleCounts = {};
const signatures = new Set();

for (let i = 0; i < count; i += 1) {
  const profile = generateSyntheticHuman(`${prefix}-${i}`);
  signatures.add(coverageSignature(profile));
  strategyCounts[profile.strategy] = (strategyCounts[profile.strategy] ?? 0) + 1;
  roleCounts[profile.dimensions.role] = (roleCounts[profile.dimensions.role] ?? 0) + 1;
  styleCounts[profile.dimensions.conversation_style] = (styleCounts[profile.dimensions.conversation_style] ?? 0) + 1;
}

const manifest = {
  state_type: 'CEREBRO_SYNTHETIC_HUMAN_POPULATION_MANIFEST_V1',
  engine_id: 'SIM-001',
  environment: 'LAB',
  seed_prefix: prefix,
  requested_profiles: count,
  unique_coverage_signatures: signatures.size,
  coverage_signature_ratio: Number((signatures.size / count).toFixed(6)),
  strategy_counts: strategyCounts,
  role_counts: roleCounts,
  conversation_style_counts: styleCounts,
  private_profiles_persisted: false,
  identifiable_customer_data: false,
  secrets: false,
  prod_authorized: false,
  prod_write_authorized: false,
  trading_access: false,
  additional_cost_eur: 0
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest));
