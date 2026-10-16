import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildTechnologyScoutProducerBundle,consumeTechnologyScoutOutputReal,runTechnologyScoutFullE2ERealV1,
  TECH_SCOUT_REAL_REQUIRED_CONSUMERS,TECH_SCOUT_REAL_OWNER_ENGINE_ID
} from '../runtime/technology-capability-scout-real-consumer-adoption-v1.mjs';

const HEAD='d'.repeat(40);
const wd=name=>fs.mkdtempSync(path.join(os.tmpdir(),`tech-scout-real-${name}-`));
const clone=value=>structuredClone(value);
async function consume(bundle,name,extra={}){return consumeTechnologyScoutOutputReal({producer_bundle:bundle,workdir:wd(name),source_run_id:92,source_head_sha:HEAD,...extra});}

test('TECH-CAP-SCOUT FULL E2E REAL requires all declared semantic consumers plus Tribunal and LRN',async()=>{
  const r=await runTechnologyScoutFullE2ERealV1({workdir:wd('happy'),source_run_id:92,source_head_sha:HEAD});
  assert.equal(r.engine_id,TECH_SCOUT_REAL_OWNER_ENGINE_ID);
  assert.equal(r.status,'FULL_E2E_REAL_PREPROD');
  assert.equal(r.full_e2e_real_preprod,true);
  assert.deepEqual(r.required_consumers,[...TECH_SCOUT_REAL_REQUIRED_CONSUMERS]);
  assert.equal(r.required_consumers.length,10);
  assert.equal(r.consumers.length,10);
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
  assert.equal(r.prod_authorized,false);
  assert.equal(r.provider_write_authorized,false);
  assert.equal(r.db_mutation_authorized,false);
  assert.equal(r.crm_write_authorized,false);
  assert.equal(r.spend_authorized,false);
  assert.equal(r.trading_access,false);
  assert.equal(r.android_touched,false);
  assert.equal(r.external_code_execution,false);
});

test('producer proves native plan evidence score dossier replay chain without live external execution',async()=>{
  const b=await buildTechnologyScoutProducerBundle();
  assert.equal(b.native.plan.status,'ROUTED');
  assert.equal(b.native.accepted_evidence.status,'ACCEPTED');
  assert.equal(b.native.accepted_evidence.public_evidence,true);
  assert.equal(b.native.score.status,'SCORED');
  assert.equal(b.native.score.recommendation,'SHORTLIST');
  assert.equal(b.native.dossier.status,'READY');
  assert.equal(b.native.dossier.source_evidence_separate_from_interpretation,true);
  assert.equal(b.native.replay.replay_green,true);
  assert.equal(b.external_code_execution,false);
  assert.equal(b.additional_cost_eur,0);
});

test('SCAN consumer reacts when digital-footprint discovery semantics disappear',async()=>{
  const b=clone(await buildTechnologyScoutProducerBundle());
  b.semantic_profile.use_case_tags=b.semantic_profile.use_case_tags.filter(x=>x!=='DIGITAL_FOOTPRINT_DISCOVERY');
  const r=await consume(b,'scan');
  assert.equal(r.consumer_map['SCAN-001'].decision,'DISCOVERY_ADAPTER_HOLD');
  assert.equal(r.consumer_map['SCAN-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('SCAN-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('WEB consumer reacts when DOM extraction capability disappears',async()=>{
  const b=clone(await buildTechnologyScoutProducerBundle());
  b.semantic_profile.capability_tags=b.semantic_profile.capability_tags.filter(x=>x!=='DOM_EXTRACTION');
  const r=await consume(b,'web');
  assert.equal(r.consumer_map['WEB-001'].decision,'WEB_AUDIT_INPUT_HOLD');
  assert.equal(r.consumer_map['WEB-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('WEB-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('INN consumer reacts to loss of reversible innovation fit',async()=>{
  const b=clone(await buildTechnologyScoutProducerBundle());
  b.semantic_profile.reversibility=30;
  const r=await consume(b,'inn');
  assert.equal(r.consumer_map['INN-001'].decision,'INNOVATION_BACKLOG_HOLD');
  assert.equal(r.consumer_map['INN-001'].outcome.priority,'NONE');
  assert.ok(r.failed_consumers.includes('INN-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('COMPET consumer reacts when competitor-intelligence use case disappears',async()=>{
  const b=clone(await buildTechnologyScoutProducerBundle());
  b.semantic_profile.use_case_tags=b.semantic_profile.use_case_tags.filter(x=>x!=='COMPETITOR_PUBLIC_INTELLIGENCE');
  const r=await consume(b,'compet');
  assert.equal(r.consumer_map['COMPET-001'].decision,'COMPETITOR_INTELLIGENCE_HOLD');
  assert.equal(r.consumer_map['COMPET-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('COMPET-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('SEO consumer reacts when technical-evidence use case disappears',async()=>{
  const b=clone(await buildTechnologyScoutProducerBundle());
  b.semantic_profile.use_case_tags=b.semantic_profile.use_case_tags.filter(x=>x!=='SEO_TECHNICAL_EVIDENCE');
  const r=await consume(b,'seo');
  assert.equal(r.consumer_map['SEO-001'].decision,'SEO_TECH_EVIDENCE_HOLD');
  assert.equal(r.consumer_map['SEO-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('SEO-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('MKT consumer reacts when landing/campaign intelligence use case disappears',async()=>{
  const b=clone(await buildTechnologyScoutProducerBundle());
  b.semantic_profile.use_case_tags=b.semantic_profile.use_case_tags.filter(x=>x!=='LANDING_CAMPAIGN_INTELLIGENCE');
  const r=await consume(b,'mkt');
  assert.equal(r.consumer_map['MKT-001'].decision,'MARKETING_INTELLIGENCE_HOLD');
  assert.equal(r.consumer_map['MKT-001'].outcome.action,'NO_CHANGE');
  assert.ok(r.failed_consumers.includes('MKT-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('ROUTE consumer fail-closes if candidate ceases to be zero-cost',async()=>{
  const b=clone(await buildTechnologyScoutProducerBundle());
  b.candidate_input.cost_eur_month=1;
  const r=await consume(b,'route-cost');
  assert.equal(r.consumer_map['ROUTE-001'].decision,'ADOPTION_ROUTE_HOLD');
  assert.deepEqual(r.consumer_map['ROUTE-001'].outcome.targets,[]);
  assert.ok(r.failed_consumers.includes('ROUTE-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('ROUTE consumer fail-closes if adoption target set drifts',async()=>{
  const b=clone(await buildTechnologyScoutProducerBundle());
  b.semantic_profile.adoption_targets=b.semantic_profile.adoption_targets.filter(x=>x!=='SEO-001');
  const r=await consume(b,'route-targets');
  assert.equal(r.consumer_map['ROUTE-001'].decision,'ADOPTION_ROUTE_HOLD');
  assert.ok(r.failed_consumers.includes('ROUTE-001'));
  assert.equal(r.full_e2e_real_preprod,false);
});

test('semantic provenance mismatch is rejected before downstream use',async()=>{
  const b=clone(await buildTechnologyScoutProducerBundle());
  b.semantic_profile.evidence_id='scoutev_tampered';
  await assert.rejects(()=>consume(b,'provenance'),/TECH_SCOUT_SEMANTIC_PROVENANCE_MISMATCH/);
});

test('durable rerun is idempotent for semantic state LRN OBSERV and FINOPS',async()=>{
  const root=wd('restart');
  const a=await runTechnologyScoutFullE2ERealV1({workdir:root,source_run_id:92,source_head_sha:HEAD});
  const b=await runTechnologyScoutFullE2ERealV1({workdir:root,source_run_id:92,source_head_sha:HEAD});
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

test('backup rollback and rebuild reproduce the exact semantic consumer state',async()=>{
  const r=await runTechnologyScoutFullE2ERealV1({workdir:wd('rebuild'),source_run_id:92,source_head_sha:HEAD});
  const rr=r.backup_rollback_rebuild;
  assert.equal(rr.backup_ready,true);
  assert.equal(rr.rollback_green,true);
  assert.equal(rr.rebuild_green,true);
  assert.equal(rr.rebuilt_consumer_count,7);
  assert.equal(rr.applied_state_hash,rr.rebuilt_state_hash);
});

test('LRN feedback remains mandatory for FULL even when all direct consumers are green',async()=>{
  const r=await consume(await buildTechnologyScoutProducerBundle(),'lrn',{emit_learning:false});
  assert.equal(r.consumer_map['SCAN-001'].decision,'DISCOVERY_ADAPTER_SHORTLISTED');
  assert.equal(r.consumer_map['ROUTE-001'].decision,'ADOPTION_ROUTE_PREPROD_READY');
  assert.equal(r.evaluation_consumer.decision,'TRIBUNAL_PASS');
  assert.equal(r.learning_sink.decision,'LRN_FEEDBACK_INCOMPLETE');
  assert.equal(r.consumer_coverage,0.9);
  assert.equal(r.full_e2e_real_preprod,false);
});
