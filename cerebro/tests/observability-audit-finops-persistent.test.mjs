import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ObservabilityLedgerV0, AuditLedgerV0, CostLedgerV0, createOperationalLedgersV0, OPERATIONAL_LEDGERS_V0_CONTRACT } from '../runtime/observability-audit-finops.mjs';

const ctx = { company_id:'fenix', engine_id:'SEO-001', environment:'PREPROD', version:'0.1.0' };

function tempRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-oaf-')); }

test('contract preserves PREPROD, App/web, Supabase, Trading and autonomy boundaries', () => {
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.environment, 'PREPROD');
  assert.deepEqual([...OPERATIONAL_LEDGERS_V0_CONTRACT.engines].sort(), ['AUD-001','FINOPS-001','OBSERV-001']);
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.additional_cost_target_eur, 0);
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.supabase_required, false);
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.shared_runtime_replaced, false);
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.app_or_web_writes, false);
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.trading_access, false);
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.prod_writes, false);
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.autonomous_prod, false);
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.single_writer_reference, true);
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.internal_mutable_state, 'module-private-weakmap-with-non-exported-commit-path');
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.accepted_payload_grammar, 'finite-json-like-primitives+arrays+plain-data-objects-no-accessors-no-cycles');
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.audit_when, 'canonical-iso8601-utc-instant-hash-covered');
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.audit_reason, 'strict-string-or-null-no-coercion');
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.cost_precision, 'micro-eur-safe-integer-with-ulp-aware-scaled-tolerance-and-number-resolution-bound');
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.micro_rounding_tolerance_cap, 0.125);
  assert.equal(OPERATIONAL_LEDGERS_V0_CONTRACT.aggregate_cost_precision, 'reject-number-aggregate-if-micro-eur-roundtrip-is-not-exact');
  assert.ok(OPERATIONAL_LEDGERS_V0_CONTRACT.max_reliable_cost_eur < 9_000_000_000);
});

test('observability persists correlation-scoped records across restart with tenant isolation', () => {
  const root = tempRoot(); const file = path.join(root, 'obs.v8');
  const a = new ObservabilityLedgerV0({ file_path:file });
  a.record({ context:ctx, correlation_id:'corr-1', level:'INFO', message:'started', data:{ n:1 } });
  a.record({ context:{...ctx, company_id:'other'}, correlation_id:'corr-1', level:'WARN', message:'other tenant' });
  const b = new ObservabilityLedgerV0({ file_path:file });
  assert.equal(b.listForContext(ctx).length, 1);
  assert.equal(b.listForCorrelation('fenix','corr-1').length, 1);
  assert.equal(b.listForCorrelation('other','corr-1').length, 1);
});

test('audit persists canonical append-only hash chain including when and detects journal-level mutation on reopen', () => {
  const root = tempRoot(); const file = path.join(root, 'audit.v8');
  const a = new AuditLedgerV0({ file_path:file });
  const first = a.append({ context:ctx, correlation_id:'corr-a', occurred_at:'2026-09-09T11:00:00.000Z', actor:'system', action:'EVALUATE', target:{id:'x'}, before:null, after:{ok:true}, reason:'policy', result:'ALLOWED' });
  const second = a.append({ context:ctx, correlation_id:'corr-a', occurred_at:'2026-09-09T11:00:01.000Z', actor:'system', action:'WRITE', target:{id:'x'}, before:{ok:true}, after:{ok:false}, result:'DENIED' });
  assert.equal(first.occurred_at, '2026-09-09T11:00:00.000Z');
  assert.equal(second.occurred_at, '2026-09-09T11:00:01.000Z');
  assert.equal(first.previous_hash, null);
  assert.equal(second.previous_hash, first.record_hash);
  assert.deepEqual(a.verify(), { valid:true, records:2, last_hash:second.record_hash });
  const b = new AuditLedgerV0({ file_path:file });
  assert.equal(b.verify().records, 2);
  assert.equal(b.listForCompany('fenix').length, 2);
  assert.equal(b.list()[0].occurred_at, first.occurred_at);
  assert.throws(() => a.append({ context:ctx, correlation_id:'bad-time', occurred_at:'not-a-time', actor:'system', action:'X', result:'DENIED' }), /ISO-8601/);
  const bytes = fs.readFileSync(file);
  bytes[Math.floor(bytes.length / 2)] ^= 0x01;
  fs.writeFileSync(file, bytes);
  assert.throws(() => new AuditLedgerV0({ file_path:file }), /checksum|decode|audit/i);
});

test('audit rejects non-textual reason without coercion or caller code execution', () => {
  const root = tempRoot(); const file = path.join(root, 'audit-reason.v8');
  const ledger = new AuditLedgerV0({ file_path:file });
  let toStringCalls = 0;
  const reason = { code:'POLICY', toString() { toStringCalls += 1; return 'POLICY'; } };
  assert.throws(() => ledger.append({ context:ctx, correlation_id:'reason-bad', occurred_at:'2026-09-09T11:01:00.000Z', actor:'system', action:'DENY', reason, result:'DENIED' }), /reason must be null or string/);
  assert.equal(toStringCalls, 0);
  assert.equal(ledger.operation_count, 0);
  const accepted = ledger.append({ context:ctx, correlation_id:'reason-ok', occurred_at:'2026-09-09T11:01:01.000Z', actor:'system', action:'DENY', reason:'POLICY_CONFLICT', result:'DENIED' });
  assert.equal(accepted.reason, 'POLICY_CONFLICT');
});

test('finops persists exact micro-euro events and aggregates by company engine and provider', () => {
  const root = tempRoot(); const file = path.join(root, 'finops.v8');
  const a = new CostLedgerV0({ file_path:file });
  a.record({ context:ctx, correlation_id:'corr-c1', task_id:'task-1', provider:'LOCAL', cost_eur:0 });
  a.record({ context:ctx, correlation_id:'corr-c2', task_id:'task-2', provider:'API-X', cost_eur:0.125001 });
  a.record({ context:{...ctx, engine_id:'WEB-001'}, correlation_id:'corr-c3', task_id:'task-3', provider:'API-X', cost_eur:0.25 });
  const ordinary = a.record({ context:ctx, correlation_id:'corr-c4', task_id:'task-4', provider:'LOCAL', cost_eur:17000.51 });
  assert.equal(ordinary.cost_eur_micros, 17_000_510_000);
  const b = new CostLedgerV0({ file_path:file });
  assert.deepEqual(b.aggregate({company_id:'fenix', engine_id:'SEO-001', provider:'API-X'}), { company_id:'fenix', engine_id:'SEO-001', provider:'API-X', events:1, cost_eur:0.125001, cost_eur_micros:125001 });
  assert.deepEqual(b.aggregate({company_id:'fenix', provider:'API-X'}), { company_id:'fenix', engine_id:null, provider:'API-X', events:2, cost_eur:0.375001, cost_eur_micros:375001 });
  assert.throws(() => a.record({ context:ctx, correlation_id:'bad', task_id:'bad', cost_eur:0.0000001 }), /micro-euro/);
  assert.throws(() => a.record({ context:ctx, correlation_id:'too-large', task_id:'too-large', cost_eur:9_000_000_000.000001 }), /reliable micro-euro Number precision/);
  assert.equal(a.operation_count, 4);
});

test('finops aggregate rejects a Number result that cannot round-trip exact micro-euros', () => {
  const root = tempRoot(); const file = path.join(root, 'finops-aggregate-bound.v8');
  const ledger = new CostLedgerV0({ file_path:file });
  ledger.record({ context:ctx, correlation_id:'large-1', task_id:'large-1', cost_eur:4_503_599_626 });
  ledger.record({ context:ctx, correlation_id:'large-2', task_id:'large-2', cost_eur:4_503_599_626.000001 });
  assert.equal(ledger.operation_count, 2);
  assert.throws(() => ledger.aggregate({ company_id:'fenix' }), /aggregated cost exceeds reliable micro-euro Number precision/);
  const reopened = new CostLedgerV0({ file_path:file });
  assert.equal(reopened.operation_count, 2);
  assert.throws(() => reopened.aggregate({ company_id:'fenix' }), /aggregated cost exceeds reliable micro-euro Number precision/);
});

test('all ledgers reject PROD context before persistence', () => {
  const root = tempRoot();
  const ledgers = createOperationalLedgersV0({ root_dir:root });
  const prod = {...ctx, environment:'PROD'};
  assert.throws(() => ledgers.observability.record({ context:prod, correlation_id:'x', message:'x' }), /PREPROD/);
  assert.throws(() => ledgers.audit.append({ context:prod, correlation_id:'x', actor:'x', action:'x', result:'x' }), /PREPROD/);
  assert.throws(() => ledgers.finops.record({ context:prod, correlation_id:'x', task_id:'x', cost_eur:0 }), /PREPROD/);
  assert.equal(ledgers.observability.operation_count, 0);
  assert.equal(ledgers.audit.operation_count, 0);
  assert.equal(ledgers.finops.operation_count, 0);
});

test('caller mutation after accepted records cannot rewrite persisted history', () => {
  const root = tempRoot();
  const ledgers = createOperationalLedgersV0({ root_dir:root });
  const data = { nested:{value:1} };
  const before = { amount:1 };
  const metadata = { provider_note:'initial' };
  ledgers.observability.record({ context:ctx, correlation_id:'m1', message:'m', data });
  ledgers.audit.append({ context:ctx, correlation_id:'m2', occurred_at:'2026-09-09T11:02:00.000Z', actor:'system', action:'A', before, result:'OK' });
  ledgers.finops.record({ context:ctx, correlation_id:'m3', task_id:'t', cost_eur:0, metadata });
  data.nested.value = 999; before.amount = 999; metadata.provider_note = 'mutated';
  const reopened = createOperationalLedgersV0({ root_dir:root });
  assert.equal(reopened.observability.list()[0].data.nested.value, 1);
  assert.equal(reopened.audit.list()[0].before.amount, 1);
  assert.equal(reopened.finops.list()[0].metadata.provider_note, 'initial');
});

test('public shadow or wrapper methods cannot reach the module-private commit path', () => {
  const root = tempRoot(); const file = path.join(root, 'audit-private.v8');
  const ledger = new AuditLedgerV0({ file_path:file });
  ledger.append({ context:ctx, correlation_id:'p1', occurred_at:'2026-09-09T11:03:00.000Z', actor:'system', action:'FIRST', result:'OK' });
  let captured = false;
  ledger.records = [];
  ledger.journal = { commit(){ throw new Error('must never run'); } };
  ledger.validator = () => true;
  ledger._commit = (...args) => { captured = args.length > 0; throw new Error('shadow _commit must never run'); };
  ledger.append({ context:ctx, correlation_id:'p2', occurred_at:'2026-09-09T11:03:01.000Z', actor:'system', action:'SECOND', result:'OK' });
  assert.equal(captured, false);
  assert.equal(ledger.operation_count, 2);
  const reopened = new AuditLedgerV0({ file_path:file });
  assert.equal(reopened.operation_count, 2);
  assert.equal(reopened.list()[0].action, 'FIRST');
  assert.equal(reopened.list()[1].action, 'SECOND');
});

test('ledger payload grammar rejects platform objects, accessors and cycles before persistence', () => {
  const root = tempRoot();
  const ledgers = createOperationalLedgersV0({ root_dir:root });
  assert.throws(() => ledgers.observability.record({ context:ctx, correlation_id:'u1', message:'bad-url', data:{ url:new URL('https://example.com') } }), /plain objects and arrays/);
  assert.throws(() => ledgers.audit.append({ context:ctx, correlation_id:'u2', occurred_at:'2026-09-09T11:04:00.000Z', actor:'system', action:'BAD', before:{ when:new Date() }, result:'DENIED' }), /plain objects and arrays/);
  assert.throws(() => ledgers.finops.record({ context:ctx, correlation_id:'u3', task_id:'bad', metadata:{ map:new Map([['x',1]]) } }), /plain objects and arrays/);
  const circular = {}; circular.self = circular;
  assert.throws(() => ledgers.observability.record({ context:ctx, correlation_id:'u4', message:'cycle', data:circular }), /circular/);
  let getterCalls = 0;
  const accessorPayload = {};
  Object.defineProperty(accessorPayload, 'changing', { enumerable:true, get() { getterCalls += 1; return getterCalls === 1 ? 1 : new URL('https://example.com'); } });
  assert.throws(() => ledgers.observability.record({ context:ctx, correlation_id:'u5', message:'accessor', data:accessorPayload }), /accessor properties/);
  assert.equal(getterCalls, 0);
  assert.equal(ledgers.observability.operation_count, 0);
  assert.equal(ledgers.audit.operation_count, 0);
  assert.equal(ledgers.finops.operation_count, 0);
});
