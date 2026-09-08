import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, JobQueue } from '../runtime/runtime.mjs';

const context = { company_id: 'fenix-capital', engine_id: 'APP-001', environment: 'PREPROD', version: '0.1.0' };

test('EVT/JOB reject exotic structured-clone objects uniformly', () => {
  if (typeof WebAssembly === 'undefined') return;
  const moduleA = new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0]));
  const moduleB = new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0,0,0,0,0]));
  const bus = new EventBus();
  assert.throws(() => bus.publish({ type: 'WASM', payload: moduleA, context }), /unsupported object type/);
  assert.throws(() => bus.publish({ type: 'WASM', payload: moduleB, context, idempotency_key: 'explicit' }), /unsupported object type/);
  assert.equal(bus.listForContext(context).length, 0);

  const queue = new JobQueue();
  assert.throws(() => queue.enqueue({ name: 'wasm', payload: moduleA, context }), /unsupported object type/);
  assert.throws(() => queue.enqueue({ name: 'wasm', payload: moduleB, context, idempotency_key: 'explicit' }), /unsupported object type/);
  assert.equal(queue.claimContext(context), null);
});

test('deterministic payload grammar still accepts plain data, arrays, Map, Set and typed bytes', () => {
  const bus = new EventBus();
  const payload = {
    plain: { ok: true },
    list: [1, 2, 3],
    map: new Map([['x', 1]]),
    set: new Set(['a', 'b']),
    bytes: new Uint8Array([1, 2, 3])
  };
  assert.equal(bus.publish({ type: 'SUPPORTED', payload, context }).accepted, true);
  assert.equal(bus.listForContext(context).length, 1);
});
