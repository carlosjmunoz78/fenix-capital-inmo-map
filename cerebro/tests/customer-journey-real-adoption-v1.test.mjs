import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runCustomerJourneyRealAdoption,CUSTOMER_JOURNEY_REQUIRED_CONSUMERS} from '../runtime/customer-journey-real-adoption-v1.mjs';

const SHA='3333333333333333333333333333333333333333';
const expected={'POST-001':'POST_SIGNATURE_JOURNEY_READY','CX-001':'CUSTOMER_EXPERIENCE_SCORED','RET-001':'RETENTION_AND_GROWTH_READY','REF-001':'REFERRAL_MOMENT_READY','REP-001':'REPUTATION_REVIEW_PLAN_READY','COM-001':'CUSTOMER_JOURNEY_COM_ROUTE_READY','SALE-001':'POSTSUCCESS_SALE_SIGNAL_READY','LRN-001':'LRN_FEEDBACK_PERSISTED','OBSERV-001':'OBSERVABILITY_RECORDED','FINOPS-001':'FINOPS_ZERO_COST_RECORDED'};

test('customer journey strict route reaches FULL_E2E_REAL_PREPROD',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'journey-real-'));
  const r=runCustomerJourneyRealAdoption({company_id:'fenix',root_dir:root,source_run_id:301,source_head_sha:SHA});
  assert.equal(r.status,'FULL_E2E_REAL_PREPROD');assert.equal(r.full_e2e_real_preprod,true);assert.deepEqual(r.required_consumers,[...CUSTOMER_JOURNEY_REQUIRED_CONSUMERS]);assert.equal(r.consumer_coverage,1);assert.equal(r.functional_consumer_coverage,1);assert.deepEqual(r.missing_consumers,[]);assert.deepEqual(r.failed_consumers,[]);
  for(const id of CUSTOMER_JOURNEY_REQUIRED_CONSUMERS){assert.equal(r.consumer_map[id].decision,expected[id]);assert.equal(r.consumer_map[id].real_consumption,true);assert.ok(r.consumer_map[id].outcome_hash);}
  assert.equal(r.independent_tribunal.decision,'PASS');assert.equal(r.audit_green,true);assert.equal(r.com_route.adapter_dispatch_authorized,false);assert.equal(r.sale_action.crm_write_authorized,false);assert.equal(r.journey_bundle.post.status,'JOURNEY_READY');assert.equal(r.journey_bundle.review.public_post_authorized,false);assert.equal(r.journey_bundle.referral.communication_intent.dispatch_authorized,false);
  assert.equal(r.backup_rollback_rebuild.backup_ready,true);assert.equal(r.backup_rollback_rebuild.rollback_green,true);assert.equal(r.backup_rollback_rebuild.rebuild_green,true);assert.equal(r.restartable,true);assert.equal(r.idempotency_proven,true);assert.equal(r.additional_cost_eur,0);
  for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','provider_write_authorized','crm_write_authorized','dispatch_authorized','public_review_post_authorized','spend_authorized','trading_access','external_code_execution'])assert.equal(r[k],false,k);
});

test('customer journey strict route is semantically idempotent across restart',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'journey-restart-'));
  const a=runCustomerJourneyRealAdoption({company_id:'fenix',root_dir:root,source_run_id:302,source_head_sha:SHA});const b=runCustomerJourneyRealAdoption({company_id:'fenix',root_dir:root,source_run_id:302,source_head_sha:SHA});
  assert.equal(a.bundle_id,b.bundle_id);assert.equal(a.semantic_outcome_hash,b.semantic_outcome_hash);assert.equal(a.journey_bundle.bundle_id,b.journey_bundle.bundle_id);assert.equal(a.com_route.route_plan_id,b.com_route.route_plan_id);assert.equal(a.sale_action.action_id,b.sale_action.action_id);assert.equal(b.full_e2e_real_preprod,true);assert.equal(b.idempotency_proven,true);
});
