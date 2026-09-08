import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const cli = path.join(root, 'factory.mjs');
const registry = path.join(root, 'registry', 'engine-registry.seed.json');

function run(out) {
  return execFileSync(process.execPath, [cli, 'generate', '--registry', registry, '--out', out], { encoding: 'utf8' });
}

test('registry seed contains exactly 177 unique canonical engine ids', () => {
  const data = JSON.parse(fs.readFileSync(registry, 'utf8'));
  assert.equal(data.engine_ids.length, 177);
  assert.equal(data.count, 177);
  assert.equal(new Set(data.engine_ids).size, 177);
});

test('registry defaults carry multi-company/version/environment fields', () => {
  const data = JSON.parse(fs.readFileSync(registry, 'utf8'));
  for (const key of ['version','environment','company_scope','evidence_state']) assert.ok(data.defaults[key], `missing default ${key}`);
});

test('factory validates expanded registry successfully', () => {
  const output = execFileSync(process.execPath, [cli, 'validate', '--registry', registry], { encoding: 'utf8' });
  const result = JSON.parse(output);
  assert.equal(result.engines, 177);
  assert.equal(result.unique_ids, 177);
});

test('factory generates all 177 skeletons with complete V0 file set', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-factory-'));
  run(out);
  const index = JSON.parse(fs.readFileSync(path.join(out, 'skeleton-index.json'), 'utf8'));
  assert.equal(index.engine_count, 177);
  assert.equal(index.template_file_count, 18);
  for (const e of index.engines) assert.equal(e.files, 18, e.engine_id);
});

test('generated manifests default safe: scaffold, disabled/autonomy false, deny by default', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-safe-'));
  run(out);
  const id = 'FACT-001';
  const base = path.join(out, 'engines', id);
  const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
  const config = JSON.parse(fs.readFileSync(path.join(base, 'config.json'), 'utf8'));
  const permissions = JSON.parse(fs.readFileSync(path.join(base, 'permissions.json'), 'utf8'));
  assert.equal(manifest.lifecycle, 'SCAFFOLD');
  assert.equal(manifest.autonomous_prod, false);
  assert.equal(config.enabled, false);
  assert.equal(permissions.default, 'deny');
});

test('generation is deterministic and idempotent', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-idempotent-'));
  run(out);
  const first = fs.readFileSync(path.join(out, 'skeleton-index.json'), 'utf8');
  run(out);
  const second = fs.readFileSync(path.join(out, 'skeleton-index.json'), 'utf8');
  assert.equal(second, first);
});
