import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildCompetProducerBundle,consumeCompetOutputReal,runCompetFullE2ERealV1,
  COMPET_REAL_REQUIRED_CONSUMERS,COMPET_REAL_OWNER_ENGINE_ID
} from '../runtime/compet-real-consumer-adoption-v1.mjs';

const HEAD='e'.repeat(40);
const wd=name=>fs.mkdtempSync(path.join(os.tmpdir(),`compet-real-${name}-`));
const clone=value=>structuredClone(value);
function consume(bundle,name,extra={}){return consumeCompetOutputReal({producer_bundle:bundle,workdir:wd(name),source_run_id:101,source_head_sha:HEAD,...extra});}

test('COMPET FULL E2E REAL requires all declared semantic consumers plus Tribunal and LRN',()=>{
  const r=runCompetFullE2ERealV1({workdir:wd('happy'),source_run_id:101,source_head_sha:HEAD});
  assert.equal(r.engine_id,COMPET_REAL_OWNER_ENGINE_ID);
  assert.equal(r.status,'FULL_E2E_REAL_PREPROD');
  assert.equal(r.full_e2e_real_preprod,true);
  assert.deepEqual(r.required_consumers,[...COMPET_REAL_REQUIRED_CONSUMERS]);
  assert.equal(r.required_consumers.length,8);
  assert.equal(r.consumers.length,8);
  assert.equal(r.consumer_coverage,1);
  assert.equal(r.functional_consumer_coverage,1);
  assert.deepEqual(r.missing_consumers,[]);
  assert.deepEqual(r.failed_consumers,[]);
  assert.ok(r.consumers.every(x=>x.real_consumption===true&&x.outcome_hash));
  assert.equal(r.evaluation_consumer.decision,'TRIBUNAL_PASS');
  assert.equal(r.learning_sink.decision,'LRN_FEEDBACK_PERSISTED');
  assert.equal(r.observability_consumer.decision,'OBSERVABILITY_RECORDED');
  assert.equal(r.finops_consumer.decision,'FINOPS_ZERO_COST_RECORDED');
  assert.equal(r.backup_rollback_rebuild.backup_ready,true);
  assert.equal(r.backup_rollback_rebuild.rollback_green,true);
  assert.equal(r.backup_rollback_rebuild.rebuild_green,true);
  assert.equal(r.additional_cost_eur,0);
  for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','provider_write_authorized','crm_write_authorized','spend_authorized','trading_access','android_touched','external_code_execution'])assert.equal(r[k],false);
});

test('producer proves native watch-plan cycle dossier replay chain with all competitor dimensions',()=>{
  const b=buildCompetProducerBundle();
  assert.equal(b.native.plan.status,'READY');
  assert.equal(b.native.cycle.status,'GREEN');
  assert.equal(b.native.dossier.status,'READY');
  assert.equal(b.native.replay.replay_green,true);
  assert.deepEqual(b.semantic_profile.dimensions_present,['campaigns','expansion','offer','positioning','pricing','seo']);
  assert.equal(b.native.cycle.change_count,7);
  assert.equal(b.additional_cost_eur,0);
  assert.equal(b.external_code_execution,false);
});

test('RSH consumer reacts when research evidence quality falls',()=>{
  const b=clone(buildCompetProducerBundle());
  b.semantic_profile.high_confidence_count=1;
  const r=consume(b,'rsh');
  assert.equal(r.consumer_map['RSH-001'].decision,'COMPET_RESEARCH_EVIDENCE_HOLD');
  assert.equal(r.consumer_map['RSH-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('RSH-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('SEO consumer reacts when SEO competitor evidence confidence falls',()=>{
  const b=clone(buildCompetProducerBundle());
  for(const x of b.native.cycle.changes)if(x.dimension==='seo')x.confidence=0.4;
  const r=consume(b,'seo');
  assert.equal(r.consumer_map['SEO-001'].decision,'SEO_COMPETITOR_GAP_HOLD');
  assert.equal(r.consumer_map['SEO-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('SEO-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('MKT consumer reacts when campaign evidence confidence falls',()=>{
  const b=clone(buildCompetProducerBundle());
  for(const x of b.native.cycle.changes)if(x.dimension==='campaigns')x.confidence=0.2;
  const r=consume(b,'mkt');
  assert.equal(r.consumer_map['MKT-001'].decision,'MARKETING_COMPETITOR_RESPONSE_HOLD');
  assert.equal(r.consumer_map['MKT-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('MKT-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('EXPAND consumer reacts when competitor expansion no longer reaches Cordoba',()=>{
  const b=clone(buildCompetProducerBundle());
  for(const x of b.native.cycle.changes)if(x.dimension==='expansion')x.after={markets:['Sevilla']};
  const r=consume(b,'expand');
  assert.equal(r.consumer_map['EXPAND-001'].decision,'EXPANSION_COMPETITOR_ALERT_HOLD');
  assert.equal(r.consumer_map['EXPAND-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('EXPAND-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('INN consumer reacts when differentiating Hipoteca 100 signal disappears',()=>{
  const b=clone(buildCompetProducerBundle());
  for(const x of b.native.cycle.changes)if(x.dimension==='offer')x.after={product:'Hipoteca 95',audience:'families'};
  for(const x of b.native.cycle.changes)if(x.dimension==='positioning'&&x.competitor_id==='rival-a')x.after={claim:'Broker hipotecario local'};
  const r=consume(b,'inn');
  assert.equal(r.consumer_map['INN-001'].decision,'INNOVATION_COMPETITOR_OPPORTUNITY_HOLD');
  assert.equal(r.consumer_map['INN-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('INN-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('semantic provenance tampering is rejected before downstream use',()=>{
  const b=clone(buildCompetProducerBundle());
  b.native.dossier.provenance_hash='tampered';
  assert.throws(()=>consume(b,'provenance'),/COMPET_SEMANTIC_PROVENANCE_MISMATCH/);
});

test('durable rerun is idempotent for semantic state LRN OBSERV and FINOPS',()=>{
  const root=wd('restart');
  const a=runCompetFullE2ERealV1({workdir:root,source_run_id:101,source_head_sha:HEAD});
  const b=runCompetFullE2ERealV1({workdir:root,source_run_id:101,source_head_sha:HEAD});
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

test('backup rollback and rebuild reproduce exact semantic consumer state',()=>{
  const r=runCompetFullE2ERealV1({workdir:wd('rebuild'),source_run_id:101,source_head_sha:HEAD});
  const rr=r.backup_rollback_rebuild;
  assert.equal(rr.backup_ready,true);
  assert.equal(rr.rollback_green,true);
  assert.equal(rr.rebuild_green,true);
  assert.equal(rr.rebuilt_consumer_count,5);
  assert.equal(rr.applied_state_hash,rr.rebuilt_state_hash);
});

test('LRN feedback remains mandatory for FULL when direct consumers are green',()=>{
  const r=consume(buildCompetProducerBundle(),'lrn',{emit_learning:false});
  assert.equal(r.consumer_map['RSH-001'].decision,'COMPET_RESEARCH_EVIDENCE_PACKET_READY');
  assert.equal(r.consumer_map['INN-001'].decision,'INNOVATION_COMPETITOR_OPPORTUNITY_READY');
  assert.equal(r.evaluation_consumer.decision,'TRIBUNAL_PASS');
  assert.equal(r.learning_sink.decision,'LRN_FEEDBACK_INCOMPLETE');
  assert.equal(r.consumer_coverage,0.875);
  assert.equal(r.full_e2e_real_preprod,false);
});
