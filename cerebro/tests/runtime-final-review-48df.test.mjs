import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, FinOpsGate } from '../runtime/runtime.mjs';

const context = { company_id: 'fenix-capital', engine_id: 'APP-001', environment: 'PREPROD', version: '0.1.0' };

test('typed-view validation rejects own buffer accessor without executing it', () => {
  let reads = 0;
  const bytes = new Uint8Array([1,2,3]);
  Object.defineProperty(bytes, 'buffer', {
    configurable: true,
    get() { reads += 1; throw new Error('must not run'); }
  });
  const bus = new EventBus();
  assert.throws(
    () => bus.publish({ type: 'VIEW', payload: bytes, context, idempotency_key: 'view-accessor' }),
    /accessor properties are not supported/
  );
  assert.equal(reads, 0);
  assert.equal(bus.listForContext(context).length, 0);
});

test('FINOPS-001 tolerance stays bounded for large amounts and preserves conservative rounding', () => {
  const gate = new FinOpsGate({ additional_cost_budget_eur: 100_000_000 });
  const denied = gate.authorize(100_000_000 + 0.0000001);
  assert.equal(denied.allowed, false);
  assert.equal(denied.human_required, 'MONEY_LIMIT');

  const exact = new FinOpsGate({ additional_cost_budget_eur: 0.3 });
  assert.equal(exact.authorize(0.1 + 0.2).allowed, true);
});
