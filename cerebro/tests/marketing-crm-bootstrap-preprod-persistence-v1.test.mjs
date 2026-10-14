import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../multicompany/sql/marketing-crm-bootstrap-preprod-v1.sql',import.meta.url),'utf8');
const rollback=fs.readFileSync(new URL('../multicompany/rollback/marketing-crm-bootstrap-preprod-v1.rollback.sql',import.meta.url),'utf8');
const registry=JSON.parse(fs.readFileSync(new URL('../registry/multicompany-bootstrap.json',import.meta.url),'utf8'));

test('persistence is PREPROD-only service-role zero-cost',()=>{
  for(const phrase of ['cerebro_marketing_crm_bootstrap_run_preprod',"engine_id in ('MKTBOOT-001','CRMBOOT-001')","environment='PREPROD'",'read_only=true','publish_authorized=false','enable row level security','to service_role','additional_cost_eur numeric(12,2) not null default 0']) assert.ok(sql.includes(phrase),phrase);
  assert.equal(sql.includes('fenix_prod.'),false);
  assert.equal(/\btruncate\b|\bdelete\s+from\b/i.test(sql),false);
});

test('canonical dependencies are preserved and APPBOOT unlocks only after KBOOT plus CRMBOOT',()=>{
  const deps=Object.fromEntries(registry.engines.map(e=>[e.engine_id,e.depends_on]));
  assert.deepEqual(deps['MKTBOOT-001'].sort(),['KBOOT-001','SEOBOOT-001','SOCBOOT-001'].sort());
  assert.deepEqual(deps['CRMBOOT-001'],['KBOOT-001']);
  assert.deepEqual(deps['APPBOOT-001'].sort(),['CRMBOOT-001','KBOOT-001'].sort());
  assert.ok(sql.includes("if v_kboot='GREEN' and v_crm='GREEN' then"));
  assert.ok(sql.includes("engine_id='APPBOOT-001' and state='BLOCKED'"));
  assert.equal(sql.includes("engine_id='AUTBOOT-001' and state='BLOCKED'"),false);
  assert.equal(sql.includes("engine_id='TRNBOOT-001' and state='BLOCKED'"),false);
  assert.equal(sql.includes("engine_id='ENGACT-001' and state='BLOCKED'"),false);
});

test('only canonical HUMAN_REQUIRED reasons are accepted',()=>{
  for(const code of ['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']) assert.ok(sql.includes(`'${code}'`),code);
  assert.ok(sql.includes("set state='GREEN',human_required_reason=null"));
  assert.ok(sql.includes("set state='HUMAN_REQUIRED',human_required_reason=v_human"));
});

test('authority cannot expand to PROD, publish or Trading',()=>{
  for(const phrase of ["'prod_authorized',false","'prod_write_authorized',false","'trading_access',false","'additional_cost_eur',0"]) assert.ok(sql.includes(phrase),phrase);
  assert.equal(/prod_authorized[^\n]*true/i.test(sql),false);
  assert.equal(/prod_write_authorized[^\n]*true/i.test(sql),false);
  assert.equal(/publish_authorized[^\n]*true/i.test(sql),false);
  assert.equal(/trading_access[^\n]*true/i.test(sql),false);
});

test('status is tenant-safe',()=>{
  assert.ok(sql.includes('cerebro_company_tenant_boundary_check_preprod(p_request_company_id,p_target_company_id)'));
  assert.ok(sql.includes("coalesce((v_guard->>'allowed')::boolean,false) is not true"));
});

test('rollback is isolated',()=>{
  for(const signature of ['drop function if exists public.cerebro_marketing_crm_bootstrap_status_preprod(text,text)','drop function if exists public.cerebro_marketing_crm_bootstrap_record_preprod(text,text,text,timestamptz,text,text,integer,integer,text,text,text)','drop table if exists public.cerebro_marketing_crm_bootstrap_run_preprod']) assert.ok(rollback.includes(signature),signature);
  for(const preserved of ['cerebro_company_registry_preprod','cerebro_company_onboarding_preprod','cerebro_scan001_run_preprod','cerebro_post_scan_audit_run_preprod','cerebro_bootstrap_tier_run_preprod']) assert.equal(rollback.includes(`drop table if exists public.${preserved}`),false,preserved);
  assert.equal(/cascade/i.test(rollback),false);
});
