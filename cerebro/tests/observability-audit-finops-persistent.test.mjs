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

test('audit persists canonical append-only hash chain and detects journal-level mutation on reopen', () => {
  const root = tempRoot(); const file = path.join(root, 'audit.v8');
  const a = new AuditLedgerV0({ file_path:file });
  const first = a.append({ context:ctx, correlation_id:'corr-a', actor:'system', action:'EVALUATE', target:{id:'x'}, before:null, after:{ok:true}, reason:'policy', result:'ALLOWED' });
  const second = a.append({ context:ctx, correlation_id:'corr-a', actor:'system', action:'WRITE', target:{id:'x'}, before:{ok:true}, after:{ok:false}, result:'DENIED' });
  assert.equal(first.previous_hash, null);
  assert.equal(second.previous_hash, first.record_hash);
  assert.deepEqual(a.verify(), { valid:true, records:2, last_hash:second.record_hash });
  const b = new AuditLedgerV0({ file_path:file });
  assert.equal(b.verify().records, 2);
  assert.equal(b.listForCompany('fenix').length, 2);
  const bytes = fs.readFileSync(file);
  bytes[Math.floor(bytes.length / 2)] ^= 0x01;
  fs.writeFileSync(file, bytes);
  assert.throws(() => new AuditLedgerV0({ file_path:file }), /checksum|decode|audit/i);
});

test('finops persists exact micro-euro events and aggregates by company engine and provider', () => {
  const root = tempRoot(); const file = path.join(root, 'finops.v8');
  const a = new CostLedgerV0({ file_path:file });
  a.record({ context:ctx, correlation_id:'corr-c1', task_id:'task-1', provider:'LOCAL', cost_eur:0 });
  a.record({ context:ctx, correlation_id:'corr-c2', task_id:'task-2', provider:'API-X', cost_eur:0.125001 });
  a.record({ context:{...ctx, engine_id:'WEB-001'}, correlation_id:'corr-c3', task_id:'task-3', provider:'API-X', cost_eur:0.25 });
  const b = new CostLedgerV0({ file_path:file });
  assert.deepEqual(b.aggregate({company_id:'fenix', engine_id:'SEO-001'}), { company_id:'fenix', engine_id:'SEO-001', provider:null, events:2, cost_eur:0.125001, cost_eur_micros:125001 });
  assert.deepEqual(b.aggregate({company_id:'fenix', provider:'API-X'}), { company_id:'fenix', engine_id:null, provider:'API-X', events:2, cost_eur:0.375001, cost_eur_micros:375001 });
  assert.throws(() => a.record({ context:ctx, correlation_id:'bad', task_id:'bad', cost_eur:0.0000001 }), /micro-euro/);
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
  ledgers.audit.append({ context:ctx, correlation_id:'m2', actor:'system', action:'A', before, result:'OK' });
  ledgers.finops.record({ context:ctx, correlation_id:'m3', task_id:'t', cost_eur:0, metadata });
  data.nested.value = 999; before.amount = 999; metadata.provider_note = 'mutated';
  const reopened = createOperationalLedgersV0({ root_dir:root });
  assert.equal(reopened.observability.list()[0].data.nested.value, 1);
  assert.equal(reopened.audit.list()[0].before.amount, 1);
  assert.equal(reopened.finops.list()[0].metadata.provider_note, 'initial');
});
