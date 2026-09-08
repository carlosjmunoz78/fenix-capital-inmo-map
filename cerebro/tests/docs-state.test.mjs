import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const requiredDocs = [
  'README.md',
  'docs/CURRENT_STATE.md',
  'docs/DEPENDENCY_MAP.md',
  'docs/RUNBOOK.md',
  'docs/CHANGELOG.md',
  'docs/AUTONOMY_BACKUP_REBUILD.md'
];

test('canonical CEREBRO documentation set exists', () => {
  for (const file of requiredDocs) assert.ok(fs.existsSync(path.join(root, file)), `${file} missing`);
});

test('current state does not overclaim all engines as operational or autonomous PROD', () => {
  const state = read('docs/CURRENT_STATE.md');
  assert.match(state, /POR AUDITAR/);
  assert.match(state, /not autonomous PROD|No engine becomes autonomous PROD/i);
  assert.match(state, /177\/177 canonical engine IDs/);
  assert.match(state, /Phase 2 existing-engine bindings/i);
  assert.match(state, /Phase 4 multi-company bootstrap V0/i);
  assert.match(state, /Phase 5 Console\/Gateway V0/i);
});

test('documentation keeps the eight canonical HUMAN_REQUIRED reasons exact and complete', () => {
  const docs = read('docs/CURRENT_STATE.md') + '\n' + read('docs/RUNBOOK.md') + '\n' + read('docs/AUTONOMY_BACKUP_REBUILD.md');
  const reasons = [
    'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
    'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
  ];
  for (const reason of reasons) assert.match(docs, new RegExp(reason));
});

test('README records current Phase 5 exact-SHA evidence and safe boundaries', () => {
  const readme = read('README.md');
  assert.match(readme, /c2eb030e2e8ed0ab45ca58775a7183e359e3d2e9/);
  assert.match(readme, /34292739019/);
  assert.match(readme, /34292739031/);
  assert.match(readme, /No escribe en Supabase/);
  assert.match(readme, /Trading mantiene aislamiento/);
  assert.match(readme, /nunca acceso directo a un modelo/i);
  assert.doesNotMatch(readme, /PREPROD_CANDIDATE hasta que CI confirme este branch/);
});

test('runbook enforces exact-head PREPROD review and exact-SHA production checks', () => {
  const runbook = read('docs/RUNBOOK.md');
  assert.match(runbook, /exact HEAD/i);
  assert.match(runbook, /PROD Live Deploy/);
  assert.match(runbook, /PROD Runtime Smoke/);
  assert.match(runbook, /do not claim green/i);
});

test('dependency map preserves tenant guard, gateway-only and trading isolation', () => {
  const map = read('docs/DEPENDENCY_MAP.md');
  assert.match(map, /ENGACT-001.*TENANT-001/);
  assert.match(map, /ACTGW-001/);
  assert.match(map, /direct model access is forbidden/i);
  assert.match(map, /LAB-TRD.*isolated|Trading LAB.*isolated/i);
});
