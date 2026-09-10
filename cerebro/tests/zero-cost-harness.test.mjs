import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ZeroCostRuntimeHarnessV0 } from '../runtime/zero-cost-harness.mjs';

const context = { company_id:'fenix', engine_id:'SEO-001', environment:'PREPROD', version:'0.1.0' };
const other = { ...context, company_id:'other' };

function files() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-harness-'));
  return { db:path.join(dir,'db.v8'), storage:path.join(dir,'storage.v8') };
}

function create() {
  const f = files();
  return { f, harness:new ZeroCostRuntimeHarnessV0({
    db_file_path:f.db,
    storage_file_path:f.storage,
    capabilities:[
      { capability_id:'local-llm', company_id:'fenix', engine_id:'SEO-001', version:'0.1.0', health:'AVAILABLE', cost_eur:0, capabilities:['reason'] }
    ]
  }) };
}

test('integration harness exposes zero-cost/no-Supabase/no-PROD contract', () => {
  const { harness } = create();
  assert.equal(harness.contract.additional_cost_target_eur, 0);
  assert.equal(harness.contract.supabase_preprod_required, false);
  assert.equal(harness.contract.prod_writes, false);
  assert.equal(harness.contract.autonomous_prod, false);
  assert.equal(harness.contract.trading_access, false);
});

test('integration harness records scoped route evidence and cost', () => {
  const { harness } = create();
  const result = harness.route({ context, options:[
    { option_id:'det', route_type:'deterministic', cost_eur:0, equivalent:true, provider:'rules' },
    { option_id:'paid', route_type:'paid_provider', cost_eur:1, equivalent:true, provider:'paid' }
  ]});
  assert.equal(result.route_type, 'deterministic');
  assert.equal(result.decision.incremental_cost_eur, 0);
  assert.equal(harness.decisions(context).length, 1);
  assert.equal(harness.decisions(other).length, 0);
});

test('integration harness backs up and restores both offload stores by scope', () => {
  const { harness } = create();
  harness.dboff.put({ context, key:'row', value:{v:1} });
  harness.storoff.put({ context, key:'asset', value:{path:'local/a'} });
  const backup = harness.backup(context);
  harness.dboff.put({ context, key:'row', value:{v:2} });
  harness.storoff.put({ context, key:'asset', value:{path:'local/b'} });
  harness.restore({ context, backup });
  assert.deepEqual(harness.dboff.get({ context, key:'row' }), {v:1});
  assert.deepEqual(harness.storoff.get({ context, key:'asset' }), {path:'local/a'});
  assert.throws(() => harness.restore({ context:other, backup }), /mismatch/);
});

test('integration harness fails closed outside PREPROD', () => {
  const f = files();
  assert.throws(() => new ZeroCostRuntimeHarnessV0({ db_file_path:f.db, storage_file_path:f.storage, environment:'PROD' }));
});
