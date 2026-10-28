#!/usr/bin/env node
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { readSupervisorHeartbeatV1, JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT } from './job001-ledger-control-plane-v1.mjs';

function scopes() {
  return String(process.env.CEREBRO_CONTROL_PLANE_SCOPES || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function fail(code, error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ ok: false, code, error: message })}\n`);
  process.exitCode = 1;
}

const command = process.argv[2] || 'status';
if (command !== 'status' && command !== 'contract') {
  fail('CONTROL_PLANE_COMMAND_UNSUPPORTED', new Error('supported commands: status, contract'));
} else if (command === 'contract') {
  process.stdout.write(`${JSON.stringify(JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT)}\n`);
} else {
  try {
    const root = path.resolve(process.env.CEREBRO_SUPERVISOR_STATE_DIR || path.join(os.homedir(), 'AppData', 'Local', 'CEREBRO', 'SupervisorRuntime'));
    const view = readSupervisorHeartbeatV1({
      heartbeat_file: path.join(root, 'heartbeat.json'),
      actor: { id: process.env.CEREBRO_CONTROL_PLANE_ACTOR || 'local-observer', scopes: scopes() },
      expected_company_id: process.env.CEREBRO_COMPANY_ID || 'fenix',
      max_age_ms: Number(process.env.CEREBRO_CONTROL_PLANE_MAX_HEARTBEAT_AGE_MS || 120_000),
    });
    process.stdout.write(`${JSON.stringify({ ok: true, ...view })}\n`);
  } catch (error) {
    fail('CONTROL_PLANE_STATUS_FAILED', error);
  }
}
