#!/usr/bin/env node
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { readJob001HostStatusV1, JOB001_HOST_STATUS_V1_CONTRACT } from './job001-host-status-v1.mjs';

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
  fail('JOB001_HOST_STATUS_COMMAND_UNSUPPORTED', new Error('supported commands: status, contract'));
} else if (command === 'contract') {
  process.stdout.write(`${JSON.stringify(JOB001_HOST_STATUS_V1_CONTRACT)}\n`);
} else {
  try {
    const root = path.resolve(
      process.env.CEREBRO_SUPERVISOR_STATE_DIR
      || path.join(os.homedir(), 'AppData', 'Local', 'CEREBRO', 'SupervisorRuntime'),
    );
    const companyId = process.env.CEREBRO_COMPANY_ID || 'fenix';
    const modelVersion = process.env.CEREBRO_WORK_PUMP_VERSION || 'work-pump-v3-adaptive';
    const status = readJob001HostStatusV1({
      state_dir: root,
      actor: {
        id: process.env.CEREBRO_CONTROL_PLANE_ACTOR || 'local-host-observer',
        scopes: scopes(),
      },
      expected_company_id: companyId,
      model_context: {
        company_id: companyId,
        engine_id: 'BOOST-001',
        environment: 'PREPROD',
        version: modelVersion,
      },
      max_age_ms: Number(process.env.CEREBRO_CONTROL_PLANE_MAX_HEARTBEAT_AGE_MS || 120_000),
    });
    process.stdout.write(`${JSON.stringify({ ok: true, ...status })}\n`);
  } catch (error) {
    fail('JOB001_HOST_STATUS_FAILED', error);
  }
}
