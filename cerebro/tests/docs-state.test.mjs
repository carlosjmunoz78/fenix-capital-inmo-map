import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));

const requiredDocs = [
  'README.md',
  'docs/CURRENT_STATE.md',
  'docs/DEPENDENCY_MAP.md',
  'docs/RUNBOOK.md',
  'docs/CHANGELOG.md',
  'docs/AUTONOMY_BACKUP_REBUILD.md',
  'docs/EVIDENCE.json'
];

const HUMAN_REQUIRED = [
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
];

function extractHumanRequiredSet(content) {
  const match = content.match(/HUMAN_REQUIRED_SET:\s*`(\[[^\n]+\])`/);
  assert.ok(match, 'HUMAN_REQUIRED_SET marker missing');
  return JSON.parse(match[1]);
}

test('canonical CEREBRO documentation set exists', () => {
  for (const file of requiredDocs) assert.ok(fs.existsSync(path.join(root, file)), `${file} missing`);
});

test('current state does not overclaim all engines as operational or autonomous PROD', () => {
  const state = read('docs/CURRENT_STATE.md');
  assert.match(state, /POR AUDITAR/);
  assert.match(state, /not autonomous PROD|No engine becomes autonomous PROD/i);
  assert.match(state, /177\/177 canonical engine IDs/);
  assert.match(state, /Phase 2 existing-engine (wrapper registry|bindings)|Phase 2 read-only evidence audit/i);
  assert.match(state, /Phase 4 multi-company bootstrap V0/i);
  assert.match(state, /Phase 5 Console\/Gateway V0/i);
  assert.match(state, /LAB-TRD.*separate audit/i);
});

test('each operational reference document contains exactly the canonical HUMAN_REQUIRED set', () => {
  for (const file of ['docs/CURRENT_STATE.md','docs/RUNBOOK.md','docs/AUTONOMY_BACKUP_REBUILD.md']) {
    const actual = extractHumanRequiredSet(read(file));
    assert.equal(actual.length, HUMAN_REQUIRED.length, `${file} must contain exactly eight reasons`);
    assert.equal(new Set(actual).size, HUMAN_REQUIRED.length, `${file} contains duplicate reasons`);
    assert.deepEqual([...actual].sort(), [...HUMAN_REQUIRED].sort(), `${file} HUMAN_REQUIRED set differs from canonical`);
  }
});

test('structured Phase 5 evidence binds run result to exact head SHA', () => {
  const evidence = json('docs/EVIDENCE.json').phase_5;
  const reviewed = '2180258a3ae91697d6bd988361996afa62032f72';
  const merged = 'c2eb030e2e8ed0ab45ca58775a7183e359e3d2e9';
  assert.equal(evidence.reviewed_head_sha, reviewed);
  assert.equal(evidence.merge_sha, merged);
  assert.deepEqual(evidence.preprod.factory, { run_id: 34292418628, conclusion: 'success', head_sha: reviewed });
  assert.deepEqual(evidence.preprod.app, { run_id: 34292418604, conclusion: 'success', head_sha: reviewed });
  assert.deepEqual(evidence.preprod.tribunal, { conclusion: 'clean_no_major_issues', head_sha: reviewed });
  assert.deepEqual(evidence.prod.live_deploy, { run_id: 34292739019, conclusion: 'success', head_sha: merged });
  assert.deepEqual(evidence.prod.runtime_smoke, { run_id: 34292739031, conclusion: 'success', head_sha: merged });
  assert.equal(evidence.scope_status, 'STRUCTURAL_REFERENCE_GREEN');
  assert.equal(evidence.autonomous_prod, false);
});

test('README records current Phase 5 evidence and safe boundaries without stale candidate status', () => {
  const readme = read('README.md');
  assert.match(readme, /docs\/EVIDENCE\.json|EVIDENCE\.json/);
  assert.match(readme, /No escribe en Supabase/);
  assert.match(readme, /Trading mantiene aislamiento/);
  assert.match(readme, /nunca acceso directo a un modelo/i);
  assert.doesNotMatch(readme, /PREPROD_CANDIDATE hasta que CI confirme este branch/);
});

test('runbook enforces exact-head gates and canonical emergency rollback', () => {
  const runbook = read('docs/RUNBOOK.md');
  assert.match(runbook, /exact HEAD/i);
  assert.match(runbook, /PROD Live Deploy/);
  assert.match(runbook, /PROD Runtime Smoke/);
  assert.match(runbook, /PROD_ROLLBACK_RUNBOOK\.md/);
  assert.match(runbook, /PROD Rollback Rehearsal/);
  assert.match(runbook, /never reset or rewrite `main` history/i);
  assert.match(runbook, /do not claim green/i);
});

test('dependency map preserves tenant guard, gateway-only and trading isolation', () => {
  const map = read('docs/DEPENDENCY_MAP.md');
  assert.match(map, /ENGACT-001.*TENANT-001/);
  assert.match(map, /ACTGW-001/);
  assert.match(map, /direct model access is forbidden/i);
  assert.match(map, /LAB-TRD.*isolated|Trading LAB.*isolated/i);
});
