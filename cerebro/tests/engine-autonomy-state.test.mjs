import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const autonomy=JSON.parse(fs.readFileSync(new URL('../registry/engine-autonomy-state.v0.json',import.meta.url),'utf8'));
const seed=JSON.parse(fs.readFileSync(new URL('../registry/engine-registry.seed.json',import.meta.url),'utf8'));

test('autonomy overlay references canonical registry and cannot enable PROD globally',()=>{
  assert.equal(autonomy.schema_version,'1.0.0');
  assert.equal(autonomy.state_type,'CEREBRO_ENGINE_AUTONOMY_STATE');
  assert.equal(autonomy.source_registry,'cerebro/registry/engine-registry.seed.json');
  assert.equal(autonomy.environment_scope,'NON_PROD');
  assert.equal(autonomy.default_state,'UNKNOWN_REQUIRES_AUDIT');
  assert.equal(autonomy.prod_execution_enabled,false);
  assert.equal(autonomy.additional_cost_eur,0);
});

test('every autonomy entry is a canonical engine and remains tenant/version/environment scoped',()=>{
  const ids=new Set(seed.engine_ids);
  assert.ok(Array.isArray(autonomy.engines));
  assert.ok(autonomy.engines.length>0);
  for(const engine of autonomy.engines){
    assert.ok(ids.has(engine.engine_id),`noncanonical engine ${engine.engine_id}`);
    assert.match(engine.company_id,/^[A-Za-z0-9._-]+$/);
    assert.equal(typeof engine.version,'string');
    assert.ok(engine.version.length>0);
    assert.notEqual(engine.environment,'PROD');
    assert.equal(engine.prod_authorized,false);
    assert.equal(engine.prod_write_authorized,false);
    assert.equal(engine.trading_access,false);
    assert.equal(engine.additional_cost_eur,0);
  }
});

test('LRN-001 is accepted only as automatic PREPROD with real and idempotent evidence',()=>{
  const lrn=autonomy.engines.find(engine=>engine.engine_id==='LRN-001');
  assert.ok(lrn);
  assert.equal(lrn.environment,'PREPROD');
  assert.equal(lrn.version,'0.5.0');
  assert.equal(lrn.autonomy_state,'AUTOMATIC_PREPROD_VERIFIED');
  assert.equal(lrn.execution_model,'HOSTLESS_BOUNDED_ITERATION');
  assert.equal(lrn.schedule_semantics,'BEST_EFFORT_15_MINUTE_PLUS_EVENT');
  assert.equal(lrn.connected_scope,'CONNECTED_EVENT_AND_LEARNING_HOOKS_ONLY');
  assert.equal(lrn.first_real_acceptance_run_id,'37827544846');
  assert.equal(lrn.idempotency_acceptance_run_id,'37827678008');
  assert.equal(lrn.real_events_persisted,15);
  assert.equal(lrn.idempotent_rerun_new_persisted,0);
  assert.equal(lrn.ledger_verified,true);
  assert.equal(lrn.rollback_documented,true);
  assert.equal(lrn.rebuild_documented,true);
  assert.equal(lrn.observability_verified,true);
  assert.equal(lrn.human_required_policy_enforced,true);
});
