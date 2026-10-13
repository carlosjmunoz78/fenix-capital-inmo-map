import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../../supabase/migrations/20261013101500_cerebro_post_scan_parallel_preprod_v1.sql',import.meta.url),'utf8');
const rollback=fs.readFileSync(new URL('../multicompany/rollback/post-scan-parallel-preprod-v1.rollback.sql',import.meta.url),'utf8');
const registry=JSON.parse(fs.readFileSync(new URL('../registry/multicompany-bootstrap.json',import.meta.url),'utf8'));

test('shared post-SCAN persistence is PREPROD service-role only and zero-cost',()=>{
  for(const phrase of [
    'cerebro_post_scan_audit_run_preprod',
    "engine_id in ('KW-001','WAUD-001','SOCAUD-001','LOCALP-001')",
    "environment='PREPROD'",
    'read_only=true',
    'enable row level security',
    'to service_role',
    'additional_cost_eur numeric(12,2) not null default 0'
  ]) assert.ok(migration.includes(phrase),phrase);
  assert.equal(migration.includes('cluhljgonannaafpmblx'),false);
  assert.equal(migration.includes('fenix_prod.'),false);
  assert.equal(/\btruncate\b|\bdelete\s+from\b/i.test(migration),false);
});

test('one shared logical runtime avoids four servers and stores no raw evidence',()=>{
  for(const field of ['evidence_sha256','result_sha256','item_count','finding_count','human_required_code']) assert.ok(migration.includes(field),field);
  for(const forbidden of [/page_body\s+(text|json|jsonb)/i,/social_profiles\s+(text|json|jsonb)/i,/keyword_payload\s+(text|json|jsonb)/i,/raw_evidence\s+(text|json|jsonb)/i,/html\s+(text|json|jsonb)/i]) assert.equal(forbidden.test(migration),false,String(forbidden));
});

test('only canonical HUMAN_REQUIRED reasons are admitted and null means normal GREEN',()=>{
  for(const code of ['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']) assert.ok(migration.includes(`'${code}'`),code);
  assert.ok(migration.includes("set state='GREEN',human_required_reason=null"));
  assert.ok(migration.includes("set state='HUMAN_REQUIRED',human_required_reason=v_human"));
});

test('canonical dependency fan-in/fan-out is preserved',()=>{
  const deps=Object.fromEntries(registry.engines.map(e=>[e.engine_id,e.depends_on]));
  assert.deepEqual(deps['KBOOT-001'].sort(),['KW-001','LOCALP-001','SOCAUD-001','WAUD-001'].sort());
  assert.deepEqual(deps['SEOBOOT-001'].sort(),['KW-001','WAUD-001'].sort());
  assert.deepEqual(deps['SOCBOOT-001'],['SOCAUD-001']);
  for(const phrase of [
    "if v_kw='GREEN' and v_waud='GREEN' then",
    "engine_id='SEOBOOT-001' and state='BLOCKED'",
    "if v_socaud='GREEN' then",
    "engine_id='SOCBOOT-001' and state='BLOCKED'",
    "v_all_green:=(v_kw='GREEN' and v_waud='GREEN' and v_socaud='GREEN' and v_localp='GREEN')",
    "engine_id='KBOOT-001' and state='BLOCKED'",
    "'next_gate',case when v_all_green then 'BOOTSTRAP_TIER_DURABLE_EXECUTION_REQUIRED' else 'POST_SCAN_PARALLEL_DURABLE_EXECUTION_REQUIRED' end"
  ]) assert.ok(migration.includes(phrase),phrase);
  assert.equal(migration.includes("engine_id='MKTBOOT-001' and state='BLOCKED'"),false);
  assert.equal(migration.includes("engine_id='ENGACT-001' and state='BLOCKED'"),false);
});

test('recording is idempotent and cannot expand PROD or Trading authority',()=>{
  for(const phrase of ['audit_idempotency_key','idempotency_scope_conflict',"'prod_authorized',false","'prod_write_authorized',false","'trading_access',false","'additional_cost_eur',0"]) assert.ok(migration.includes(phrase),phrase);
  assert.equal(/prod_authorized[^\n]*true/i.test(migration),false);
  assert.equal(/prod_write_authorized[^\n]*true/i.test(migration),false);
  assert.equal(/trading_access[^\n]*true/i.test(migration),false);
});

test('status read is tenant-safe',()=>{
  assert.ok(migration.includes('cerebro_post_scan_parallel_status_preprod'));
  assert.ok(migration.includes('cerebro_company_tenant_boundary_check_preprod(p_request_company_id,p_target_company_id)'));
  assert.ok(migration.includes("coalesce((v_guard->>'allowed')::boolean,false) is not true"));
});

test('rollback drops only the new shared receipt objects',()=>{
  for(const signature of [
    'drop function if exists public.cerebro_post_scan_parallel_status_preprod(text,text)',
    'drop function if exists public.cerebro_post_scan_audit_record_preprod(text,text,text,timestamptz,text,text,integer,integer,text,text,text)',
    'drop table if exists public.cerebro_post_scan_audit_run_preprod'
  ]) assert.ok(rollback.includes(signature),signature);
  for(const preserved of ['cerebro_company_registry_preprod','cerebro_company_onboarding_preprod','cerebro_company_engine_state_preprod','cerebro_scan001_run_preprod']) assert.equal(rollback.includes(`drop table if exists public.${preserved}`),false,preserved);
  assert.equal(/cascade/i.test(rollback),false);
});
