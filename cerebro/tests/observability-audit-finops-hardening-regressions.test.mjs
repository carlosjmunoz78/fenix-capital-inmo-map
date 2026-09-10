import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ObservabilityLedgerV0,
  AuditLedgerV0,
  CostLedgerV0,
  createOperationalLedgersV0
} from '../runtime/observability-audit-finops.mjs';

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-oaf-hardening-'));
}

test('explicit null environment is rejected by all ledger constructors and factory', () => {
  const root = tempRoot();
  assert.throws(() => new ObservabilityLedgerV0({ file_path:path.join(root, 'obs.v8'), environment:null }), /PREPROD/);
  assert.throws(() => new AuditLedgerV0({ file_path:path.join(root, 'audit.v8'), environment:null }), /PREPROD/);
  assert.throws(() => new CostLedgerV0({ file_path:path.join(root, 'finops.v8'), environment:null }), /PREPROD/);
  assert.throws(() => createOperationalLedgersV0({ root_dir:path.join(root, 'factory'), environment:null }), /PREPROD/);
});

test('non-enumerable array indices are rejected before persistence', () => {
  const root = tempRoot();
  const ledgers = createOperationalLedgersV0({ root_dir:root });
  const payload = [];
  Object.defineProperty(payload, '0', { value:{ secret:'must-not-degrade' }, enumerable:false, configurable:true, writable:true });
  assert.equal(Object.getOwnPropertyDescriptor(payload, '0').enumerable, false);
  assert.throws(
    () => ledgers.observability.record({
      context:{ company_id:'fenix', engine_id:'OBSERV-001', environment:'PREPROD', version:'0.1.0' },
      correlation_id:'corr-nonenumerable-array-index',
      message:'reject lossy array',
      data:payload
    }),
    /non-enumerable array indices/
  );
  assert.equal(ledgers.observability.operation_count, 0);
});
