import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../multicompany/sql/final-onboarding-chain-preprod-v1.sql',import.meta.url),'utf8');
const rollback=fs.readFileSync(new URL('../multicompany/rollback/final-onboarding-chain-preprod-v1.rollback.sql',import.meta.url),'utf8');
const registry=JSON.parse(fs.readFileSync(new URL('../registry/multicompany-bootstrap.json',import.meta.url),'utf8'));

test('final onboarding persistence is one shared PREPROD zero-cost control plane',()=>{
  for(const phrase of ['cerebro_final_onboarding_run_preprod',"engine_id in ('APPBOOT-001','AUTBOOT-001','TRNBOOT-001','ENGACT-001')","environment='PREPROD'",'read_only=true','plan_only=true','publish_authorized=false','deploy_authorized=false','external_execution_authorized=false','enable row level security','to service_role','additional_cost_eur numeric(12,2) not null default 0']) assert.ok(migration.includes(phrase),phrase);
  assert.equal(migration.includes('fenix_prod.'),false);
  assert.equal(/\btruncate\b|\bdelete\s+from\b/i.test(migration),false);
});

test('canonical chain unlocks only direct dependencies in order',()=>{
  const deps=Object.fromEntries(registry.engines.map(e=>[e.engine_id,e.depends_on]));
  assert.deepEqual(deps['APPBOOT-001'].sort(),['KBOOT-001','CRMBOOT-001'].sort());
  assert.deepEqual(deps['AUTBOOT-001'].sort(),['CRMBOOT-001','APPBOOT-001'].sort());
  assert.deepEqual(deps['TRNBOOT-001'].sort(),['KBOOT-001','AUTBOOT-001'].sort());
  assert.ok(deps['ENGACT-001'].includes('TENANT-001'));
  assert.ok(migration.includes("if v_app='GREEN' and v_crm='GREEN' then"));
  assert.ok(migration.includes("engine_id='AUTBOOT-001' and state='BLOCKED'"));
  assert.ok(migration.includes("if v_aut='GREEN' and v_kboot='GREEN' then"));
  assert.ok(migration.includes("engine_id='TRNBOOT-001' and state='BLOCKED'"));
  assert.ok(migration.includes("engine_id='ENGACT-001' and state='BLOCKED'"));
});

test('full chain stops at LRN multi-company continuation and never PROD',()=>{
  assert.ok(migration.includes("'MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED'"));
  assert.ok(migration.includes("v_all_green:=(v_eng='GREEN' and v_activation_ready)"));
  for(const phrase of ["'prod_authorized',false","'prod_write_authorized',false","'trading_access',false","'additional_cost_eur',0"]) assert.ok(migration.includes(phrase),phrase);
  assert.equal(/prod_authorized[^\n]*true/i.test(migration),false);
  assert.equal(/prod_write_authorized[^\n]*true/i.test(migration),false);
  assert.equal(/trading_access[^\n]*true/i.test(migration),false);
});

test('canonical HUMAN_REQUIRED vocabulary stays exact',()=>{
  for(const code of ['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']) assert.ok(migration.includes(`'${code}'`),code);
  assert.ok(migration.includes("set state='HUMAN_REQUIRED',human_required_reason=v_human"));
});

test('tenant-safe status and exact rollback preserve earlier layers',()=>{
  assert.ok(migration.includes('cerebro_company_tenant_boundary_check_preprod(p_request_company_id,p_target_company_id)'));
  for(const signature of ['drop function if exists public.cerebro_final_onboarding_status_preprod(text,text)','drop function if exists public.cerebro_final_onboarding_record_preprod(text,text,text,timestamptz,text,text,integer,integer,text,text,text)','drop table if exists public.cerebro_final_onboarding_run_preprod']) assert.ok(rollback.includes(signature),signature);
  for(const preserved of ['cerebro_company_registry_preprod','cerebro_company_onboarding_preprod','cerebro_scan001_run_preprod','cerebro_post_scan_audit_run_preprod','cerebro_bootstrap_tier_run_preprod','cerebro_marketing_crm_bootstrap_run_preprod']) assert.equal(rollback.includes(`drop table if exists public.${preserved}`),false,preserved);
  assert.equal(/cascade/i.test(rollback),false);
});
