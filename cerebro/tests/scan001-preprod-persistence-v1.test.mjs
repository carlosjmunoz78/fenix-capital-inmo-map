import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../../supabase/migrations/20261013093000_cerebro_scan001_preprod_persistence_v1.sql',import.meta.url),'utf8');
const rollback=fs.readFileSync(new URL('../multicompany/rollback/scan001-preprod-persistence-v1.rollback.sql',import.meta.url),'utf8');
const registry=JSON.parse(fs.readFileSync(new URL('../registry/multicompany-bootstrap.json',import.meta.url),'utf8'));

test('SCAN-001 persistence is bounded PREPROD service-role control-plane state',()=>{
  for(const phrase of [
    'cerebro_scan001_run_preprod',
    "engine_id='SCAN-001'",
    "environment='PREPROD'",
    'read_only=true',
    'references public.cerebro_company_onboarding_preprod(company_id)',
    'enable row level security',
    'to service_role'
  ]) assert.ok(migration.includes(phrase),phrase);
  assert.equal(migration.includes('cluhljgonannaafpmblx'),false);
  assert.equal(migration.includes('fenix_prod.'),false);
  assert.equal(/\btruncate\b|\bdelete\s+from\b/i.test(migration),false);
});

test('SCAN-001 receipt stores hashes/counts only and leaves raw evidence outside Supabase',()=>{
  for(const field of [
    'evidence_sha256','result_sha256','root_status','robots_available','sitemap_available',
    'technology_count','social_network_count','internal_link_count','external_link_count'
  ]) assert.ok(migration.includes(field),field);
  for(const forbidden of [
    /page_body\s+(text|json|jsonb)/i,
    /robots_body\s+(text|json|jsonb)/i,
    /sitemap_body\s+(text|json|jsonb)/i,
    /social_profiles\s+(text|json|jsonb)/i,
    /internal_links\s+(text|json|jsonb)/i,
    /external_links\s+(text|json|jsonb)/i,
    /raw_evidence\s+(text|json|jsonb)/i
  ]) assert.equal(forbidden.test(migration),false,String(forbidden));
});

test('record-success requires current SCAN state and unlocks only canonical post-scan engines',()=>{
  for(const phrase of [
    'cerebro_scan001_record_success_preprod',
    "engine_id='SCAN-001'",
    "v_state.state not in ('READY','GREEN')",
    "set state='GREEN',evidence_sha256=v_inserted.evidence_sha256",
    "engine_id in ('KW-001','WAUD-001','SOCAUD-001','LOCALP-001')",
    "set state='READY',updated_at=now()",
    "'next_ready',jsonb_build_array('KW-001','WAUD-001','SOCAUD-001','LOCALP-001')",
    "'next_gate','POST_SCAN_PARALLEL_DURABLE_EXECUTION_REQUIRED'"
  ]) assert.ok(migration.includes(phrase),phrase);
  assert.equal(migration.includes("engine_id='ENGACT-001'"),false);
  const expected=['KW-001','WAUD-001','SOCAUD-001','LOCALP-001'];
  const scan=registry.engines.find(e=>e.engine_id==='SCAN-001');
  assert.ok(scan);
  for(const id of expected) assert.ok(registry.engines.find(e=>e.engine_id===id)?.dependencies.includes('SCAN-001'),id);
});

test('SCAN-001 remains idempotent zero-cost with no PROD or Trading authority',()=>{
  for(const phrase of [
    'scan_idempotency_key',
    'idempotency_scope_conflict',
    "'idempotent',true",
    "'prod_authorized',false",
    "'prod_write_authorized',false",
    "'trading_access',false",
    "'additional_cost_eur',0",
    "'human_required','POLICY_CONFLICT'"
  ]) assert.ok(migration.includes(phrase),phrase);
  assert.equal(/prod_authorized[^\n]*true/i.test(migration),false);
  assert.equal(/prod_write_authorized[^\n]*true/i.test(migration),false);
  assert.equal(/trading_access[^\n]*true/i.test(migration),false);
});

test('latest read reuses existing tenant boundary and fails closed cross-company',()=>{
  assert.ok(migration.includes('cerebro_scan001_latest_get_preprod'));
  assert.ok(migration.includes('cerebro_company_tenant_boundary_check_preprod(p_request_company_id,p_target_company_id)'));
  assert.ok(migration.includes("coalesce((v_guard->>'allowed')::boolean,false) is not true"));
});

test('rollback is exact and preserves Registry COMP-ONB and engine-state dependencies',()=>{
  for(const signature of [
    'drop function if exists public.cerebro_scan001_latest_get_preprod(text,text)',
    'drop function if exists public.cerebro_scan001_record_success_preprod(text,text,text,timestamptz,text,text,integer,boolean,boolean,integer,integer,integer,integer,text,text)',
    'drop table if exists public.cerebro_scan001_run_preprod'
  ]) assert.ok(rollback.includes(signature),signature);
  assert.equal(rollback.includes('cerebro_company_registry_preprod'),false);
  assert.equal(rollback.includes('cerebro_company_onboarding_preprod'),false);
  assert.equal(rollback.includes('cerebro_company_engine_state_preprod'),false);
  assert.equal(/cascade/i.test(rollback),false);
});
