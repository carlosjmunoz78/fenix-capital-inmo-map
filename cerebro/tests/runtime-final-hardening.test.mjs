import test from 'node:test';
import assert from 'node:assert/strict';
import { Blob } from 'node:buffer';
import { EventBus, JobQueue, FinOpsGate, SharedRuntime } from '../runtime/runtime.mjs';

const context = { company_id: 'fenix-capital', engine_id: 'APP-001', environment: 'PREPROD', version: '0.1.0' };

test('EVT/JOB reject Blob uniformly so automatic keys never lose Blob bytes', () => {
  const bus = new EventBus();
  assert.throws(() => bus.publish({ type: 'BLOB', payload: new Blob(['x']), context }), /Blob is not supported/);
  assert.throws(() => bus.publish({ type: 'BLOB', payload: new Blob(['y']), context, idempotency_key: 'explicit' }), /Blob is not supported/);
  assert.equal(bus.listForContext(context).length, 0);

  const q = new JobQueue();
  assert.throws(() => q.enqueue({ name: 'blob', payload: new Blob(['x']), context }), /Blob is not supported/);
  assert.throws(() => q.enqueue({ name: 'blob', payload: new Blob(['y']), context, idempotency_key: 'explicit' }), /Blob is not supported/);
  assert.equal(q.claimContext(context), null);
});

test('safe cloning rejects accessors before they can smuggle shared memory', async () => {
  if (typeof SharedArrayBuffer === 'undefined') return;
  let reads = 0;
  const payload = {};
  Object.defineProperty(payload, 'value', {
    enumerable: true,
    get() {
      reads += 1;
      return reads === 1 ? { ok: true } : new SharedArrayBuffer(8);
    }
  });
  const runtime = new SharedRuntime();
  runtime.registerEngine({ engine_id: 'APP-001', version: '0.1.0', handler: () => ({ ok: true }) });
  await assert.rejects(
    () => runtime.execute({ company_id: 'fenix-capital', engine_id: 'APP-001', version: '0.1.0', command: 'accessor', payload }),
    /accessor properties are not supported/
  );
  assert.equal(reads, 0);
});

test('SharedRuntime clones handler results and rejects shared-memory results', async () => {
  const retained = { nested: { value: 1 } };
  const runtime = new SharedRuntime();
  runtime.registerEngine({ engine_id: 'APP-001', version: '0.1.0', handler: () => retained });
  const response = await runtime.execute({ company_id: 'fenix-capital', engine_id: 'APP-001', version: '0.1.0', command: 'result' });
  retained.nested.value = 999;
  assert.equal(response.result.nested.value, 1);

  if (typeof SharedArrayBuffer !== 'undefined') {
    const blocked = new SharedRuntime();
    blocked.registerEngine({ engine_id: 'APP-001', version: '0.1.0', handler: () => new SharedArrayBuffer(8) });
    await assert.rejects(
      () => blocked.execute({ company_id: 'fenix-capital', engine_id: 'APP-001', version: '0.1.0', command: 'shared-result' }),
      /SharedArrayBuffer is not supported/
    );
  }
});

test('FINOPS-001 rounds positive sub-micro costs conservatively instead of to zero', () => {
  const zeroBudget = new FinOpsGate();
  const denied = zeroBudget.authorize(0.0000004);
  assert.equal(denied.allowed, false);
  assert.equal(denied.human_required, 'MONEY_LIMIT');

  const oneMicroBudget = new FinOpsGate({ additional_cost_budget_eur: 0.000001 });
  assert.equal(oneMicroBudget.authorize(0.0000004).allowed, true);
  assert.equal(oneMicroBudget.spent, 0.000001);
  assert.equal(oneMicroBudget.authorize(0.0000004).allowed, false);
});
