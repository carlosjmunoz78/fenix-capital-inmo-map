import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../../supabase/migrations/20261013075000_cerebro_company_registry_preprod_persistence_v1.sql',import.meta.url),'utf8');
const rollback=fs.readFileSync(new URL('../multicompany/rollback/company-registry-preprod-persistence-v1.rollback.sql',import.meta.url),'utf8');
const registry=JSON.parse(fs.readFileSync(new URL('../registry/multicompany-bootstrap.json',import.meta.url),'utf8'));

test('durable registry is PREPROD-only additive control-plane persistence',()=>{
  for(const phrase of [
    'cerebro_company_registry_preprod',
    'cerebro_company_registry_history_preprod',
    "environment = 'PREPROD'",
    "state = 'REGISTERED_PREPROD'",
    "tenant_boundary = 'DENY_CROSS_COMPANY'",
    'enable row level security',
    'grant all on table public.cerebro_company_registry_preprod to service_role',
    'grant all on table public.cerebro_company_registry_history_preprod to service_role'
  ]) assert.ok(migration.includes(phrase),phrase);

  assert.equal(migration.includes('cluhljgonannaafpmblx'),false);
  assert.equal(migration.includes('fenix_prod.'),false);
  assert.equal(migration.includes('customer_data'),false);
  assert.equal(/\btruncate\b|\bdelete\s+from\b/i.test(migration),false);
});

test('registration is service-role only idempotent and never grants PROD or Trading authority',()=>{
  for(const phrase of [
    'cerebro_company_register_preprod',
    'registration_idempotency_key',
    'idempotency_scope_conflict',
    'company_already_registered',
    "'next_gate','COMP_ONB_DURABLE_EXECUTION_REQUIRED'",
    "'prod_authorized',false",
    "'prod_write_authorized',false",
    "'trading_access',false",
    "'additional_cost_eur',0",
    'revoke all on function public.cerebro_company_register_preprod(text,text,text,text,text) from public, anon, authenticated',
    'grant execute on function public.cerebro_company_register_preprod(text,text,text,text,text) to service_role'
  ]) assert.ok(migration.includes(phrase),phrase);

  assert.equal(/prod_authorized[^\n]*true/i.test(migration),false);
  assert.equal(/prod_write_authorized[^\n]*true/i.test(migration),false);
  assert.equal(/trading_access[^\n]*true/i.test(migration),false);
});

test('tenant guard fails closed for cross-company scope',()=>{
  for(const phrase of [
    'cerebro_company_tenant_boundary_check_preprod',
    'cross_company_access_denied',
    "'allowed',false",
    "'tenant_boundary','DENY_CROSS_COMPANY'",
    "'human_required',false"
  ]) assert.ok(migration.includes(phrase),phrase);
  assert.ok(migration.indexOf("btrim(p_request_company_id) <> btrim(p_target_company_id)") < migration.indexOf('select exists('));
});

test('only profile hash is durable and no raw structural profile is persisted',()=>{
  assert.ok(migration.includes('profile_sha256'));
  assert.equal(/\bprofile\s+(json|jsonb|text)\b/i.test(migration),false);
  assert.equal(/password|passwd|secret|credential|private_key|api_key|iban|bank_account/i.test(migration),false);
});

test('rollback is exact and bounded to newly created persistence objects',()=>{
  for(const signature of [
    'drop function if exists public.cerebro_company_tenant_boundary_check_preprod(text,text)',
    'drop function if exists public.cerebro_company_registry_get_preprod(text)',
    'drop function if exists public.cerebro_company_register_preprod(text,text,text,text,text)',
    'drop table if exists public.cerebro_company_registry_history_preprod',
    'drop table if exists public.cerebro_company_registry_preprod'
  ]) assert.ok(rollback.includes(signature),signature);
  assert.equal(/cascade/i.test(rollback),false);
  assert.equal(/fenix_prod|cluhljgonannaafpmblx/i.test(rollback),false);
});

test('canonical multicompany contract remains PREPROD zero-cost and fail-closed',()=>{
  assert.equal(registry.environment,'PREPROD');
  assert.equal(registry.additional_cost_target_eur,0);
  assert.equal(registry.prod_execution_enabled,false);
  assert.equal(registry.policy.cross_company_access,'deny');
  assert.equal(registry.policy.live_writes,false);
  assert.equal(registry.policy.autonomous_prod,false);
  assert.equal(registry.policy.trading_access,false);
  assert.ok(registry.engines.some(e=>e.engine_id==='COMP-REG-001'));
  assert.ok(registry.engines.some(e=>e.engine_id==='COMP-ONB-001'));
  assert.ok(registry.engines.some(e=>e.engine_id==='TENANT-001'));
});
