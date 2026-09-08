import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, JobQueue, FinOpsGate } from '../runtime/runtime.mjs';

const context = { company_id: 'fenix-capital', engine_id: 'APP-001', environment: 'PREPROD', version: '0.1.0' };

test('typed-array inherited buffer accessor is never executed', () => {
  let reads = 0;
  const view = new Uint8Array([1, 2, 3]);
  const proto = Object.create(Object.getPrototypeOf(view), {
    buffer: {
      configurable: true,
      get() {
        reads += 1;
        throw new Error('inherited buffer accessor executed');
      }
    }
  });
  Object.setPrototypeOf(view, proto);

  const bus = new EventBus();
  const published = bus.publish({ type: 'VIEW', payload: view, context, idempotency_key: 'view' });
  assert.equal(published.accepted, true);
  assert.equal(reads, 0);
  assert.deepEqual([...published.event.payload], [1, 2, 3]);

  const queue = new JobQueue();
  const enqueued = queue.enqueue({ name: 'view-job', payload: view, context, idempotency_key: 'view-job' });
  assert.equal(enqueued.accepted, true);
  assert.equal(reads, 0);
  assert.deepEqual([...enqueued.job.payload], [1, 2, 3]);
});

test('FinOps absorbs ordinary floating noise but not real sub-micro overage', () => {
  const normal = new FinOpsGate({ additional_cost_budget_eur: 1000.3 });
  const ordinary = normal.authorize(1000.1 + 0.2);
  assert.equal(ordinary.allowed, true);
  assert.equal(normal.spent, 1000.3);

  const large = new FinOpsGate({ additional_cost_budget_eur: 100_000_000 });
  const over = large.authorize(100_000_000 + 0.0000001);
  assert.equal(over.allowed, false);
  assert.equal(over.human_required, 'MONEY_LIMIT');
  assert.equal(large.spent, 0);
});
