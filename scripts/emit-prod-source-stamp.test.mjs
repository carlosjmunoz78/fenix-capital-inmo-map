import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve('scripts/emit-prod-source-stamp.mjs');
const sha = '3de1c9ac006dd3f295df4887cc38fb4df495a1f6';
function run(overrides = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'source-audit-test-'));
  const env = { ...process.env, CEREBRO_BUILD_SOURCE_SHA: '', VERCEL_GIT_COMMIT_SHA: '', GITHUB_SHA: '', VERCEL_ENV: '', CEREBRO_REQUIRE_SOURCE_STAMP: '', ...overrides };
  return { cwd, result: spawnSync(process.execPath, [script], { cwd, env, encoding: 'utf8' }) };
}
test('emits exact SHA for the artifact', () => {
  const x = run({ CEREBRO_BUILD_SOURCE_SHA: sha });
  try {
    assert.equal(x.result.status, 0, x.result.stderr);
    assert.equal(readFileSync(join(x.cwd, 'dist', 'PROD_SOURCE_SHA.txt'), 'utf8'), sha + '\n');
  } finally { rmSync(x.cwd, { recursive: true, force: true }); }
});
test('rejects invalid source SHA', () => {
  const x = run({ CEREBRO_BUILD_SOURCE_SHA: 'not-a-commit' });
  try { assert.notEqual(x.result.status, 0); assert.match(x.result.stderr, /SOURCE_STAMP_INVALID_SHA/); }
  finally { rmSync(x.cwd, { recursive: true, force: true }); }
});
test('rejects divergent SHA metadata', () => {
  const x = run({ CEREBRO_BUILD_SOURCE_SHA: sha, VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40) });
  try { assert.notEqual(x.result.status, 0); assert.match(x.result.stderr, /SOURCE_STAMP_CONFLICT/); }
  finally { rmSync(x.cwd, { recursive: true, force: true }); }
});
test('fails closed when production build identity is unavailable', () => {
  const x = run({ VERCEL_ENV: 'production' });
  try { assert.notEqual(x.result.status, 0); assert.match(x.result.stderr, /SOURCE_STAMP_MISSING_FOR_PRODUCTION/); }
  finally { rmSync(x.cwd, { recursive: true, force: true }); }
});
test('does not claim provenance for an unidentifiable local build', () => {
  const x = run();
  try { assert.equal(x.result.status, 0); assert.match(x.result.stdout, /SOURCE_STAMP_SKIPPED/); }
  finally { rmSync(x.cwd, { recursive: true, force: true }); }
});
