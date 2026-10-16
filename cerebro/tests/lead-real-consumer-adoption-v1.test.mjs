import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildLeadProducerBundle,consumeLeadOutputReal,runLeadFullE2ERealV1,
  LEAD_REAL_REQUIRED_CONSUMERS,LEAD_REAL_OWNER_ENGINE_ID
} from '../runtime/lead-real-consumer-adoption-v1.mjs';

const HEAD='c'.repeat(40);
const wd=name=>fs.mkdtempSync(path.join(os.tmpdir(),`lead-real-${name}-`));
const clone=value=>structuredClone(value);
function consume(bundle,name,extra={}){return consumeLeadOutputReal({producer_bundle:bundle,workdir:wd(name),source_run_id:301,source_head_sha:HEAD,...extra});}

test('LEAD FULL E2E REAL requires all eight semantic consumers plus independent Tribunal',()=>{
  const r=runLeadFullE2ERealV1({workdir:wd('happy'),source_run_id:301,source_head_sha:HEAD});
  assert.equal(r.engine_id,LEAD_REAL_OWNER_ENGINE_ID);
  assert.equal(r.status,'FULL_E2E_REAL_PREPROD');
  assert.equal(r.full_e2e_real_preprod,true);
  assert.deepEqual(r.required_consumers,[...LEAD_REAL_REQUIRED_CONSUMERS]);
  assert.equal(r.required_consumers.length,8);
  assert.equal(r.consumers.length,8);
  assert.equal(r.consumer_coverage,1);
  assert.equal(r.functional_consumer_coverage,1);
  assert.deepEqual(r.missing_consumers,[]);
  assert.deepEqual(r.failed_consumers,[]);
  assert.ok(r.consumers.every(x=>x.real_consumption===true&&x.outcome_hash));
  assert.equal(r.independent_tribunal.decision,'PASS');
  assert.equal(r.learning_sink.decision,'LRN_FEEDBACK_PERSISTED');
  assert.equal(r.observability_consumer.decision,'OBSERVABILITY_RECORDED');
  assert.equal(r.finops_consumer.decision,'FINOPS_ZERO_COST_RECORDED');
  assert.equal(r.backup_rollback_rebuild.backup_ready,true);
  assert.equal(r.backup_rollback_rebuild.rollback_green,true);
  assert.equal(r.backup_rollback_rebuild.rebuild_green,true);
  assert.equal(r.additional_cost_eur,0);
  for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','provider_write_authorized','crm_write_authorized','spend_authorized','trading_access','android_touched','external_code_execution'])assert.equal(r[k],false);
});

test('producer proves native batch priority next-action replay chain with expected top lead',()=>{
  const b=buildLeadProducerBundle();
  assert.equal(b.native.batch.status,'READY');
  assert.equal(b.native.queue.status,'READY');
  assert.equal(b.native.action.status,'READY');
  assert.equal(b.native.replay.replay_green,true);
  assert.deepEqual(b.semantic_profile.ranked_refs,['lead-hot','lead-warm','lead-nurture']);
  assert.equal(b.semantic_profile.top_lead_ref,'lead-hot');
  assert.equal(b.semantic_profile.top_action,'CONTACT_NOW');
  assert.equal(b.semantic_profile.scored_count,3);
  assert.equal(b.semantic_profile.crm_write_authorized,false);
  assert.equal(b.additional_cost_eur,0);
  assert.equal(b.external_code_execution,false);
});

test('CRM consumer reacts when deterministic priority order is changed',()=>{
  const b=clone(buildLeadProducerBundle());
  b.semantic_profile.ranked_refs=['lead-warm','lead-hot','lead-nurture'];
  const r=consume(b,'crm');
  assert.equal(r.consumer_map['CRM-001'].decision,'CRM_PRIORITY_VIEW_HOLD');
  assert.equal(r.consumer_map['CRM-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('CRM-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('SALE consumer reacts when top-lead priority loses urgency',()=>{
  const b=clone(buildLeadProducerBundle());
  b.semantic_profile.lead_map['lead-hot'].priority=.5;
  const r=consume(b,'sale');
  assert.equal(r.consumer_map['SALE-001'].decision,'SALES_PRIORITY_HOLD');
  assert.equal(r.consumer_map['SALE-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('SALE-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('NBA consumer reacts when top-lead confidence falls below its action threshold',()=>{
  const b=clone(buildLeadProducerBundle());
  b.semantic_profile.lead_map['lead-hot'].confidence=.79;
  const r=consume(b,'nba');
  assert.equal(r.consumer_map['NBA-001'].decision,'NEXT_BEST_ACTION_HOLD');
  assert.equal(r.consumer_map['NBA-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('NBA-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('C360 consumer reacts when lead confidence falls below threshold',()=>{
  const b=clone(buildLeadProducerBundle());
  b.semantic_profile.lead_map['lead-warm'].confidence=.4;
  const r=consume(b,'c360');
  assert.equal(r.consumer_map['C360-001'].decision,'CUSTOMER360_LEAD_SIGNAL_HOLD');
  assert.equal(r.consumer_map['C360-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('C360-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('CAP consumer reacts when source-quality ordering is no longer true',()=>{
  const b=clone(buildLeadProducerBundle());
  b.semantic_profile.source_summary['web:seo'].priority=.1;
  const r=consume(b,'cap');
  assert.equal(r.consumer_map['CAP-001'].decision,'ACQUISITION_LEAD_FEEDBACK_HOLD');
  assert.equal(r.consumer_map['CAP-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('CAP-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('CRM-write authority tampering fails closed before downstream use',()=>{
  const semantic=clone(buildLeadProducerBundle());semantic.semantic_profile.crm_write_authorized=true;
  assert.throws(()=>consume(semantic,'semantic-crm-write'),/LEAD_CRM_WRITE_DENIED_REQUIRED/);
  const authority=clone(buildLeadProducerBundle());authority.crm_write_authorized=true;
  assert.throws(()=>consume(authority,'bundle-crm-write'),/LEAD_FORBIDDEN_AUTHORITY/);
});

test('durable rerun is idempotent for semantic state LRN OBSERV and FINOPS',()=>{
  const root=wd('restart');
  const a=runLeadFullE2ERealV1({workdir:root,source_run_id:301,source_head_sha:HEAD});
  const b=runLeadFullE2ERealV1({workdir:root,source_run_id:301,source_head_sha:HEAD});
  assert.equal(a.full_e2e_real_preprod,true);
  assert.equal(b.full_e2e_real_preprod,true);
  assert.equal(a.semantic_state_hash,b.semantic_state_hash);
  assert.equal(a.semantic_outcome_hash,b.semantic_outcome_hash);
  assert.equal(a.outcome_hash,b.outcome_hash);
  assert.equal(b.learning_sink.outcome.first_created_total,0);
  assert.equal(b.learning_sink.outcome.second_created_total,0);
  assert.equal(b.observability_consumer.outcome.records_for_correlation,1);
  assert.equal(b.finops_consumer.outcome.events,1);
  assert.equal(b.idempotency_proven,true);
});

test('backup rollback and rebuild reproduce exact five-consumer semantic state',()=>{
  const r=runLeadFullE2ERealV1({workdir:wd('rebuild'),source_run_id:301,source_head_sha:HEAD});
  const rr=r.backup_rollback_rebuild;
  assert.equal(rr.backup_ready,true);
  assert.equal(rr.rollback_green,true);
  assert.equal(rr.rebuild_green,true);
  assert.equal(rr.rebuilt_consumer_count,5);
  assert.equal(rr.applied_state_hash,rr.rebuilt_state_hash);
});

test('LRN feedback remains mandatory for FULL when semantic consumers are green',()=>{
  const r=consume(buildLeadProducerBundle(),'lrn',{emit_learning:false});
  assert.equal(r.consumer_map['CRM-001'].decision,'CRM_PRIORITY_VIEW_READY');
  assert.equal(r.consumer_map['CAP-001'].decision,'ACQUISITION_LEAD_FEEDBACK_READY');
  assert.equal(r.independent_tribunal.decision,'PASS');
  assert.equal(r.learning_sink.decision,'LRN_FEEDBACK_INCOMPLETE');
  assert.equal(r.consumer_coverage,.875);
  assert.equal(r.full_e2e_real_preprod,false);
});
