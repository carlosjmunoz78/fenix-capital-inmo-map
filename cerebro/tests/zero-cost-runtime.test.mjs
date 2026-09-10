import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  LocalCapabilityRegistry,
  FreeFirstBroker,
  LocalOffloadStore,
  BudgetModelRouterV0,
  createZeroCostRuntimeV0
} from '../runtime/zero-cost-runtime.mjs';

const context = { company_id:'fenix', engine_id:'SEO-001', environment:'PREPROD', version:'0.1.0' };
const other = { ...context, company_id:'other' };

function tmp(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-zero-cost-'));
  return path.join(dir, name);
}

test('LOCAL-001 selects deterministic zero-cost available capability and isolates tenants', () => {
  const registry = new LocalCapabilityRegistry([
    { capability_id:'b', company_id:'fenix', engine_id:'SEO-001', version:'0.1.0', priority:20, cost_eur:0, health:'AVAILABLE', capabilities:['extract'] },
    { capability_id:'a', company_id:'fenix', engine_id:'SEO-001', version:'0.1.0', priority:10, cost_eur:0, health:'AVAILABLE', capabilities:['extract'] },
    { capability_id:'paid', company_id:'fenix', engine_id:'SEO-001', version:'0.1.0', priority:1, cost_eur:1, health:'AVAILABLE', capabilities:['extract'] },
    { capability_id:'other', company_id:'other', engine_id:'SEO-001', version:'0.1.0', priority:1, cost_eur:0, health:'AVAILABLE', capabilities:['extract'] }
  ]);
  assert.equal(registry.select({ context, requires:['extract'] }).selected.capability_id, 'a');
  assert.equal(registry.list(other).some(x => x.capability_id === 'a'), false);
});

test('LOCAL-001 respects version and only allows explicit GLOBAL version fallback', () => {
  const registry = new LocalCapabilityRegistry([
    { capability_id:'old', company_id:'fenix', engine_id:'SEO-001', version:'0.0.9', cost_eur:0, capabilities:['extract'] },
    { capability_id:'global', company_id:'fenix', engine_id:'SEO-001', version:'GLOBAL', priority:20, cost_eur:0, capabilities:['extract'] },
    { capability_id:'current', company_id:'fenix', engine_id:'SEO-001', version:'0.1.0', priority:10, cost_eur:0, capabilities:['extract'] }
  ]);
  assert.equal(registry.select({ context, requires:['extract'] }).selected.capability_id, 'current');
  assert.equal(registry.list(context).some(x => x.capability_id === 'old'), false);
});

test('LOCAL-001 fails closed for degraded/paid/non-PREPROD or Proxy capability', () => {
  const registry = new LocalCapabilityRegistry([
    { capability_id:'d', company_id:'fenix', engine_id:'SEO-001', version:'0.1.0', health:'DEGRADED', cost_eur:0, capabilities:['extract'] },
    { capability_id:'p', company_id:'fenix', engine_id:'SEO-001', version:'0.1.0', health:'AVAILABLE', cost_eur:2, capabilities:['extract'] }
  ]);
  assert.equal(registry.select({ context, requires:['extract'] }).status, 'UNAVAILABLE');
  assert.throws(() => new LocalCapabilityRegistry([{ capability_id:'x', company_id:'fenix', engine_id:'SEO-001', version:'0.1.0', environment:'PROD' }]));
  let trapCalls = 0;
  const proxied = new Proxy({}, { getPrototypeOf(){ trapCalls += 1; return Object.prototype; } });
  assert.throws(() => new LocalCapabilityRegistry([proxied]));
  assert.equal(trapCalls, 0);
});

test('FREE-001 gives zero-cost precedence across route categories', () => {
  const result = new FreeFirstBroker().resolve({ context, options:[
    { option_id:'early-paid', route_type:'local_model', cost_eur:0.01, equivalent:true },
    { option_id:'later-free', route_type:'free_tier', cost_eur:0, equivalent:true }
  ]});
  assert.equal(result.route_type, 'free_tier');
  assert.equal(result.selected.option_id, 'later-free');
});

test('FREE-001 requires a real boolean for money approval', () => {
  assert.throws(() => new FreeFirstBroker().resolve({ context, options:[
    { option_id:'paid', route_type:'paid_provider', cost_eur:0.01, equivalent:true }
  ], money_limit_approved:'false' }), /boolean/);
});

test('FREE-001 returns MONEY_LIMIT for paid-only route without approval', () => {
  const result = new FreeFirstBroker().resolve({ context, options:[
    { option_id:'paid', route_type:'paid_provider', cost_eur:0.01, equivalent:true }
  ]});
  assert.equal(result.route_type, 'HUMAN_REQUIRED');
  assert.equal(result.human_reason, 'MONEY_LIMIT');
});

test('FREE-001 routes low option confidence to HUMAN_REQUIRED', () => {
  const result = new FreeFirstBroker().resolve({ context, options:[
    { option_id:'uncertain', route_type:'deterministic', cost_eur:0, equivalent:true, confidence:0 }
  ]});
  assert.equal(result.route_type, 'HUMAN_REQUIRED');
  assert.equal(result.human_reason, 'LOW_CONFIDENCE');
});

test('DBOFF-001 persists, reopens, isolates company and restores only requested scope', () => {
  const file = tmp('dboff.v8');
  const store = new LocalOffloadStore({ file_path:file, kind:'DBOFF-001' });
  store.put({ context, key:'k', value:{n:1} });
  store.put({ context:other, key:'foreign', value:{keep:true} });
  const backup = store.backup(context);
  assert.equal(backup.every(op => op.context.company_id === 'fenix'), true);
  store.put({ context, key:'k', value:{n:2} });
  assert.deepEqual(store.get({ context, key:'k' }), {n:2});
  assert.equal(store.get({ context:other, key:'k' }), null);
  store.restore({ context, snapshot:backup });
  assert.deepEqual(store.get({ context, key:'k' }), {n:1});
  assert.deepEqual(store.get({ context:other, key:'foreign' }), {keep:true});
  assert.throws(() => store.restore({ context, snapshot:store.backup(other) }), /cross-scope/);
  const reopened = new LocalOffloadStore({ file_path:file, kind:'DBOFF-001' });
  assert.deepEqual(reopened.get({ context, key:'k' }), {n:1});
  assert.deepEqual(reopened.get({ context:other, key:'foreign' }), {keep:true});
});

test('STOROFF-001 corruption fails closed', () => {
  const file = tmp('storoff.v8');
  const store = new LocalOffloadStore({ file_path:file, kind:'STOROFF-001' });
  store.put({ context, key:'blob-ref', value:{path:'local/a'} });
  fs.writeFileSync(file, Buffer.from('corrupt'));
  assert.throws(() => new LocalOffloadStore({ file_path:file, kind:'STOROFF-001' }));
});

test('AIBUD-001 + ROUTE-001 use deterministic/free routes and fail closed on risk', () => {
  const router = new BudgetModelRouterV0();
  const free = router.route({ context, options:[
    { option_id:'local', route_type:'local_model', cost_eur:0, equivalent:true },
    { option_id:'paid', route_type:'paid_provider', cost_eur:1, equivalent:true }
  ]});
  assert.equal(free.route_type, 'local_model');
  assert.equal(router.route({ context, options:[], low_confidence:true }).human_reason, 'LOW_CONFIDENCE');
  assert.equal(router.route({ context, options:[], high_risk:true }).human_reason, 'HIGH_RISK');
  assert.equal(router.route({ context, options:[], policy_conflict:true }).human_reason, 'POLICY_CONFLICT');
  assert.equal(router.route({ context, options:[], security_incident:true }).human_reason, 'SECURITY_INCIDENT');
  assert.throws(() => router.route({ context, options:[], high_risk:'false' }), /boolean/);
});

test('Wave1 contract is PREPROD-only, zero-cost target, no Supabase PREPROD requirement or Trading', () => {
  const runtime = createZeroCostRuntimeV0();
  assert.deepEqual(runtime.contract, {
    environment:'PREPROD', additional_cost_target_eur:0, supabase_preprod_required:false,
    supabase_heavy_state:false, prod_writes:false, autonomous_prod:false,
    trading_access:false, company_scope:'MULTI_COMPANY'
  });
  assert.throws(() => new LocalCapabilityRegistry([{ capability_id:'x', company_id:'fenix', engine_id:'SEO-001', version:'0.1.0', trading_access:true }]));
  assert.throws(() => new LocalOffloadStore({ file_path:tmp('x'), kind:'DBOFF-001', environment:'PROD' }));
});
