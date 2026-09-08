import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, JobQueue, FinOpsGate } from '../runtime/runtime.mjs';

const context = { company_id: 'fenix-capital', engine_id: 'APP-001', environment: 'PREPROD', version: '0.1.0' };

test('FinOps accepts one-ULP nominal equality at large supported amounts but rejects real overage', () => {
  const equal = new FinOpsGate({ additional_cost_budget_eur: 100_000_000.02 });
  const allowed = equal.authorize(100_000_000.01 + 0.01);
  assert.equal(allowed.allowed, true);
  assert.equal(equal.spent, 100_000_000.02);

  const over = new FinOpsGate({ additional_cost_budget_eur: 100_000_000 });
  const denied = over.authorize(100_000_000 + 0.0000001);
  assert.equal(denied.allowed, false);
  assert.equal(denied.human_required, 'MONEY_LIMIT');
  assert.equal(over.spent, 0);
});

test('FinOps rejects magnitudes whose floating precision is too coarse for safe micro-euro accounting', () => {
  assert.throws(
    () => new FinOpsGate({ additional_cost_budget_eur: 1_000_000_000 }),
    /reliable monetary precision range|safe monetary range/
  );
});

test('EVT/JOB explicit idempotency keys must be immutable non-empty strings', () => {
  const mutableKey = { v: 1 };
  const bus = new EventBus();
  assert.throws(
    () => bus.publish({ type: 'SAFE', payload: { ok: true }, context, idempotency_key: mutableKey }),
    /idempotency_key must be a non-empty string/
  );
  assert.equal(bus.listForContext(context).length, 0);
  assert.equal(bus.publish({ type: 'SAFE', payload: { ok: true }, context, idempotency_key: 'safe-key' }).accepted, true);

  const queue = new JobQueue();
  assert.throws(
    () => queue.enqueue({ name: 'safe-job', payload: { ok: true }, context, idempotency_key: mutableKey }),
    /idempotency_key must be a non-empty string/
  );
  assert.equal(queue.claimContext(context), null);
  assert.equal(queue.enqueue({ name: 'safe-job', payload: { ok: true }, context, idempotency_key: 'safe-job-key' }).accepted, true);
  assert.equal(queue.claimContext(context).status, 'RUNNING');
});
