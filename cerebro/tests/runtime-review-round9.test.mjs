import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, JobQueue, FinOpsGate } from '../runtime/runtime.mjs';

const context = { company_id: 'fenix-capital', engine_id: 'APP-001', environment: 'PREPROD', version: '0.1.0' };

test('FinOps stays conservative when one ULP is already material at large amounts', () => {
  const ambiguous = new FinOpsGate({ additional_cost_budget_eur: 100_000_000.02 });
  const deniedNominalSum = ambiguous.authorize(100_000_000.01 + 0.01);
  assert.equal(deniedNominalSum.allowed, false);
  assert.equal(deniedNominalSum.human_required, 'MONEY_LIMIT');
  assert.equal(ambiguous.spent, 0);

  const over = new FinOpsGate({ additional_cost_budget_eur: 100_000_000 });
  const next = 100_000_000.00000001;
  assert(next > 100_000_000);
  const denied = over.authorize(next);
  assert.equal(denied.allowed, false);
  assert.equal(denied.human_required, 'MONEY_LIMIT');
  assert.equal(over.spent, 0);
});

test('FinOps still absorbs sub-micro floating noise where ULP is sufficiently fine', () => {
  const gate = new FinOpsGate({ additional_cost_budget_eur: 1000.3 });
  const result = gate.authorize(1000.1 + 0.2);
  assert.equal(result.allowed, true);
  assert.equal(gate.spent, 1000.3);
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

test('EVT/JOB reject CryptoKey uniformly before automatic id generation or persistence', async () => {
  if (!globalThis.crypto?.subtle || typeof CryptoKey === 'undefined') return;
  const keyA = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 128 }, true, ['encrypt', 'decrypt']);
  const keyB = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 128 }, true, ['encrypt', 'decrypt']);

  const bus = new EventBus();
  assert.throws(() => bus.publish({ type: 'KEY', payload: keyA, context }), /CryptoKey is not supported/);
  assert.throws(() => bus.publish({ type: 'KEY', payload: keyB, context, idempotency_key: 'explicit-key' }), /CryptoKey is not supported/);
  assert.equal(bus.listForContext(context).length, 0);

  const queue = new JobQueue();
  assert.throws(() => queue.enqueue({ name: 'key-job', payload: keyA, context }), /CryptoKey is not supported/);
  assert.throws(() => queue.enqueue({ name: 'key-job', payload: keyB, context, idempotency_key: 'explicit-key' }), /CryptoKey is not supported/);
  assert.equal(queue.claimContext(context), null);
});
