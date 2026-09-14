import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const cli = path.join(root, 'factory.mjs');
const registry = path.join(root, 'registry', 'engine-registry.seed.json');

function run(out, registryFile=registry) {
  return execFileSync(process.execPath, [cli, 'generate', '--registry', registryFile, '--out', out], { encoding: 'utf8' });
}
function tempRegistry(mutator){const data=JSON.parse(fs.readFileSync(registry,'utf8'));mutator(data);const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-registry-'));const file=path.join(dir,'registry.json');fs.writeFileSync(file,JSON.stringify(data),'utf8');return file;}
function assertValidateFails(file,pattern){assert.throws(()=>execFileSync(process.execPath,[cli,'validate','--registry',file],{encoding:'utf8',stdio:'pipe'}),pattern);}

test('registry seed contains exactly 177 unique canonical engine ids', () => {
  const data = JSON.parse(fs.readFileSync(registry, 'utf8'));
  assert.equal(data.engine_ids.length, 177);
  assert.equal(data.count, 177);
  assert.equal(new Set(data.engine_ids).size, 177);
});

test('registry defaults carry safe multi-company/version/scaffold fields', () => {
  const data = JSON.parse(fs.readFileSync(registry, 'utf8'));
  for (const key of ['version','environment','company_scope','evidence_state']) assert.ok(data.defaults[key], `missing default ${key}`);
  assert.equal(data.defaults.environment,'SCAFFOLD');
  assert.equal(data.defaults.evidence_state,'UNKNOWN_REQUIRES_AUDIT');
});

test('factory validates expanded registry successfully', () => {
  const output = execFileSync(process.execPath, [cli, 'validate', '--registry', registry], { encoding: 'utf8' });
  const result = JSON.parse(output);
  assert.equal(result.engines, 177);
  assert.equal(result.unique_ids, 177);
  assert.equal(result.canonical_count,177);
  assert.equal(result.safe_scaffold,true);
});

test('GOV-001 rejects count drift duplicates and noncanonical override ids',()=>{
  assertValidateFails(tempRegistry(x=>{x.engine_ids.pop();x.count=176}),/exactly 177 ids/);
  assertValidateFails(tempRegistry(x=>{x.engine_ids[1]=x.engine_ids[0]}),/unique/);
  assertValidateFails(tempRegistry(x=>{x.overrides['FAKE-999']={name:'fake'}}),/noncanonical engine_id/);
});

test('GOV-001 rejects PREPROD or PROD seed environments and unsafe autonomy flags',()=>{
  assertValidateFails(tempRegistry(x=>{x.defaults.environment='PREPROD'}),/must be SCAFFOLD/);
  assertValidateFails(tempRegistry(x=>{x.overrides['FACT-001']={...(x.overrides['FACT-001']??{}),environment:'PROD'}}),/must be SCAFFOLD/);
  assertValidateFails(tempRegistry(x=>{x.overrides['FACT-001']={...(x.overrides['FACT-001']??{}),autonomous_prod:true}}),/unsafe override autonomous_prod=true/);
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
