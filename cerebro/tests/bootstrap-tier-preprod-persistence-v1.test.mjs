import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../multicompany/sql/bootstrap-tier-preprod-v1.sql',import.meta.url),'utf8');
const rollback=fs.readFileSync(new URL('../multicompany/rollback/bootstrap-tier-preprod-v1.rollback.sql',import.meta.url),'utf8');
const registry=JSON.parse(fs.readFileSync(new URL('../registry/multicompany-bootstrap.json',import.meta.url),'utf8'));

test('bootstrap persistence is PREPROD service-role only, publish-closed and zero-cost',()=>{
  for(const phrase of [
    'cerebro_bootstrap_tier_run_preprod',
    "engine_id in ('KBOOT-001','SEOBOOT-001','SOCBOOT-001')",
    "environment='PREPROD'",
    'read_only=true',
    'publish_authorized=false',
    'enable row level security',
    'to service_role',
    'additional_cost_eur numeric(12,2) not null default 0'
  ]) assert.ok(migration.includes(phrase),phrase);
  assert.equal(migration.includes('cluhljgonannaafpmblx'),false);
  assert.equal(migration.includes('fenix_prod.'),false);
  assert.equal(/\btruncate\b|\bdelete\s+from\b/i.test(migration),false);
});

test('shared control plane stores hashes/counts, not raw knowledge, content or assets',()=>{
  for(const field of ['evidence_sha256','result_sha256','item_count','source_count','human_required_code']) assert.ok(migration.includes(field),field);
  for(const forbidden of [/raw_knowledge\s+(text|json|jsonb)/i,/content_body\s+(text|json|jsonb)/i,/social_assets\s+(text|json|jsonb)/i,/keyword_map\s+(text|json|jsonb)/i,/html\s+(text|json|jsonb)/i]) assert.equal(forbidden.test(migration),false,String(forbidden));
});

test('canonical bootstrap fan-out unlocks only CRMBOOT and MKTBOOT',()=>{
  const deps=Object.fromEntries(registry.engines.map(e=>[e.engine_id,e.depends_on]));
  assert.deepEqual(deps['CRMBOOT-001'],['KBOOT-001']);
  assert.deepEqual(deps['MKTBOOT-001'].sort(),['KBOOT-001','SEOBOOT-001','SOCBOOT-001'].sort());
  for(const phrase of [
    "if v_kboot='GREEN' then",
    "engine_id='CRMBOOT-001' and state='BLOCKED'",
    "v_all_green:=(v_kboot='GREEN' and v_seoboot='GREEN' and v_socboot='GREEN')",
    "engine_id='MKTBOOT-001' and state='BLOCKED'",
    "'MARKETING_CRM_BOOTSTRAP_DURABLE_EXECUTION_REQUIRED'"
  ]) assert.ok(migration.includes(phrase),phrase);
  assert.equal(migration.includes("engine_id='APPBOOT-001' and state='BLOCKED'"),false);
  assert.equal(migration.includes("engine_id='ENGACT-001' and state='BLOCKED'"),false);
});

test('only canonical HUMAN_REQUIRED reasons are admitted and normal result becomes GREEN',()=>{
  for(const code of ['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']) assert.ok(migration.includes(`'${code}'`),code);
  assert.ok(migration.includes("set state='GREEN',human_required_reason=null"));
  assert.ok(migration.includes("set state='HUMAN_REQUIRED',human_required_reason=v_human"));
});

test('recording is idempotent and cannot expand PROD, publish or Trading authority',()=>{
  for(const phrase of ['bootstrap_idempotency_key','idempotency_scope_conflict',"'prod_authorized',false","'prod_write_authorized',false","'trading_access',false","'additional_cost_eur',0"]) assert.ok(migration.includes(phrase),phrase);
  assert.equal(/prod_authorized[^\n]*true/i.test(migration),false);
  assert.equal(/prod_write_authorized[^\n]*true/i.test(migration),false);
  assert.equal(/publish_authorized[^\n]*true/i.test(migration),false);
  assert.equal(/trading_access[^\n]*true/i.test(migration),false);
});

test('status read is tenant-safe',()=>{
  assert.ok(migration.includes('cerebro_bootstrap_tier_status_preprod'));
  assert.ok(migration.includes('cerebro_company_tenant_boundary_check_preprod(p_request_company_id,p_target_company_id)'));
  assert.ok(migration.includes("coalesce((v_guard->>'allowed')::boolean,false) is not true"));
});

test('rollback drops only new bootstrap tier objects',()=>{
  for(const signature of [
    'drop function if exists public.cerebro_bootstrap_tier_status_preprod(text,text)',
    'drop function if exists public.cerebro_bootstrap_tier_record_preprod(text,text,text,timestamptz,text,text,integer,integer,text,text,text)',
    'drop table if exists public.cerebro_bootstrap_tier_run_preprod'
  ]) assert.ok(rollback.includes(signature),signature);
  for(const preserved of ['cerebro_company_registry_preprod','cerebro_company_onboarding_preprod','cerebro_company_engine_state_preprod','cerebro_scan001_run_preprod','cerebro_post_scan_audit_run_preprod']) assert.equal(rollback.includes(`drop table if exists public.${preserved}`),false,preserved);
  assert.equal(/cascade/i.test(rollback),false);
});