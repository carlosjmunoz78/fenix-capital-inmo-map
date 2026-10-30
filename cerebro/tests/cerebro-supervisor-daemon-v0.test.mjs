import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DAEMON = new URL('../runtime/cerebro-supervisor-daemon-v0.mjs', import.meta.url);

function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-daemon-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function runDaemon(dir, extraEnv = {}, args = ['--enqueue-health-probe', '--cycles', '2']) {
  return spawnSync(process.execPath, [DAEMON.pathname, ...args], {
    encoding: 'utf8',
    timeout: 15_000,
    env: {
      ...process.env,
      CEREBRO_SUPERVISOR_STATE_DIR: dir,
      CEREBRO_SUPERVISOR_ENV: 'PREPROD',
      CEREBRO_IDLE_DELAY_MS: '0',
      CEREBRO_HEARTBEAT_MS: '25',
      // Baseline daemon tests isolate the base runtime contract.
      // Mission/NEURONAL autofill each have dedicated adapter/integration tests.
      CEREBRO_ENABLE_NEURONAL_AUTOFILL: 'NO',
      CEREBRO_ENABLE_MISSION_AUTOFILL: 'NO',
      // Tests must never inherit a live provider secret and accidentally spend money.
      CEREBRO_ENABLE_DEEPSEEK_WORK_PUMP: 'NO',
      DEEPSEEK_API_KEY: '',
      ...extraEnv,
    },
  });
}

test('daemon runs bounded PREPROD cycles, executes explicit health capability and writes sanitized adaptive heartbeat', t => {
  const dir = tempDir(t);
  const result = runDaemon(dir);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const heartbeat = JSON.parse(fs.readFileSync(path.join(dir, 'heartbeat.json'), 'utf8'));
  assert.equal(heartbeat.service, 'CEREBRO Continuous Supervisor');
  assert.equal(heartbeat.environment, 'PREPROD');
  assert.equal(heartbeat.prod_authorized, false);
  assert.equal(heartbeat.prod_write_authorized, false);
  assert.equal(heartbeat.trading_access, false);
  assert.equal(heartbeat.exited, true);
  assert.equal(heartbeat.work_pump_mode, 'DISABLED_EXPLICIT');
  assert.equal(heartbeat.work_pump.enabled, false);
  assert.equal(heartbeat.useful_work.scheduling_strategy, 'ADAPTIVE_USEFUL_THROUGHPUT');
  assert.equal(heartbeat.useful_work.starvation, false);
  assert.equal(fs.existsSync(path.join(dir, 'jobs.v8journal')), true);
});

test('default runtime exposes verified 180 global/company capacity while sensitive lanes stay bounded', t => {
  const dir = tempDir(t);
  const result = runDaemon(dir, {}, ['--cycles', '1']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const heartbeat = JSON.parse(fs.readFileSync(path.join(dir, 'heartbeat.json'), 'utf8'));
  assert.equal(heartbeat.dynamic_concurrency.max_global_concurrency, 180);
  assert.equal(heartbeat.dynamic_concurrency.max_company_concurrency, 180);
  assert.equal(heartbeat.dynamic_concurrency.target_global_concurrency, 180);
  assert.equal(heartbeat.dynamic_concurrency.max_provider_concurrency.deepseek, 8);
  assert.equal(heartbeat.dynamic_concurrency.max_repo_write_concurrency, 1);
});

test('explicit lower company limit remains available as a governed override', t => {
  const dir = tempDir(t);
  const result = runDaemon(dir, {
    CEREBRO_MAX_PER_COMPANY: '8',
    CEREBRO_INITIAL_CONCURRENCY: '8',
  }, ['--cycles', '1']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const heartbeat = JSON.parse(fs.readFileSync(path.join(dir, 'heartbeat.json'), 'utf8'));
  assert.equal(heartbeat.dynamic_concurrency.max_company_concurrency, 8);
  assert.equal(heartbeat.dynamic_concurrency.target_global_concurrency, 8);
});

test('daemon rejects PROD instead of silently widening authority', t => {
  const dir = tempDir(t);
  const result = runDaemon(dir, { CEREBRO_SUPERVISOR_ENV: 'PROD' }, ['--cycles', '1']);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}\n${result.stdout}`, /PREPROD-only/);
});

test('kill-switch file causes bounded daemon to stop with canonical local reason', t => {
  const dir = tempDir(t);
  fs.writeFileSync(path.join(dir, 'KILL_SWITCH'), 'stop\n');
  const result = runDaemon(dir, {}, ['--cycles', '3']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const heartbeat = JSON.parse(fs.readFileSync(path.join(dir, 'heartbeat.json'), 'utf8'));
  assert.equal(heartbeat.kill_switch_present, true);
  assert.equal(heartbeat.snapshot.enabled, false);
  assert.equal(heartbeat.snapshot.stop_reason, 'KILL_SWITCH_FILE');
});

test('explicit work-pump enable fails closed without DeepSeek secret', t => {
  const dir = tempDir(t);
  const result = runDaemon(dir, {
    CEREBRO_ENABLE_DEEPSEEK_WORK_PUMP: 'YES',
    DEEPSEEK_API_KEY: '',
  }, ['--cycles', '1']);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}\n${result.stdout}`, /requires DEEPSEEK_API_KEY/);
});

test('AUTO without provider secret stays disabled and cannot create paid work', t => {
  const dir = tempDir(t);
  const result = runDaemon(dir, {
    CEREBRO_ENABLE_DEEPSEEK_WORK_PUMP: 'AUTO',
    DEEPSEEK_API_KEY: '',
  }, ['--cycles', '1']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const heartbeat = JSON.parse(fs.readFileSync(path.join(dir, 'heartbeat.json'), 'utf8'));
  assert.equal(heartbeat.work_pump_mode, 'AUTO_NO_KEY');
  assert.equal(heartbeat.work_pump.enabled, false);
  assert.equal(heartbeat.deepseek_agent_handler.reserved_spend_eur, 0);
  assert.equal(heartbeat.deepseek_budget.reserved_projected_eur, 0);
  assert.equal(heartbeat.deepseek_budget.reservation_count, 0);
  assert.equal(heartbeat.deepseek_budget.auto_recharge, false);
});
