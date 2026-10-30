import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DAEMON = new URL('../runtime/cerebro-supervisor-daemon-v0.mjs', import.meta.url);
const PINNED_IMAGE = `node@sha256:${'a'.repeat(64)}`;

function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-daemon-dynamic-v1-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function run(dir, env = {}, args = ['--enqueue-health-probe', '--cycles', '2']) {
  return spawnSync(process.execPath, [DAEMON.pathname, ...args], {
    encoding: 'utf8', timeout: 20_000,
    env: {
      ...process.env,
      CEREBRO_SUPERVISOR_STATE_DIR: dir,
      CEREBRO_SUPERVISOR_ENV: 'PREPROD',
      CEREBRO_IDLE_DELAY_MS: '0',
      CEREBRO_HEARTBEAT_MS: '25',
      // Dynamic-policy tests validate scheduling limits, not paid provider execution.
      // Never inherit a workflow-level DeepSeek secret into the daemon under test.
      CEREBRO_ENABLE_DEEPSEEK_WORK_PUMP: 'NO',
      DEEPSEEK_API_KEY: '',
      // Same rule for the physical repo sandbox: tests opt in explicitly.
      CEREBRO_ENABLE_REPO_SANDBOX: 'NO',
      CEREBRO_REPO_SANDBOX_WORKSPACE_ROOT: '',
      CEREBRO_REPO_SANDBOX_IMAGE: '',
      // Legacy dynamic-policy tests isolate only their declared contexts.
      // Mission and NEURONAL autofill have dedicated adapter/integration tests.
      CEREBRO_ENABLE_NEURONAL_AUTOFILL: 'NO',
      CEREBRO_ENABLE_MISSION_AUTOFILL: 'NO',
      ...env,
    },
  });
}

test('daemon default runtime ceiling is verified 180 while DeepSeek provider ceiling remains measured 8', t => {
  const dir = tempDir(t);
  const result = run(dir);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const heartbeat = JSON.parse(fs.readFileSync(path.join(dir, 'heartbeat.json'), 'utf8'));
  assert.equal(heartbeat.dynamic_concurrency.max_global_concurrency, 180);
  assert.equal(heartbeat.dynamic_concurrency.max_provider_concurrency.deepseek, 8);
  assert.equal(heartbeat.dynamic_concurrency.max_repo_write_concurrency, 1);
  assert.equal(heartbeat.dynamic_concurrency.hard_cost_cap_eur, 100);
  assert.equal(heartbeat.repo_sandbox_handler.status, 'DISABLED');
  assert.equal(heartbeat.prod_authorized, false);
  assert.equal(heartbeat.trading_access, false);
});

test('runtime accepts multiple PREPROD contexts with explicit governed routes', t => {
  const dir = tempDir(t);
  const contexts = [
    { company_id: 'fenix', engine_id: 'RUNTIME-001', environment: 'PREPROD', version: 'v1' },
    { company_id: 'aion', engine_id: 'ROUTE-001', environment: 'PREPROD', version: 'v1' },
  ];
  const routes = {
    'fenix|RUNTIME-001|PREPROD|v1': { pool: 'CPU', resource_key: 'fenix-runtime' },
    'aion|ROUTE-001|PREPROD|v1': { pool: 'MODEL', provider_id: 'deepseek', resource_key: 'deepseek' },
  };
  const result = run(dir, {
    CEREBRO_RUNTIME_CONTEXTS_JSON: JSON.stringify(contexts),
    CEREBRO_SCHEDULING_ROUTES_JSON: JSON.stringify(routes),
  }, ['--cycles', '1']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const heartbeat = JSON.parse(fs.readFileSync(path.join(dir, 'heartbeat.json'), 'utf8'));
  assert.equal(heartbeat.snapshot.context_count, 2);
});

test('missing route fails closed instead of silently running work in wrong pool', t => {
  const dir = tempDir(t);
  const contexts = [
    { company_id: 'fenix', engine_id: 'RUNTIME-001', environment: 'PREPROD', version: 'v1' },
    { company_id: 'aion', engine_id: 'ROUTE-001', environment: 'PREPROD', version: 'v1' },
  ];
  const incompleteRoutes = {
    'fenix|RUNTIME-001|PREPROD|v1': { pool: 'CPU', resource_key: 'fenix-runtime' },
  };
  const result = run(dir, {
    CEREBRO_RUNTIME_CONTEXTS_JSON: JSON.stringify(contexts),
    CEREBRO_SCHEDULING_ROUTES_JSON: JSON.stringify(incompleteRoutes),
  }, ['--cycles', '1']);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}\n${result.stdout}`, /SCHEDULING_ROUTE_MISSING/);
});

test('explicit lower override preserves lower global runtime without raising measured DeepSeek ceiling', t => {
  const dir = tempDir(t);
  const result = run(dir, { CEREBRO_MAX_CONCURRENCY: '128', CEREBRO_MAX_DEEPSEEK_CONCURRENCY: '8' }, ['--cycles', '1']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const heartbeat = JSON.parse(fs.readFileSync(path.join(dir, 'heartbeat.json'), 'utf8'));
  assert.equal(heartbeat.dynamic_concurrency.max_global_concurrency, 128);
  assert.equal(heartbeat.dynamic_concurrency.max_provider_concurrency.deepseek, 8);
});

test('repo sandbox opt-in adds FACT-001 durable lane routed through REPO_CI without enabling PROD', t => {
  const dir = tempDir(t);
  const result = run(dir, {
    CEREBRO_ENABLE_REPO_SANDBOX: 'YES',
    CEREBRO_REPO_SANDBOX_WORKSPACE_ROOT: dir,
    CEREBRO_REPO_SANDBOX_IMAGE: PINNED_IMAGE,
  }, ['--cycles', '1']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const heartbeat = JSON.parse(fs.readFileSync(path.join(dir, 'heartbeat.json'), 'utf8'));
  assert.equal(heartbeat.repo_sandbox_mode, 'ENABLED_EXPLICIT');
  assert.equal(heartbeat.repo_sandbox_handler.status, 'READY');
  assert.equal(heartbeat.repo_sandbox_handler.job_name, 'repo.sandbox.public.readonly.v0');
  assert.equal(heartbeat.snapshot.context_count, 2);
  assert.equal(heartbeat.prod_authorized, false);
  assert.equal(heartbeat.prod_write_authorized, false);
  assert.equal(heartbeat.trading_access, false);
});

test('repo sandbox explicit YES fails closed when runtime-owned workspace/image configuration is missing', t => {
  const dir = tempDir(t);
  const result = run(dir, { CEREBRO_ENABLE_REPO_SANDBOX: 'YES' }, ['--cycles', '1']);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}\n${result.stdout}`, /requires CEREBRO_REPO_SANDBOX_WORKSPACE_ROOT and CEREBRO_REPO_SANDBOX_IMAGE/);
});
