import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const evidence=JSON.parse(fs.readFileSync(path.join(root,'cerebro/evidence/multicompany-physical-e2e-acceptance-2026-10-14.json'),'utf8'));
const sql=fs.readFileSync(path.join(root,'cerebro/multicompany/acceptance/physical-e2e-preprod-v1.sql'),'utf8');

const expectedStages=['COMP-REG-001','COMP-ONB-001','SCAN-001','KW-001','WAUD-001','SOCAUD-001','LOCALP-001','KBOOT-001','SEOBOOT-001','SOCBOOT-001','MKTBOOT-001','CRMBOOT-001','APPBOOT-001','AUTBOOT-001','TRNBOOT-001','ENGACT-001','LRN-001'];
const expectedFunctions=['cerebro_company_register_preprod','cerebro_company_onboarding_start_preprod','cerebro_scan001_record_success_preprod','cerebro_post_scan_audit_record_preprod','cerebro_bootstrap_tier_record_preprod','cerebro_marketing_crm_bootstrap_record_preprod','cerebro_final_onboarding_record_preprod','cerebro_lrn001_record_preprod'];

test('physical E2E evidence closes only the synthetic PREPROD control-plane gate',()=>{
  assert.equal(evidence.state,'MULTICOMPANY_CONTROL_PLANE_PHYSICAL_E2E_GREEN');
  assert.equal(evidence.scope,'SYNTHETIC_NEW_COMPANY_DURABLE_CONTROL_PLANE');
  assert.equal(evidence.gate_closed,'MULTICOMPANY_PHYSICAL_E2E_ACCEPTANCE_REQUIRED');
  assert.deepEqual(evidence.happy_path.stages,expectedStages);
  assert.equal(evidence.happy_path.seventeen_onboarding_engines_green,true);
  assert.equal(evidence.happy_path.lrn_continuation_eligible,true);
  assert.equal(evidence.happy_path.tribunal_verdict,'NEW_BETTER');
  assert.equal(evidence.happy_path.rollback_ref_present,true);
});

test('replay script composes existing durable functions instead of fabricating a parallel runtime',()=>{
  for(const fn of expectedFunctions) assert.ok(sql.includes(fn),`${fn} missing`);
  for(const engine of expectedStages.slice(3,16)) assert.ok(sql.includes(engine),`${engine} missing`);
  assert.match(sql,/^begin;/m);
  assert.match(sql,/rollback;\s*$/m);
  assert.match(sql,/green_count<>17/);
  assert.match(sql,/LOW_CONFIDENCE/);
  assert.match(sql,/HUMAN_REQUIRED/);
  assert.match(sql,/KBOOT-001/);
  assert.match(sql,/DENY_CROSS_COMPANY|tenant_boundary_check_preprod/);
  assert.match(sql,/NEW_BETTER/);
  assert.match(sql,/rollback:e2e:001/);
});

test('human exception and tenant isolation fail closed',()=>{
  assert.equal(evidence.human_exception_path.reason,'LOW_CONFIDENCE');
  assert.equal(evidence.human_exception_path.engine_state,'HUMAN_REQUIRED');
  assert.equal(evidence.human_exception_path.dependent_state,'BLOCKED');
  assert.equal(evidence.human_exception_path.silent_downstream_unlock,false);
  assert.equal(evidence.tenant_isolation.cross_company_access_allowed,false);
});

test('security remains PREPROD/service-role bounded and zero cost',()=>{
  assert.equal(evidence.security.durable_record_functions_checked,8);
  assert.equal(evidence.security.anon_execute_all,false);
  assert.equal(evidence.security.authenticated_execute_all,false);
  assert.equal(evidence.security.service_role_execute_all,true);
  assert.equal(evidence.security.durable_tables_checked,11);
  assert.equal(evidence.security.rls_enabled_all,true);
  assert.equal(evidence.security.anon_select_all,false);
  assert.equal(evidence.security.authenticated_select_all,false);
  assert.equal(evidence.security.prod_authorized,false);
  assert.equal(evidence.security.prod_write_authorized,false);
  assert.equal(evidence.security.trading_access,false);
  assert.equal(evidence.security.additional_cost_eur,0);
});

test('transaction cleanup left zero synthetic rows in every durable layer',()=>{
  for(const [name,count] of Object.entries(evidence.post_transaction_rollback)) assert.equal(count,0,`${name} not zero`);
});

test('evidence does not overclaim real channel or PROD autonomy',()=>{
  assert.ok(evidence.not_claimed.includes('ALL_REAL_ACTION_CHANNELS_E2E_GREEN'));
  assert.ok(evidence.not_claimed.includes('PROD_AUTONOMY'));
  assert.ok(evidence.not_claimed.includes('REAL_EXTERNAL_WEB_SCAN_EXECUTED_IN_THIS_ACCEPTANCE'));
  assert.ok(evidence.next_required_work.includes('AUTHENTICATED_REAL_ACTION_AND_CHANNEL_E2E'));
  assert.ok(evidence.next_required_work.includes('GLOBAL_HUMAN_BY_EXCEPTION_AUTONOMY_AUDIT'));
});
