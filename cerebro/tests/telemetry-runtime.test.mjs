import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PersistentAppendLedger,
  createTelemetryRuntime,
  TELEMETRY_RUNTIME_V0_CONTRACT
} from '../runtime/telemetry-runtime.mjs';

const ctxA = Object.freeze({ company_id: 'FENIX', engine_id: 'CORE-001', environment: 'PREPROD', version: '0.1.0' });
const ctxB = Object.freeze({ company_id: 'OTHER', engine_id: 'CORE-001', environment: 'PREPROD', version: '0.1.0' });
const at = '2026-09-09T11:00:00.000Z';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-telemetry-'));
}

test('telemetry V0 contract is PREPROD-only, zero-cost, parallel and non-autonomous', () => {
  assert.deepEqual(TELEMETRY_RUNTIME_V0_CONTRACT.engines, ['OBSERV-001', 'AUD-001', 'FINOPS-001']);
  assert.equal(TELEMETRY_RUNTIME_V0_CONTRACT.environment, 'PREPROD');
  assert.equal(TELEMETRY_RUNTIME_V0_CONTRACT.additional_cost_target_eur, 0);
  assert.equal(TELEMETRY_RUNTIME_V0_CONTRACT.supabase_required, false);
  assert.equal(TELEMETRY_RUNTIME_V0_CONTRACT.shared_runtime_replaced, false);
  assert.equal(TELEMETRY_RUNTIME_V0_CONTRACT.app_web_touched, false);
  assert.equal(TELEMETRY_RUNTIME_V0_CONTRACT.trading_access, false);
  assert.equal(TELEMETRY_RUNTIME_V0_CONTRACT.autonomous_prod, false);
  assert.equal(TELEMETRY_RUNTIME_V0_CONTRACT.prod_writes, false);
  assert.equal(TELEMETRY_RUNTIME_V0_CONTRACT.single_writer_reference, true);
});

test('OBSERV-001 persists, requires correlation_id and keeps tenant isolation after restart', () => {
  const directory = tempDir();
  const runtime = createTelemetryRuntime({ directory });
  const first = runtime.observability.append({
    context: ctxA,
    correlation_id: 'corr-1',
    occurred_at: at,
    signal: 'LOG',
    severity: 'INFO',
    name: 'runtime.started',
    data: { worker: 'w1' },
    idempotency_key: 'obs-1'
  });
  assert.equal(first.accepted, true);
  assert.equal(runtime.observability.listForCompany('FENIX').length, 1);
  assert.equal(runtime.observability.listForCompany('OTHER').length, 0);

  const duplicate = runtime.observability.append({
    context: ctxA,
    correlation_id: 'corr-changed',
    occurred_at: '2026-09-09T11:01:00.000Z',
    signal: 'ERROR',
    severity: 'ERROR',
    name: 'changed-but-same-idempotency',
    idempotency_key: 'obs-1'
  });
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.record.record_id, first.record.record_id);

  runtime.observability.append({
    context: ctxB,
    correlation_id: 'corr-2',
    occurred_at: at,
    signal: 'HEALTH',
    name: 'health.ok',
    idempotency_key: 'obs-1'
  });

  const restarted = createTelemetryRuntime({ directory });
  assert.equal(restarted.observability.listForCompany('FENIX').length, 1);
  assert.equal(restarted.observability.listForCompany('OTHER').length, 1);
  assert.equal(restarted.observability.operation_count, 2);
  assert.throws(() => restarted.observability.append({ context: ctxA, occurred_at: at, signal: 'LOG', name: 'missing-correlation' }), /correlation_id/);
});

test('AUD-001 is append-only reference with canonical audit fields and full-context isolation', () => {
  const directory = tempDir();
  const runtime = createTelemetryRuntime({ directory });
  const result = runtime.audit.append({
    context: ctxA,
    correlation_id: 'corr-audit-1',
    occurred_at: at,
    actor: 'cerebro',
    action: 'POLICY_EVALUATED',
    reason: 'policy-match',
    result: 'ALLOW',
    before: { state: 'PENDING' },
    after: { state: 'ALLOWED' },
    data: { source: 'PolicyEngine.auditLog' }
  });
  assert.equal(result.accepted, true);
  assert.equal(runtime.audit.listForContext(ctxA)[0].actor, 'cerebro');
  assert.equal(runtime.audit.listForContext({ ...ctxA, version: '0.2.0' }).length, 0);
  assert.throws(() => runtime.audit.append({ context: ctxA, correlation_id: 'x', occurred_at: at, actor: 'x', action: 'x', reason: 'x' }), /result/);

  const restarted = createTelemetryRuntime({ directory });
  assert.equal(restarted.audit.listForContext(ctxA).length, 1);
});

test('FINOPS-001 stores exact integer micro-euro events and aggregates per company', () => {
  const directory = tempDir();
  const runtime = createTelemetryRuntime({ directory });
  runtime.finops.append({
    context: ctxA,
    correlation_id: 'corr-cost-1',
    occurred_at: at,
    task_id: 'task-1',
    provider: 'local',
    category: 'COMPUTE',
    cost_micros: 0,
    savings_micros: 1500,
    idempotency_key: 'cost-1'
  });
  runtime.finops.append({
    context: ctxA,
    correlation_id: 'corr-cost-2',
    occurred_at: '2026-09-09T11:01:00.000Z',
    task_id: 'task-2',
    provider: 'existing-tool',
    category: 'API',
    cost_micros: 2500,
    savings_micros: 500,
    idempotency_key: 'cost-2'
  });
  runtime.finops.append({
    context: ctxB,
    correlation_id: 'corr-cost-3',
    occurred_at: at,
    task_id: 'task-3',
    provider: 'local',
    cost_micros: 9000,
    idempotency_key: 'cost-3'
  });

  assert.deepEqual(runtime.finops.aggregateForCompany('FENIX'), {
    company_id: 'FENIX',
    event_count: 2,
    total_cost_micros: '2500',
    total_savings_micros: '2000'
  });
  assert.throws(() => runtime.finops.append({ context: ctxA, correlation_id: 'bad', occurred_at: at, task_id: 't', provider: 'p', cost_micros: 1.2 }), /safe integer/);

  const restarted = createTelemetryRuntime({ directory });
  assert.equal(restarted.finops.aggregateForCompany('FENIX').total_cost_micros, '2500');
});

test('telemetry V0 rejects PROD and preserves Trading LAB isolation', () => {
  const directory = tempDir();
  assert.throws(() => createTelemetryRuntime({ directory, environment: 'PROD' }), /PREPROD/);
  const runtime = createTelemetryRuntime({ directory });
  assert.throws(() => runtime.observability.append({
    context: { company_id: 'FENIX', engine_id: 'LAB-TRD', environment: 'PREPROD', version: '0.1.0' },
    correlation_id: 'trade', occurred_at: at, signal: 'LOG', name: 'trade'
  }), /Trading LAB/);
});

test('telemetry journals fail closed on corruption or kind mismatch', () => {
  const directory = tempDir();
  const runtime = createTelemetryRuntime({ directory });
  runtime.audit.append({
    context: ctxA, correlation_id: 'corr', occurred_at: at,
    actor: 'cerebro', action: 'A', reason: 'R', result: 'OK'
  });
  fs.writeFileSync(runtime.audit.journal_path, Buffer.from('corrupt'));
  assert.throws(() => createTelemetryRuntime({ directory }), /cannot be decoded/);

  const other = tempDir();
  const obs = new PersistentAppendLedger({ kind: 'OBSERV-001', file_path: path.join(other, 'shared.v8journal') });
  obs.append({ context: ctxA, correlation_id: 'c', occurred_at: at, signal: 'LOG', name: 'n' });
  assert.throws(() => new PersistentAppendLedger({ kind: 'AUD-001', file_path: path.join(other, 'shared.v8journal') }), /kind mismatch/);
});

test('telemetry rejects accessors, cycles and non-canonical payload objects before persistence', () => {
  const directory = tempDir();
  const runtime = createTelemetryRuntime({ directory });
  const accessor = {};
  Object.defineProperty(accessor, 'secret', { enumerable: true, get() { throw new Error('getter executed'); } });
  assert.throws(() => runtime.observability.append({ context: ctxA, correlation_id: 'c1', occurred_at: at, signal: 'LOG', name: 'n', data: accessor }), /accessor properties/);
  const cycle = {}; cycle.self = cycle;
  assert.throws(() => runtime.observability.append({ context: ctxA, correlation_id: 'c2', occurred_at: at, signal: 'LOG', name: 'n', data: cycle }), /cyclic/);
  assert.equal(runtime.observability.operation_count, 0);
});
