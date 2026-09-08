import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, JobQueue } from '../runtime/runtime.mjs';

const context = { company_id: 'fenix-capital', engine_id: 'APP-001', environment: 'PREPROD', version: '0.1.0' };
const invalidPayloadError = /clone|DataCloneError|could not be cloned|unsupported object type/i;

test('EVT-001 does not reserve idempotency key when payload validation fails', () => {
  const bus = new EventBus();
  assert.throws(() => bus.publish({ type: 'ATOMIC', payload: { bad: () => true }, context, idempotency_key: 'atomic-event' }), invalidPayloadError);
  const retry = bus.publish({ type: 'ATOMIC', payload: { ok: true }, context, idempotency_key: 'atomic-event' });
  assert.equal(retry.accepted, true);
  assert.equal(retry.duplicate, false);
  assert.equal(bus.listForContext(context).length, 1);
});

test('JOB-001 does not reserve idempotency key when payload validation fails', () => {
  const q = new JobQueue();
  assert.throws(() => q.enqueue({ name: 'atomic-job', payload: { bad: () => true }, context, idempotency_key: 'atomic-job-key' }), invalidPayloadError);
  const retry = q.enqueue({ name: 'atomic-job', payload: { ok: true }, context, idempotency_key: 'atomic-job-key' });
  assert.equal(retry.accepted, true);
  assert.equal(retry.duplicate, false);
  assert.equal(q.claimContext(context).name, 'atomic-job');
});

test('JOB-001 completion remains RUNNING if result validation fails', () => {
  const q = new JobQueue();
  q.enqueue({ name: 'complete-atomic', context, idempotency_key: 'complete-atomic-key' });
  const claimed = q.claimContext(context);
  assert.throws(() => q.completeContext(claimed.job_id, context, { bad: () => true }), invalidPayloadError);
  const completed = q.completeContext(claimed.job_id, context, { ok: true });
  assert.equal(completed.status, 'SUCCEEDED');
  assert.deepEqual(completed.result, { ok: true });
});
