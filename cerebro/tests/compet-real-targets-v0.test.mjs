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

test('baseline capture does not pretend continuous validation is already complete',()=>{
  assert.equal(config.status,'REAL_TARGETS_CONFIGURED_BASELINE_CAPTURE_PENDING');
  assert.equal(config.targets.every(t=>t.baseline===null),true);
  assert.equal(config.next_gate,'CAPTURE_AND_FREEZE_INITIAL_REAL_TARGET_BASELINES_THEN_ENABLE_CONTINUOUS_PREPROD_SCAN');
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
