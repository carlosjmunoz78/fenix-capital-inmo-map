import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runSaleRealConsumerAdoption,SALE_REAL_REQUIRED_CONSUMERS} from '../runtime/sale-real-consumer-adoption-v1.mjs';

const SHA='1111111111111111111111111111111111111111';

test('SALE strict route reaches FULL_E2E_REAL_PREPROD with all required consumers',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'sale-real-test-'));
  const r=runSaleRealConsumerAdoption({company_id:'fenix',root_dir:root,source_run_id:101,source_head_sha:SHA});
  assert.equal(r.status,'FULL_E2E_REAL_PREPROD');
  assert.equal(r.full_e2e_real_preprod,true);
  assert.deepEqual(r.required_consumers,[...SALE_REAL_REQUIRED_CONSUMERS]);
  assert.equal(r.consumer_coverage,1);
  assert.equal(r.functional_consumer_coverage,1);
  assert.deepEqual(r.missing_consumers,[]);
  assert.deepEqual(r.failed_consumers,[]);
  assert.equal(r.independent_tribunal.decision,'PASS');
  assert.equal(r.learning_sink.decision,'LRN_FEEDBACK_PERSISTED');
  assert.equal(r.observability_consumer.decision,'OBSERVABILITY_RECORDED');
  assert.equal(r.finops_consumer.decision,'FINOPS_ZERO_COST_RECORDED');
  assert.equal(r.audit_green,true);
  assert.equal(r.com_route.route_status,'READY_FOR_ADAPTER_GATE');
  assert.equal(r.com_route.adapter_dispatch_authorized,false);
  assert.equal(r.additional_cost_eur,0);
  assert.equal(r.prod_authorized,false);
  assert.equal(r.prod_write_authorized,false);
  assert.equal(r.crm_write_authorized,false);
  assert.equal(r.provider_write_authorized,false);
  assert.equal(r.trading_access,false);
  assert.equal(r.external_code_execution,false);
  assert.equal(r.backup_rollback_rebuild.backup_ready,true);
  assert.equal(r.backup_rollback_rebuild.rollback_green,true);
  assert.equal(r.backup_rollback_rebuild.rebuild_green,true);
  assert.equal(r.idempotency_proven,true);
});

test('SALE strict route is restartable and idempotent on the same durable root',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'sale-real-restart-'));
  const a=runSaleRealConsumerAdoption({company_id:'fenix',root_dir:root,source_run_id:102,source_head_sha:SHA});
  const b=runSaleRealConsumerAdoption({company_id:'fenix',root_dir:root,source_run_id:102,source_head_sha:SHA});
  assert.equal(a.bundle_id,b.bundle_id);
  assert.equal(a.semantic_outcome_hash,b.semantic_outcome_hash);
  assert.equal(a.outcome_hash,b.outcome_hash);
  assert.equal(b.full_e2e_real_preprod,true);
  assert.equal(b.idempotency_proven,true);
});

test('SALE strict report proves semantic decisions, not receipt-only consumers',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'sale-real-semantic-'));
  const r=runSaleRealConsumerAdoption({company_id:'fenix',root_dir:root,source_run_id:103,source_head_sha:SHA});
  const expected={
    'COM-001':'COM_ROUTE_READY','NBA-001':'SALES_NEXT_BEST_ACTION_READY','C360-001':'CUSTOMER360_SALES_SIGNAL_READY','CRM-001':'CRM_SALES_PROJECTION_READY',
    'LRN-001':'LRN_FEEDBACK_PERSISTED','OBSERV-001':'OBSERVABILITY_RECORDED','FINOPS-001':'FINOPS_ZERO_COST_RECORDED'
  };
  for(const id of SALE_REAL_REQUIRED_CONSUMERS){
    assert.equal(r.consumer_map[id].decision,expected[id]);
    assert.equal(r.consumer_map[id].real_consumption,true);
    assert.ok(r.consumer_map[id].outcome_hash);
  }
});
