import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const config=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../registry/compet-real-targets.v0.json'),'utf8'));

test('COMPET real targets remain PREPROD, public and company scoped',()=>{
  assert.equal(config.company_id,'fenix');
  assert.equal(config.engine_id,'COMPET-001');
  assert.equal(config.environment,'PREPROD');
  assert.equal(config.source_policy,'PUBLIC_OFFICIAL_COMPETITOR_WEBSITE_GET_ONLY');
  assert.equal(config.targets.length,3);
  for(const target of config.targets){
    const u=new URL(target.url);
    assert.equal(u.protocol,'https:');
    assert.match(target.competitor_id,/^[a-z0-9-]+$/);
    assert.equal(target.geography,'cordoba');
  }
});

test('real baselines and three genuine scheduled runs are certified without granting side effects',()=>{
  assert.equal(config.status,'REAL_TARGETS_CONTINUOUS_PREPROD_ACCEPTANCE_GREEN');
  assert.equal(config.baseline_capture.result,'GREEN');
  assert.equal(config.targets.every(t=>t.baseline&&typeof t.baseline.body_sha256==='string'&&t.baseline.body_sha256.length===64),true);
  assert.equal(config.scheduler.configured,true);
  assert.equal(config.scheduler.kind,'GITHUB_ACTIONS_CRON');
  assert.equal(config.scheduler.cron,'43 5 * * *');
  assert.equal(config.scheduler.soak_complete,true);
  assert.equal(config.scheduler.required_scheduled_green_runs,3);
  assert.equal(config.scheduler.verified_scheduled_green_runs,3);
  assert.equal(config.scheduler.qualifying_run_ids.length,3);
  assert.equal(new Set(config.scheduler.qualifying_run_ids).size,3);
  assert.equal(config.scheduled_soak_certification.verified_scheduled_green_runs,3);
  assert.equal(config.scheduled_soak_certification.missing_scheduled_green_runs,0);
  assert.equal(config.scheduled_soak_certification.manual_or_dispatch_substitution,false);
  assert.equal(config.remaining_gate,null);
});

test('data minimization and authority are fail closed',()=>{
  assert.equal(config.data_minimization.personal_data,false);
  assert.equal(config.data_minimization.customer_data,false);
  assert.equal(config.data_minimization.body_persisted,false);
  assert.equal(config.data_minimization.contacts_extracted,false);
  const a=config.authority;
  assert.equal(a.prod_authorized,false);
  assert.equal(a.prod_write_authorized,false);
  assert.equal(a.provider_write_authorized,false);
  assert.equal(a.customer_data_authorized,false);
  assert.equal(a.external_dependency_install_authorized,false);
  assert.equal(a.trading_access,false);
  assert.equal(a.automatic_paid_fallback,false);
  assert.equal(a.additional_cost_eur,0);
});
