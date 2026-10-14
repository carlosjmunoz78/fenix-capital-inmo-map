import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../multicompany/sql/marketing-crm-bootstrap-preprod-v1.sql',import.meta.url),'utf8');
const rollback=fs.readFileSync(new URL('../multicompany/rollback/marketing-crm-bootstrap-preprod-v1.rollback.sql',import.meta.url),'utf8');
const registry=JSON.parse(fs.readFileSync(new URL('../registry/multicompany-bootstrap.json',import.meta.url),'utf8'));

test('marketing crm persistence is PREPROD service-role only and zero-cost',()=>{
  for(const phrase of ['cerebro_marketing_crm_bootstrap_run_preprod',"engine_id in ('MKTBOOT-001','CRMBOOT-001')","environment='PREPROD'",'read_only=true','plan_only=true','publish_authorized=false','crm_write_authorized=false','spend_authorized=false','enable row level security','to service_role','additional_cost_eur numeric(12,2) not null default 0']) assert.ok(migration.includes(phrase),phrase);
  assert.equal(migration.includes('cluhljgonannaafpmblx'),false);
  assert.equal(migration.includes('fenix_prod.'),false);
  assert.equal(/\btruncate\b|\bdelete\s+from\b/i.test(migration),false);
});

test('canonical dependencies unlock APPBOOT only through CRMBOOT plus KBOOT',()=>{
  const deps=Object.fromEntries(registry.engines.map(e=>[e.engine_id,e.depends_on]));
  assert.deepEqual(deps['MKTBOOT-001'].sort(),['KBOOT-001','SEOBOOT-001','SOCBOOT-001'].sort());
  assert.deepEqual(deps['CRMBOOT-001'],['KBOOT-001']);
  assert.deepEqual(deps['APPBOOT-001'].sort(),['KBOOT-001','CRMBOOT-001'].sort());
  assert.ok(migration.includes("if v_crm='GREEN' and v_kboot='GREEN' then"));
  assert.ok(migration.includes("engine_id='APPBOOT-001' and state='BLOCKED'"));
  assert.equal(migration.includes("engine_id='AUTBOOT-001' and state='BLOCKED'"),false);
  assert.ok(migration.includes("'APP_BOOTSTRAP_DURABLE_EXECUTION_REQUIRED'"));
});

test('only canonical HUMAN_REQUIRED reasons are admitted',()=>{
  for(const code of ['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']) assert.ok(migration.includes(`'${code}'`),code);
  assert.ok(migration.includes("set state='GREEN',human_required_reason=null"));
  assert.ok(migration.includes("set state='HUMAN_REQUIRED',human_required_reason=v_human"));
});

test('bounded receipts contain hashes and counts, never raw crm or campaign payload fields',()=>{
  for(const field of ['evidence_sha256','result_sha256','item_count','source_count','human_required_code']) assert.ok(migration.includes(field),field);
  for(const forbidden of [/customer_payload\s+(text|json|jsonb)/i,/campaign_body\s+(text|json|jsonb)/i,/raw_message\s+(text|json|jsonb)/i,/email\s+(text|json|jsonb)/i,/phone\s+(text|json|jsonb)/i]) assert.equal(forbidden.test(migration),false,String(forbidden));
});

test('status read is tenant-safe and rollback is exact',()=>{
  assert.ok(migration.includes('cerebro_company_tenant_boundary_check_preprod(p_request_company_id,p_target_company_id)'));
  assert.ok(migration.includes("coalesce((v_guard->>'allowed')::boolean,false) is not true"));
  for(const signature of ['drop function if exists public.cerebro_marketing_crm_bootstrap_status_preprod(text,text)','drop function if exists public.cerebro_marketing_crm_bootstrap_record_preprod(text,text,text,timestamptz,text,text,integer,integer,text,text,text)','drop table if exists public.cerebro_marketing_crm_bootstrap_run_preprod']) assert.ok(rollback.includes(signature),signature);
  for(const preserved of ['cerebro_company_registry_preprod','cerebro_company_onboarding_preprod','cerebro_company_engine_state_preprod','cerebro_scan001_run_preprod','cerebro_bootstrap_tier_run_preprod']) assert.equal(rollback.includes(`drop table if exists public.${preserved}`),false,preserved);
  assert.equal(/cascade/i.test(rollback),false);
});
