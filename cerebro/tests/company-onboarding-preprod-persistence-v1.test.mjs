import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../../supabase/migrations/20261013083000_cerebro_company_onboarding_preprod_persistence_v1.sql',import.meta.url),'utf8');
const rollback=fs.readFileSync(new URL('../multicompany/rollback/company-onboarding-preprod-persistence-v1.rollback.sql',import.meta.url),'utf8');
const registry=JSON.parse(fs.readFileSync(new URL('../registry/multicompany-bootstrap.json',import.meta.url),'utf8'));
const historical=fs.readFileSync(new URL('../multicompany/company-scaffold-bootstrap.mjs',import.meta.url),'utf8');

test('COMP-ONB durable state is PREPROD-only lightweight and service-role only',()=>{
  for(const phrase of [
    'cerebro_company_onboarding_preprod',
    'cerebro_company_engine_state_preprod',
    'cerebro_company_onboarding_history_preprod',
    "engine_id = 'COMP-ONB-001'",
    "environment = 'PREPROD'",
    "canonical_engine_count = 17",
    "next_ready_engine_id = 'SCAN-001'",
    "tenant_boundary = 'DENY_CROSS_COMPANY'",
    'downstream_auto_execute = false',
    'enable row level security',
    'to service_role'
  ]) assert.ok(migration.includes(phrase),phrase);
  assert.equal(migration.includes('cluhljgonannaafpmblx'),false);
  assert.equal(migration.includes('fenix_prod.'),false);
  assert.equal(/\btruncate\b|\bdelete\s+from\b/i.test(migration),false);
});

test('durable onboarding requires the existing Company Registry boundary and matching structural identity',()=>{
  for(const phrase of [
    'references public.cerebro_company_registry_preprod(company_id)',
    'company_registry_precondition_missing',
    'company_registry_safety_precondition_failed',
    'profile_hash_mismatch',
    'structural_scaffold_sha256',
    'cerebro_company_tenant_boundary_check_preprod',
    "'POLICY_CONFLICT'"
  ]) assert.ok(migration.includes(phrase),phrase);
});

test('COMP-ONB initializes exactly the current 17 canonical engine states and unlocks only SCAN-001',()=>{
  const start=migration.indexOf('insert into public.cerebro_company_engine_state_preprod');
  const end=migration.indexOf(';',start);
  assert.ok(start>=0 && end>start);
  const block=migration.slice(start,end);
  const ids=[...block.matchAll(/\(v_existing\.company_id,'([^']+)'/g)].map(m=>m[1]);
  assert.equal(ids.length,17);
  assert.deepEqual(new Set(ids),new Set(registry.engines.map(e=>e.engine_id)));
  assert.ok(block.includes("'TENANT-001','PREPROD',v_existing.version,0,array['COMP-REG-001'],'GREEN'"));
  assert.ok(block.includes("'COMP-REG-001','PREPROD',v_existing.version,1,array[]::text[],'GREEN'"));
  assert.ok(block.includes("'COMP-ONB-001','PREPROD',v_existing.version,2,array['COMP-REG-001'],'GREEN'"));
  assert.ok(block.includes("'SCAN-001','PREPROD',v_existing.version,3,array['COMP-ONB-001'],'READY'"));
  for(const engine of registry.engines.filter(e=>!['TENANT-001','COMP-REG-001','COMP-ONB-001','SCAN-001'].includes(e.engine_id))){
    assert.match(block,new RegExp(`'${engine.engine_id.replaceAll('-','\\-')}'[^\\n]*'BLOCKED'`));
  }
  assert.ok(migration.includes("'next_ready',jsonb_build_array('SCAN-001')"));
  assert.ok(migration.includes("'next_gate','SCAN_001_DURABLE_EXECUTION_REQUIRED'"));
});

test('historical COMP-ONB behavior is conserved without stale pipeline expansion',()=>{
  assert.ok(historical.includes("engine_id: 'COMP-ONB-001'"));
  assert.ok(historical.includes("next_gate: 'COMP_REG_AND_TENANT_PREPROD_EXECUTION_REQUIRED'"));
  assert.ok(migration.includes('downstream_auto_execute'));
  assert.ok(migration.includes('false,false,false,false,0'));
  assert.equal(registry.engines.length,17);
});

test('onboarding API is idempotent tenant-safe and cannot grant PROD Trading or paid authority',()=>{
  for(const phrase of [
    'cerebro_company_onboarding_start_preprod',
    'onboarding_idempotency_key',
    'idempotency_scope_conflict',
    'onboarding_already_started',
    "'prod_authorized',false",
    "'prod_write_authorized',false",
    "'trading_access',false",
    "'additional_cost_eur',0",
    'revoke all on function public.cerebro_company_onboarding_start_preprod(text,text,text,text,text,text) from public, anon, authenticated',
    'grant execute on function public.cerebro_company_onboarding_start_preprod(text,text,text,text,text,text) to service_role'
  ]) assert.ok(migration.includes(phrase),phrase);
  assert.equal(/prod_authorized[^\n]*true/i.test(migration),false);
  assert.equal(/prod_write_authorized[^\n]*true/i.test(migration),false);
  assert.equal(/trading_access[^\n]*true/i.test(migration),false);
});

test('Supabase stores only bounded control-plane hashes and states, not raw company/customer payload',()=>{
  assert.ok(migration.includes('profile_sha256'));
  assert.ok(migration.includes('structural_scaffold_sha256'));
  assert.equal(/\bprofile\s+(json|jsonb|text)\b/i.test(migration),false);
  assert.equal(/customer_payload|customer_data|conversation|document_body|raw_evidence/i.test(migration),false);
  assert.equal(/password|passwd|credential|private_key|api_key|iban|bank_account/i.test(migration),false);
});

test('rollback is exact and preserves the durable Company Registry dependency',()=>{
  for(const signature of [
    'drop function if exists public.cerebro_company_engine_states_get_preprod(text,text)',
    'drop function if exists public.cerebro_company_onboarding_get_preprod(text,text)',
    'drop function if exists public.cerebro_company_onboarding_start_preprod(text,text,text,text,text,text)',
    'drop table if exists public.cerebro_company_onboarding_history_preprod',
    'drop table if exists public.cerebro_company_engine_state_preprod',
    'drop table if exists public.cerebro_company_onboarding_preprod'
  ]) assert.ok(rollback.includes(signature),signature);
  assert.equal(rollback.includes('cerebro_company_registry_preprod'),false);
  assert.equal(/cascade/i.test(rollback),false);
});
