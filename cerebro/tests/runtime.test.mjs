import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventBus, JobQueue, FinOpsGate, SharedRuntime, RUNTIME_V0_CONTRACT } from '../runtime/runtime.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const context = { company_id: 'fenix-capital', engine_id: 'APP-001', environment: 'PREPROD', version: '0.1.0' };

test('RUNTIME-001 V0 is shared, zero-cost and forbids prod writes', () => {
  assert.equal(RUNTIME_V0_CONTRACT.engine_id, 'RUNTIME-001');
  assert.equal(RUNTIME_V0_CONTRACT.shared_workers, true);
  assert.equal(RUNTIME_V0_CONTRACT.prod_writes, false);
  assert.equal(RUNTIME_V0_CONTRACT.additional_cost_target_eur, 0);
  assert.equal(RUNTIME_V0_CONTRACT.cross_company_access, 'deny');
});

test('EVT-001 idempotency is scoped per company and tenant isolated', () => {
  const bus = new EventBus();
  const first = bus.publish({ type: 'LEAD_CREATED', payload: { lead_id: 1 }, context, idempotency_key: 'same-key' });
  const duplicate = bus.publish({ type: 'LEAD_CREATED', payload: { lead_id: 1 }, context, idempotency_key: 'same-key' });
  const otherTenant = bus.publish({ type: 'LEAD_CREATED', payload: { lead_id: 2 }, context: { ...context, company_id: 'other-company' }, idempotency_key: 'same-key' });
  assert.equal(first.accepted, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(otherTenant.accepted, true);
  assert.equal(bus.listForCompany('fenix-capital').length, 1);
  assert.equal(bus.listForCompany('other-company').length, 1);
});

test('JOB-001 supports priority, retries, tenant-scoped idempotency and isolation', () => {
  const q = new JobQueue();
  q.enqueue({ name: 'low', context, priority: 100, idempotency_key: 'a' });
  q.enqueue({ name: 'high', context, priority: 1, max_attempts: 2, idempotency_key: 'same-key' });
  assert.equal(q.enqueue({ name: 'high', context, priority: 1, idempotency_key: 'same-key' }).duplicate, true);
  assert.equal(q.enqueue({ name: 'high', context: { ...context, company_id: 'other-company' }, priority: 1, idempotency_key: 'same-key' }).accepted, true);
  const claimed = q.claim('fenix-capital');
  assert.equal(claimed.name, 'high');
  const retried = q.fail(claimed.job_id, 'fenix-capital', 'temporary');
  assert.equal(retried.status, 'QUEUED');
  const claimedAgain = q.claim('fenix-capital');
  const failed = q.fail(claimedAgain.job_id, 'fenix-capital', 'permanent');
  assert.equal(failed.status, 'FAILED');
  const otherClaim = q.claim('other-company');
  assert.equal(otherClaim.context.company_id, 'other-company');
});

test('FINOPS-001 defaults to zero additional spend and emits MONEY_LIMIT', () => {
  const gate = new FinOpsGate();
  assert.equal(gate.authorize(0).allowed, true);
  const denied = gate.authorize(0.01);
  assert.equal(denied.allowed, false);
  assert.equal(denied.human_required, 'MONEY_LIMIT');
});

test('SharedRuntime executes registered engines without giving them prod writes', async () => {
  const runtime = new SharedRuntime();
  runtime.registerEngine({
    engine_id: 'APP-001', version: '0.1.0',
    handler: ({ context: ctx, events }) => {
      events.publish({ type: 'APP_READ_AUDITED', context: ctx, payload: { ok: true } });
      return { ok: true };
    }
  });
  assert.throws(() => runtime.registerEngine({ engine_id: 'BAD-001', version: '0.1.0', handler: () => ({}), prod_writes: true }), /forbids PROD writes/);
  const result = await runtime.execute({ company_id: 'fenix-capital', engine_id: 'APP-001', version: '0.1.0', command: 'health.read', cost_eur: 0 });
  assert.equal(result.status, 'OK');
  assert.equal(runtime.audit.length, 1);
  assert.equal(runtime.events.listForCompany('fenix-capital').length, 1);
});

test('SharedRuntime propagates canonical HUMAN_REQUIRED and audits it', async () => {
  const runtime = new SharedRuntime();
  runtime.registerEngine({ engine_id: 'APP-001', version: '0.1.0', handler: () => ({ status: 'HUMAN_REQUIRED', reason: 'HIGH_RISK' }) });
  const result = await runtime.execute({ company_id: 'fenix-capital', engine_id: 'APP-001', version: '0.1.0', command: 'sensitive' });
  assert.equal(result.status, 'HUMAN_REQUIRED');
  assert.equal(result.reason, 'HIGH_RISK');
  assert.equal(runtime.audit[0].outcome, 'HUMAN_REQUIRED');
});

test('SharedRuntime rejects non-canonical HUMAN_REQUIRED reasons', async () => {
  const runtime = new SharedRuntime();
  runtime.registerEngine({ engine_id: 'APP-001', version: '0.1.0', handler: () => ({ status: 'HUMAN_REQUIRED', reason: 'OTHER' }) });
  await assert.rejects(() => runtime.execute({ company_id: 'fenix-capital', engine_id: 'APP-001', version: '0.1.0', command: 'x' }), /invalid HUMAN_REQUIRED reason/);
});

test('SharedRuntime audits FinOps denials', async () => {
  const runtime = new SharedRuntime();
  runtime.registerEngine({ engine_id: 'APP-001', version: '0.1.0', handler: () => ({ ok: true }) });
  const result = await runtime.execute({ company_id: 'fenix-capital', engine_id: 'APP-001', version: '0.1.0', command: 'paid', cost_eur: 0.01 });
  assert.equal(result.status, 'HUMAN_REQUIRED');
  assert.equal(result.reason, 'MONEY_LIMIT');
  assert.equal(runtime.audit[0].outcome, 'HUMAN_REQUIRED');
});

test('phase 2 bindings cover exactly the nine canonical existing-engine targets and never enable writes', () => {
  const bindings = JSON.parse(fs.readFileSync(path.join(root, 'registry', 'existing-engine-bindings.json'), 'utf8'));
  const expected = ['CORE-001','SUP-001','TRN-001','APP-001','CRM-001','DOC-001','SEO-001','WEB-001','LAB-TRD'].sort();
  assert.deepEqual(bindings.engines.map(e => e.engine_id).sort(), expected);
  assert.equal(bindings.prod_execution_enabled, false);
  assert.equal(new Set(bindings.engines.map(e => e.engine_id)).size, 9);
  for (const engine of bindings.engines) assert.match(engine.binding_state, /READ_ONLY|REQUIRES_LIVE_AUDIT|ISOLATED/);
});

test('phase 3 zero-cost platform covers all canonical targets', () => {
  const p = JSON.parse(fs.readFileSync(path.join(root, 'registry', 'zero-cost-platform.json'), 'utf8'));
  const expected = ['RUNTIME-001','EVT-001','JOB-001','DBOFF-001','STOROFF-001','FREE-001','FINOPS-001','AIBUD-001'].sort();
  assert.deepEqual(Object.keys(p.engines).sort(), expected);
  assert.equal(p.additional_cost_target_eur, 0);
  assert.equal(p.prod_promotion, false);
});
