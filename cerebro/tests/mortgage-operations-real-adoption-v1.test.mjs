import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runMortgageOperationsRealAdoption,MORTGAGE_REQUIRED_CONSUMERS} from '../runtime/mortgage-operations-real-adoption-v1.mjs';

const SHA='4444444444444444444444444444444444444444';
const expected={'VIA-001':'MORTGAGE_VIABILITY_READY','BNK-001':'BANK_KNOWLEDGE_READY','BNK-002':'BANK_RANKING_READY','BNK-003':'BANK_ROUTING_PLAN_READY','BNK-004':'BANK_PRESENTATION_PLAN_READY','BNK-005':'BANK_FOLLOWUP_PLAN_READY','BNK-006':'BANK_NEGOTIATION_PLAN_READY','OFR-001':'OFFER_COMPARISON_READY','LRN-001':'LRN_FEEDBACK_PERSISTED','OBSERV-001':'OBSERVABILITY_RECORDED','FINOPS-001':'FINOPS_ZERO_COST_RECORDED'};

test('mortgage operations strict route reaches FULL_E2E_REAL_PREPROD',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mortgage-real-'));
  const r=runMortgageOperationsRealAdoption({company_id:'fenix',root_dir:root,source_run_id:401,source_head_sha:SHA});
  assert.equal(r.status,'FULL_E2E_REAL_PREPROD');assert.equal(r.full_e2e_real_preprod,true);assert.deepEqual(r.required_consumers,[...MORTGAGE_REQUIRED_CONSUMERS]);assert.equal(r.consumer_coverage,1);assert.equal(r.functional_consumer_coverage,1);assert.deepEqual(r.missing_consumers,[]);assert.deepEqual(r.failed_consumers,[]);
  for(const id of MORTGAGE_REQUIRED_CONSUMERS){assert.equal(r.consumer_map[id].decision,expected[id]);assert.equal(r.consumer_map[id].real_consumption,true);assert.ok(r.consumer_map[id].outcome_hash);}
  assert.equal(r.independent_tribunal.decision,'PASS');assert.equal(r.audit_green,true);assert.equal(r.mortgage_bundle.actual_credit_decision,false);assert.equal(r.mortgage_bundle.actual_bank_submission,false);assert.equal(r.mortgage_bundle.actual_external_contact,false);assert.equal(r.mortgage_bundle.viability.credit_decision,false);assert.equal(r.mortgage_bundle.presentation.bank_submission_authorized,false);assert.equal(r.mortgage_bundle.followup.external_communication,false);assert.equal(r.mortgage_bundle.negotiation.external_communication,false);
  assert.equal(r.backup_rollback_rebuild.backup_ready,true);assert.equal(r.backup_rollback_rebuild.rollback_green,true);assert.equal(r.backup_rollback_rebuild.rebuild_green,true);assert.equal(r.restartable,true);assert.equal(r.idempotency_proven,true);assert.equal(r.additional_cost_eur,0);
  for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','crm_write_authorized','provider_write_authorized','bank_submission_authorized','credit_decision_authorized','external_communication_authorized','spend_authorized','trading_access','external_code_execution'])assert.equal(r[k],false,k);
});

test('mortgage strict route is semantically idempotent across restart',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mortgage-restart-'));
  const a=runMortgageOperationsRealAdoption({company_id:'fenix',root_dir:root,source_run_id:402,source_head_sha:SHA});const b=runMortgageOperationsRealAdoption({company_id:'fenix',root_dir:root,source_run_id:402,source_head_sha:SHA});
  assert.equal(a.bundle_id,b.bundle_id);assert.equal(a.semantic_outcome_hash,b.semantic_outcome_hash);assert.equal(a.mortgage_bundle.bundle_id,b.mortgage_bundle.bundle_id);assert.equal(a.mortgage_bundle.ranking.ranking_id,b.mortgage_bundle.ranking.ranking_id);assert.equal(a.mortgage_bundle.offers.comparison_id,b.mortgage_bundle.offers.comparison_id);assert.equal(b.full_e2e_real_preprod,true);assert.equal(b.idempotency_proven,true);
});
