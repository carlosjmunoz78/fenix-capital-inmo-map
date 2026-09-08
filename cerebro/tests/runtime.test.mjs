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

test('EVT-001 idempotency is scoped by full context and tenant isolated', () => {
  const bus = new EventBus();
  const first = bus.publish({ type: 'LEAD_CREATED', payload: { lead_id: 1 }, context, idempotency_key: 'same-key' });
  const duplicate = bus.publish({ type: 'LEAD_CREATED', payload: { lead_id: 1 }, context, idempotency_key: 'same-key' });
  const otherTenant = bus.publish({ type: 'LEAD_CREATED', payload: { lead_id: 2 }, context: { ...context, company_id: 'other-company' }, idempotency_key: 'same-key' });
  const otherEngine = bus.publish({ type: 'LEAD_CREATED', payload: { lead_id: 3 }, context: { ...context, engine_id: 'CRM-001' }, idempotency_key: 'same-key' });
  assert.equal(first.accepted, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(otherTenant.accepted, true);
  assert.equal(otherEngine.accepted, true);
  assert.equal(bus.listForContext(context).length, 1);
  assert.equal(bus.listForCompany('other-company').length, 1);
});

test('EVT-001 never exposes mutable internal event state', () => {
  const bus = new EventBus();
  const published = bus.publish({ type: 'SAFE', payload: { nested: { value: 1 } }, context, idempotency_key: 'mutable-event' });
  published.event.context.company_id = 'other-company';
  published.event.payload.nested.value = 999;
  published.event.status = 'CORRUPTED';
  const stored = bus.listForContext(context);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].context.company_id, 'fenix-capital');
  assert.equal(stored[0].payload.nested.value, 1);
  assert.equal(stored[0].status, 'PENDING');
  assert.equal(bus.listForCompany('other-company').length, 0);
});

test('JOB-001 supports priority, retries, context-scoped idempotency and isolation', () => {
  const q = new JobQueue();
  q.enqueue({ name: 'low', context, priority: 100, idempotency_key: 'a' });
  q.enqueue({ name: 'high', context, priority: 1, max_attempts: 2, idempotency_key: 'same-key' });
  assert.equal(q.enqueue({ name: 'high', context, priority: 1, idempotency_key: 'same-key' }).duplicate, true);
  assert.equal(q.enqueue({ name: 'high', context: { ...context, company_id: 'other-company' }, priority: 1, idempotency_key: 'same-key' }).accepted, true);
  assert.equal(q.enqueue({ name: 'high', context: { ...context, engine_id: 'CRM-001' }, priority: 1, idempotency_key: 'same-key' }).accepted, true);
  const claimed = q.claimContext(context);
  assert.equal(claimed.name, 'high');
  const retried = q.failContext(claimed.job_id, context, 'temporary');
  assert.equal(retried.status, 'QUEUED');
  const claimedAgain = q.claimContext(context);
  const failed = q.failContext(claimedAgain.job_id, context, 'permanent');
  assert.equal(failed.status, 'FAILED');
  const otherClaim = q.claimContext({ ...context, company_id: 'other-company' });
  assert.equal(otherClaim.context.company_id, 'other-company');
});

test('JOB-001 never exposes mutable internal queued state', () => {
  const q = new JobQueue();
  const enqueued = q.enqueue({ name: 'immutable-return', context, payload: { nested: { value: 1 } }, priority: 5, max_attempts: 2, idempotency_key: 'mutable-job' });
  enqueued.job.context.company_id = 'other-company';
  enqueued.job.payload.nested.value = 999;
  enqueued.job.status = 'SUCCEEDED';
  enqueued.job.attempts = 99;
  enqueued.job.max_attempts = 99;
  assert.equal(q.claimContext({ ...context, company_id: 'other-company' }), null);
  const claimed = q.claimContext(context);
  assert.equal(claimed.context.company_id, 'fenix-capital');
  assert.equal(claimed.payload.nested.value, 1);
  assert.equal(claimed.status, 'RUNNING');
  assert.equal(claimed.attempts, 1);
  assert.equal(claimed.max_attempts, 2);
});

test('FINOPS-001 defaults to zero additional spend and emits MONEY_LIMIT', () => {
  const gate = new FinOpsGate();
  assert.equal(gate.authorize(0).allowed, true);
  const denied = gate.authorize(0.01);
  assert.equal(denied.allowed, false);
  assert.equal(denied.human_required, 'MONEY_LIMIT');
});

test('FINOPS-001 rejects non-finite budgets and costs without poisoning state', () => {
  assert.throws(() => new FinOpsGate({ additional_cost_budget_eur: NaN }), /finite non-negative/);
  assert.throws(() => new FinOpsGate({ additional_cost_budget_eur: Infinity }), /finite non-negative/);
  const gate = new FinOpsGate();
  assert.throws(() => gate.authorize(NaN), /finite non-negative/);
  assert.throws(() => gate.authorize(Infinity), /finite non-negative/);
  assert.equal(gate.authorize(0).allowed, true);
  assert.equal(gate.authorize(0.01).allowed, false);
});

test('SharedRuntime executes registered engines without giving them prod writes', async () => {
  const runtime = new SharedRuntime();
  runtime.registerEngine({
    engine_id: 'APP-001', version: '0.1.0',
    handler: ({ events }) => {
      events.publish({ type: 'APP_READ_AUDITED', payload: { ok: true } });
      return { ok: true };
    }
  });
  assert.throws(() => runtime.registerEngine({ engine_id: 'BAD-001', version: '0.1.0', handler: () => ({}), prod_writes: true }), /forbids PROD writes/);
  const result = await runtime.execute({ company_id: 'fenix-capital', engine_id: 'APP-001', version: '0.1.0', command: 'health.read', cost_eur: 0 });
  assert.equal(result.status, 'OK');
  assert.equal(runtime.audit.length, 1);
  assert.equal(runtime.events.listForContext(context).length, 1);
});

test('SharedRuntime handler receives tenant-bound facades only', async () => {
  const runtime = new SharedRuntime();
  runtime.registerEngine({
    engine_id: 'APP-001', version: '0.1.0',
    handler: ({ events, jobs }) => {
      assert.equal(typeof events.listForCompany, 'undefined');
      assert.equal(typeof jobs.claimContext, 'undefined');
      const eventReturn = events.publish({ type: 'SAFE_EVENT', payload: { company_id: 'other-company' }, context: { ...context, company_id: 'other-company' } });
      const jobReturn = jobs.enqueue({ name: 'safe-job', payload: { company_id: 'other-company' }, context: { ...context, company_id: 'other-company' } });
      eventReturn.event.context.company_id = 'other-company';
      jobReturn.job.context.company_id = 'other-company';
      jobReturn.job.status = 'SUCCEEDED';
      return { events: events.list(), job: jobs.claim() };
    }
  });
  const result = await runtime.execute({ company_id: 'fenix-capital', engine_id: 'APP-001', version: '0.1.0', command: 'facade' });
  assert.equal(result.result.events.length, 1);
  assert.equal(result.result.events[0].context.company_id, 'fenix-capital');
  assert.equal(result.result.job.context.company_id, 'fenix-capital');
  assert.equal(result.result.job.status, 'RUNNING');
  assert.equal(runtime.events.listForCompany('other-company').length, 0);
  assert.equal(runtime.jobs.claimContext({ ...context, company_id: 'other-company' }), null);
});

test('RUNTIME-001 V0 refuses PROD environment entirely', () => {
  assert.throws(() => new SharedRuntime({ environment: 'PROD' }), /cannot run with PROD context/);
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
