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
      ...extraEnv,
    },
  });
}

test('daemon runs bounded PREPROD cycles, executes explicit health capability and writes sanitized heartbeat', t => {
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
  assert.equal(fs.existsSync(path.join(dir, 'jobs.v8journal')), true);
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
