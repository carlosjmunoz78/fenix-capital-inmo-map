import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runLote3ComNotifC360} from '../runtime/lote3-com-notif-c360-real-v1.mjs';

const SHA='2222222222222222222222222222222222222222';
const expected={
  'COM-001':'COM_ROUTE_READY','NOTIF-001':'NOTIFICATION_PLAN_READY','C360-001':'CUSTOMER360_PROJECTION_READY','NBA-001':'CUSTOMER_NEXT_BEST_ACTION_READY','LRN-001':'LRN_FEEDBACK_PERSISTED','OBSERV-001':'OBSERVABILITY_RECORDED','FINOPS-001':'FINOPS_ZERO_COST_RECORDED'
};

test('LOTE3 COM NOTIF C360 closes strict FULL_E2E_REAL_PREPROD',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'lote3-real-'));
  const r=runLote3ComNotifC360({company_id:'fenix',root_dir:root,source_run_id:201,source_head_sha:SHA});
  assert.equal(r.status,'FULL_E2E_REAL_PREPROD');assert.equal(r.full_e2e_real_preprod,true);assert.equal(r.consumer_coverage,1);assert.equal(r.functional_consumer_coverage,1);assert.deepEqual(r.missing_consumers,[]);assert.deepEqual(r.failed_consumers,[]);
  for(const [id,decision] of Object.entries(expected)){assert.equal(r.consumer_map[id].decision,decision);assert.equal(r.consumer_map[id].real_consumption,true);assert.ok(r.consumer_map[id].outcome_hash);}
  assert.equal(r.independent_tribunal.decision,'PASS');assert.equal(r.audit_green,true);assert.equal(r.com_route.adapter_dispatch_authorized,false);assert.equal(r.notification_plan.dispatch_authorized,false);assert.equal(r.customer360_projection.read_only,true);assert.equal(r.customer360_projection.crm_write_authorized,false);assert.equal(r.additional_cost_eur,0);
  for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','provider_write_authorized','crm_write_authorized','dispatch_authorized','spend_authorized','trading_access','android_touched','external_code_execution'])assert.equal(r[k],false,k);
  assert.equal(r.backup_rollback_rebuild.backup_ready,true);assert.equal(r.backup_rollback_rebuild.rollback_green,true);assert.equal(r.backup_rollback_rebuild.rebuild_green,true);assert.equal(r.restartable,true);assert.equal(r.idempotency_proven,true);
});

test('LOTE3 strict route remains semantically idempotent across restart',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'lote3-restart-'));
  const a=runLote3ComNotifC360({company_id:'fenix',root_dir:root,source_run_id:202,source_head_sha:SHA});
  const b=runLote3ComNotifC360({company_id:'fenix',root_dir:root,source_run_id:202,source_head_sha:SHA});
  assert.equal(a.bundle_id,b.bundle_id);assert.equal(a.semantic_outcome_hash,b.semantic_outcome_hash);assert.equal(a.com_route.route_plan_id,b.com_route.route_plan_id);assert.equal(a.notification_plan.plan_id,b.notification_plan.plan_id);assert.equal(a.customer360_projection.projection_id,b.customer360_projection.projection_id);assert.equal(b.full_e2e_real_preprod,true);assert.equal(b.idempotency_proven,true);
});
