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

test('FACT-001 is accepted only as automatic SCAFFOLD with real and deterministic idempotency evidence',()=>{
  const fact=autonomy.engines.find(engine=>engine.engine_id==='FACT-001');
  assert.ok(fact);
  assert.equal(fact.company_id,'GLOBAL_ONLY');
  assert.equal(fact.environment,'SCAFFOLD');
  assert.equal(fact.version,'0.1.0');
  assert.equal(fact.autonomy_state,'AUTOMATIC_SCAFFOLD_VERIFIED');
  assert.equal(fact.execution_model,'GITHUB_EVENT_DRIVEN_HOSTLESS');
  assert.equal(fact.connected_scope,'CANONICAL_ENGINE_SCAFFOLD_REQUESTS_ONLY');
  assert.equal(fact.live_acceptance_run_id,'37830400943');
  assert.equal(fact.live_acceptance_attempt,1);
  assert.equal(fact.idempotency_acceptance_run_id,'37830400943');
  assert.equal(fact.idempotency_acceptance_attempt,2);
  assert.equal(fact.live_source_sha,'a20b98ac9ff006ebbbd9a6fbd51f16d8cdf8cee4');
  assert.equal(fact.request_id,'fact001-selfcheck-v0');
  assert.equal(fact.idempotency_key,'fact001:9d7a6ad8651866e85f7199b3cfdf38928a09a302fa29cf2e6a962853dfac6427');
  assert.equal(fact.bundle_sha256,'e55c45943dba3cf084c0f657cc1cb529a3a23e5b293e2549b2b51ffb36675b74');
  assert.equal(fact.source_registry_sha256,'92717b6109caade90e9c3c89940536122d8583cd8fe8695a4118119febe2caf8');
  assert.equal(fact.structural_file_count,18);
  assert.equal(fact.structural_evaluation_verified,true);
  assert.equal(fact.target_engine_evaluation_state,'NOT_RUN_SCAFFOLD_ONLY');
  assert.equal(fact.target_engine_tribunal_state,'NOT_RUN_SCAFFOLD_ONLY');
  assert.equal(fact.rollback_documented,true);
  assert.equal(fact.rebuild_documented,true);
  assert.equal(fact.observability_verified,true);
  assert.equal(fact.human_required_policy_enforced,true);
  assert.equal(fact.gateway_repository_dispatch_defined,true);
  assert.equal(fact.gateway_repository_dispatch_live_verified,false);
});

test('COMP-ONB-001 is accepted only as automatic structural PREPROD scaffold with real deterministic evidence',()=>{
  const onboarding=autonomy.engines.find(engine=>engine.engine_id==='COMP-ONB-001');
  assert.ok(onboarding);
  assert.equal(onboarding.company_id,'GLOBAL_ONLY');
  assert.equal(onboarding.environment,'PREPROD');
  assert.equal(onboarding.version,'0.1.0');
  assert.equal(onboarding.autonomy_state,'AUTOMATIC_COMPANY_SCAFFOLD_VERIFIED');
  assert.equal(onboarding.execution_model,'GITHUB_EVENT_DRIVEN_HOSTLESS');
  assert.equal(onboarding.connected_scope,'PHASE4_STRUCTURAL_SCAFFOLD_ONLY');
  assert.equal(onboarding.phase4_engine_count,17);
  assert.equal(onboarding.structural_files_expected,306);
  assert.equal(onboarding.structural_files_verified,306);
  assert.equal(onboarding.fact001_dependency_state,'AUTOMATIC_SCAFFOLD_VERIFIED');
  assert.equal(onboarding.live_acceptance_run_id,'37833181826');
  assert.equal(onboarding.live_acceptance_attempt,1);
  assert.equal(onboarding.idempotency_acceptance_run_id,'37833181826');
  assert.equal(onboarding.idempotency_acceptance_attempt,2);
  assert.equal(onboarding.live_source_sha,'cb46c0c95b4e628608990404e4c1ac38e889b79e');
  assert.equal(onboarding.request_id,'company-bootstrap-selfcheck-v0');
  assert.equal(onboarding.acceptance_company_id,'cerebro-bootstrap-selfcheck');
  assert.equal(onboarding.aggregate_sha256,'295be8b701fe80ea57b034e882da1698def79a97502b9831e9453871c7fc1ed6');
  assert.equal(onboarding.structural_evaluation_verified,true);
  assert.equal(onboarding.observability_verified,true);
  assert.equal(onboarding.business_engine_green_from_scaffold_authorized,false);
  assert.equal(onboarding.target_engine_evaluation_state,'NOT_RUN_STRUCTURAL_ONLY');
  assert.equal(onboarding.target_engine_tribunal_state,'NOT_RUN_STRUCTURAL_ONLY');
  assert.equal(onboarding.supabase_writes,false);
  assert.equal(onboarding.gateway_repository_dispatch_defined,true);
  assert.equal(onboarding.gateway_repository_dispatch_live_verified,false);
});

test('COMP-REG-001 and TENANT-001 are accepted only as in-memory PREPROD reference execution',()=>{
  const expectedIds=['COMP-REG-001','TENANT-001'];
  for(const engineId of expectedIds){
    const engine=autonomy.engines.find(item=>item.engine_id===engineId);
    assert.ok(engine,`missing ${engineId}`);
    assert.equal(engine.company_id,'cerebro-reg-tenant-selfcheck');
    assert.equal(engine.environment,'PREPROD');
    assert.equal(engine.version,'0.1.0');
    assert.equal(engine.autonomy_state,'PREPROD_REFERENCE_EXECUTION_VERIFIED');
    assert.equal(engine.execution_model,'GITHUB_EVENT_DRIVEN_HOSTLESS_REFERENCE');
    assert.equal(engine.connected_scope,'IN_MEMORY_PHASE4_REFERENCE_ONLY');
    assert.equal(engine.live_acceptance_run_id,'37838584276');
    assert.equal(engine.live_acceptance_attempt,1);
    assert.equal(engine.idempotency_acceptance_run_id,'37838584276');
    assert.equal(engine.idempotency_acceptance_attempt,2);
    assert.equal(engine.live_source_sha,'6710067e0f1beb28f930c038aceebfb9168f965a');
    assert.equal(engine.request_id,'company-reg-tenant-selfcheck-v0');
    assert.equal(engine.execution_sha256,'c1dc362d98ac5b5ad23d441a8299d64182d2bb4e6bfd271e13ca45538ad1cdc8');
    assert.equal(engine.engine_state_verified,'GREEN');
    assert.equal(engine.tenant_isolation_verified,true);
    assert.equal(engine.durability_state,'IN_MEMORY_REFERENCE_ONLY');
    assert.equal(engine.next_gate,'DURABLE_COMPANY_REGISTRY_PREPROD_PERSISTENCE_REQUIRED');
    assert.equal(engine.promotion_authorized,false);
    assert.equal(engine.supabase_writes,false);
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
