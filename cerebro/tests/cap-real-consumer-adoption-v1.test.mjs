import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildCapProducerBundle,consumeCapOutputReal,runCapFullE2ERealV1,
  CAP_REAL_REQUIRED_CONSUMERS,CAP_REAL_OWNER_ENGINE_ID
} from '../runtime/cap-real-consumer-adoption-v1.mjs';

const HEAD='d'.repeat(40);
const wd=name=>fs.mkdtempSync(path.join(os.tmpdir(),`cap-real-${name}-`));
const clone=value=>structuredClone(value);
function consume(bundle,name,extra={}){return consumeCapOutputReal({producer_bundle:bundle,workdir:wd(name),source_run_id:201,source_head_sha:HEAD,...extra});}

test('CAP FULL E2E REAL requires all eight semantic consumers plus independent Tribunal',()=>{
  const r=runCapFullE2ERealV1({workdir:wd('happy'),source_run_id:201,source_head_sha:HEAD});
  assert.equal(r.engine_id,CAP_REAL_OWNER_ENGINE_ID);
  assert.equal(r.status,'FULL_E2E_REAL_PREPROD');
  assert.equal(r.full_e2e_real_preprod,true);
  assert.deepEqual(r.required_consumers,[...CAP_REAL_REQUIRED_CONSUMERS]);
  assert.equal(r.required_consumers.length,8);
  assert.equal(r.consumers.length,8);
  assert.equal(r.consumer_coverage,1);
  assert.equal(r.functional_consumer_coverage,1);
  assert.deepEqual(r.missing_consumers,[]);
  assert.deepEqual(r.failed_consumers,[]);
  assert.ok(r.consumers.every(x=>x.real_consumption===true&&x.outcome_hash));
  assert.equal(r.evaluation_consumer.decision,'CAP_EVALUATION_READY');
  assert.equal(r.independent_tribunal.decision,'PASS');
  assert.equal(r.learning_sink.decision,'LRN_FEEDBACK_PERSISTED');
  assert.equal(r.observability_consumer.decision,'OBSERVABILITY_RECORDED');
  assert.equal(r.finops_consumer.decision,'FINOPS_ZERO_COST_RECORDED');
  assert.equal(r.backup_rollback_rebuild.backup_ready,true);
  assert.equal(r.backup_rollback_rebuild.rollback_green,true);
  assert.equal(r.backup_rollback_rebuild.rebuild_green,true);
  assert.equal(r.additional_cost_eur,0);
  assert.equal(r.recommended_new_spend_eur,0);
  for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','provider_write_authorized','crm_write_authorized','spend_authorized','trading_access','android_touched','external_code_execution'])assert.equal(r[k],false);
});

test('producer proves native score experiment stop-scale plan replay chain without new spend',()=>{
  const b=buildCapProducerBundle();
  assert.equal(b.native.scores.status,'READY');
  assert.equal(b.native.experiment.status,'READY');
  assert.equal(b.native.decisions.status,'READY');
  assert.equal(b.native.plan.status,'READY_FOR_REVIEW_OR_ZERO_COST_EXECUTION');
  assert.equal(b.native.replay.replay_green,true);
  assert.equal(b.semantic_profile.winner_channel_id,'referral');
  assert.deepEqual(b.semantic_profile.channel_ids,['meta','referral','seo']);
  assert.equal(b.native.plan.recommended_new_spend_eur,0);
  assert.equal(b.native.plan.provider_execution_authorized,false);
  assert.equal(b.additional_cost_eur,0);
  assert.equal(b.external_code_execution,false);
});

test('MKT consumer reacts when paid-channel semantic score loses viability',()=>{
  const b=clone(buildCapProducerBundle());
  b.semantic_profile.channel_map.meta.score=10;
  const r=consume(b,'mkt');
  assert.equal(r.consumer_map['MKT-001'].decision,'MARKETING_CHANNEL_MIX_HOLD');
  assert.equal(r.consumer_map['MKT-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('MKT-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('SEO consumer reacts when qualified organic lead ratio falls',()=>{
  const b=clone(buildCapProducerBundle());
  b.semantic_profile.channel_map.seo.qualified_leads=1;
  const r=consume(b,'seo');
  assert.equal(r.consumer_map['SEO-001'].decision,'SEO_ACQUISITION_SCALE_HOLD');
  assert.equal(r.consumer_map['SEO-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('SEO-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('WEB consumer reacts when experiment landing evidence becomes unusable',()=>{
  const b=clone(buildCapProducerBundle());
  b.semantic_profile.experiment_arms[1].landing_ref='none';
  const r=consume(b,'web');
  assert.equal(r.consumer_map['WEB-001'].decision,'WEB_LANDING_OPTIMIZATION_HOLD');
  assert.equal(r.consumer_map['WEB-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('WEB-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('LEAD consumer reacts when aggregate qualification signal degrades',()=>{
  const b=clone(buildCapProducerBundle());
  b.semantic_profile.totals.qualified_leads=1;
  const r=consume(b,'lead');
  assert.equal(r.consumer_map['LEAD-001'].decision,'LEAD_QUALITY_SIGNAL_HOLD');
  assert.equal(r.consumer_map['LEAD-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('LEAD-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('EVA consumer and independent Tribunal react to a wrong winner decision',()=>{
  const b=clone(buildCapProducerBundle());
  b.semantic_profile.winner_channel_id='seo';
  b.native.scores.winner_channel_id='seo';
  const r=consume(b,'eva');
  assert.equal(r.consumer_map['EVA-001'].decision,'CAP_EVALUATION_HOLD');
  assert.equal(r.consumer_map['EVA-001'].outcome.action,'NO_CHANGE');
  assert.notEqual(r.independent_tribunal.decision,'PASS');
  assert.ok(r.failed_consumers.includes('EVA-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('new spend or provider-write authority tampering fails closed before downstream use',()=>{
  const spend=clone(buildCapProducerBundle());spend.semantic_profile.recommended_new_spend_eur=1;
  assert.throws(()=>consume(spend,'spend'),/CAP_NO_NEW_SPEND_OR_PROVIDER_WRITE_REQUIRED/);
  const provider=clone(buildCapProducerBundle());provider.semantic_profile.provider_execution_authorized=true;
  assert.throws(()=>consume(provider,'provider'),/CAP_NO_NEW_SPEND_OR_PROVIDER_WRITE_REQUIRED/);
});

test('durable rerun is idempotent for semantic state LRN OBSERV and FINOPS',()=>{
  const root=wd('restart');
  const a=runCapFullE2ERealV1({workdir:root,source_run_id:201,source_head_sha:HEAD});
  const b=runCapFullE2ERealV1({workdir:root,source_run_id:201,source_head_sha:HEAD});
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
  const r=runCapFullE2ERealV1({workdir:wd('rebuild'),source_run_id:201,source_head_sha:HEAD});
  const rr=r.backup_rollback_rebuild;
  assert.equal(rr.backup_ready,true);
  assert.equal(rr.rollback_green,true);
  assert.equal(rr.rebuild_green,true);
  assert.equal(rr.rebuilt_consumer_count,5);
  assert.equal(rr.applied_state_hash,rr.rebuilt_state_hash);
});

test('LRN feedback remains mandatory for FULL when semantic consumers are green',()=>{
  const r=consume(buildCapProducerBundle(),'lrn',{emit_learning:false});
  assert.equal(r.consumer_map['MKT-001'].decision,'MARKETING_CHANNEL_MIX_READY');
  assert.equal(r.consumer_map['EVA-001'].decision,'CAP_EVALUATION_READY');
  assert.equal(r.independent_tribunal.decision,'PASS');
  assert.equal(r.learning_sink.decision,'LRN_FEEDBACK_INCOMPLETE');
  assert.equal(r.consumer_coverage,0.875);
  assert.equal(r.full_e2e_real_preprod,false);
});
