import test from 'node:test';
import assert from 'node:assert/strict';
import { JobQueue, SharedRuntime } from '../runtime/runtime.mjs';

const context = { company_id: 'fenix-capital', engine_id: 'APP-001', environment: 'PREPROD', version: '0.1.0' };

test('JOB automatic idempotency includes execution options', () => {
  const q = new JobQueue();
  const base = q.enqueue({ name: 'same-op', payload: { id: 1 }, context, priority: 100, max_attempts: 3, timeout_ms: 30000 });
  const priority = q.enqueue({ name: 'same-op', payload: { id: 1 }, context, priority: 1, max_attempts: 3, timeout_ms: 30000 });
  const attempts = q.enqueue({ name: 'same-op', payload: { id: 1 }, context, priority: 100, max_attempts: 4, timeout_ms: 30000 });
  const timeout = q.enqueue({ name: 'same-op', payload: { id: 1 }, context, priority: 100, max_attempts: 3, timeout_ms: 45000 });
  assert.equal(base.accepted, true);
  assert.equal(priority.accepted, true);
  assert.equal(attempts.accepted, true);
  assert.equal(timeout.accepted, true);
  assert.notEqual(base.job.idempotency_key, priority.job.idempotency_key);
  assert.notEqual(base.job.idempotency_key, attempts.job.idempotency_key);
  assert.notEqual(base.job.idempotency_key, timeout.job.idempotency_key);
  assert.equal(q.claimContext(context).priority, 1);
});

test('SharedRuntime preserves an unstringifiable thrown value and still audits ERROR', async () => {
  const thrown = Object.create(null);
  const runtime = new SharedRuntime();
  runtime.registerEngine({ engine_id: 'APP-001', version: '0.1.0', handler: () => { throw thrown; } });
  let caught;
  try {
    await runtime.execute({ company_id: 'fenix-capital', engine_id: 'APP-001', version: '0.1.0', command: 'throw-null-prototype' });
  } catch (error) {
    caught = error;
  }
  assert.strictEqual(caught, thrown);
  assert.equal(runtime.audit.length, 1);
  assert.equal(runtime.audit[0].outcome, 'ERROR');
  assert.equal(typeof runtime.audit[0].error, 'string');
  assert.ok(runtime.audit[0].error.length > 0);
});
