import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, JobQueue, FinOpsGate } from '../runtime/runtime.mjs';

const context = { company_id: 'fenix-capital', engine_id: 'APP-001', environment: 'PREPROD', version: '0.1.0' };

test('Map and Set validation uses intrinsic iteration without executing overridden accessors', () => {
  let mapReads = 0;
  const map = new Map([['x', { ok: true }]]);
  Object.defineProperty(map, Symbol.iterator, { configurable: true, get() { mapReads += 1; throw new Error('must not run'); } });
  const bus = new EventBus();
  assert.equal(bus.publish({ type: 'MAP', payload: map, context, idempotency_key: 'map-intrinsic' }).accepted, true);
  assert.equal(mapReads, 0);

  let setReads = 0;
  const set = new Set([{ ok: true }]);
  Object.defineProperty(set, Symbol.iterator, { configurable: true, get() { setReads += 1; throw new Error('must not run'); } });
  const q = new JobQueue();
  assert.equal(q.enqueue({ name: 'set', payload: set, context, idempotency_key: 'set-intrinsic' }).accepted, true);
  assert.equal(setReads, 0);
});

test('large typed arrays are treated as terminal built-ins and remain isolated', () => {
  const bytes = new Uint8Array(1024 * 1024);
  bytes[0] = 7;
  bytes[bytes.length - 1] = 9;
  const bus = new EventBus();
  const published = bus.publish({ type: 'BYTES', payload: bytes, context, idempotency_key: 'bytes' });
  assert.equal(published.accepted, true);
  bytes[0] = 99;
  const stored = bus.listForContext(context)[0].payload;
  assert.equal(stored[0], 7);
  assert.equal(stored[stored.length - 1], 9);
});

test('FINOPS-001 ignores floating-point representation noise but rounds real sub-micro costs upward', () => {
  const exactBudget = new FinOpsGate({ additional_cost_budget_eur: 0.3 });
  const nominalExact = exactBudget.authorize(0.1 + 0.2);
  assert.equal(nominalExact.allowed, true);
  assert.equal(nominalExact.remaining_eur, 0);

  const zeroBudget = new FinOpsGate();
  const realFraction = zeroBudget.authorize(0.0000004);
  assert.equal(realFraction.allowed, false);
  assert.equal(realFraction.human_required, 'MONEY_LIMIT');
});
