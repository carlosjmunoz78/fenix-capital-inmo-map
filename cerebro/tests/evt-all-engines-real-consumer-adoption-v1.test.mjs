import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildEvtAllEnginesProducerBundle,consumeEvtAllEnginesReal,runEvtAllEnginesFullE2ERealV1,loadEvtCanonicalEngineRegistry,EVT_ALL_ENGINES_SELECTOR} from '../runtime/evt-all-engines-real-consumer-adoption-v1.mjs';

const HEAD='c'.repeat(40);
const wd=n=>fs.mkdtempSync(path.join(os.tmpdir(),`evt-all-real-${n}-`));
const clone=v=>structuredClone(v);
async function consume(bundle,n,extra={}){return consumeEvtAllEnginesReal({producer_bundle:bundle,workdir:wd(n),source_run_id:91,source_head_sha:HEAD,...extra});}

test('EVT-001 FULL E2E REAL semantically applies one governed event to every canonical registered engine',async()=>{
 const canonical=loadEvtCanonicalEngineRegistry();
 const r=await runEvtAllEnginesFullE2ERealV1({workdir:wd('happy'),source_run_id:91,source_head_sha:HEAD});
 assert.equal(r.status,'FULL_E2E_REAL_PREPROD');
 assert.equal(r.full_e2e_real_preprod,true);
 assert.equal(r.required_consumer_selector,EVT_ALL_ENGINES_SELECTOR);
 assert.equal(r.canonical_engine_count,canonical.count);
 assert.deepEqual(r.required_consumers,[...canonical.engine_ids]);
 assert.equal(r.consumers.length,canonical.count);
 assert.equal(r.consumer_coverage,1);
 assert.equal(r.functional_consumer_coverage,1);
 assert.deepEqual(r.missing_consumers,[]);
 assert.deepEqual(r.failed_consumers,[]);
 assert.ok(r.consumers.every(x=>x.real_consumption===true&&x.decision==='REGISTRY_EPOCH_APPLIED'&&x.fields_used.length>=6&&x.outcome_hash));
 assert.equal(r.transport_event_count,canonical.count);
 assert.equal(r.delivered_total,canonical.count);
 assert.equal(r.dead_letter_total,0);
 assert.equal(r.evaluation_consumer.decision,'TRIBUNAL_PASS');
 assert.equal(r.learning_sink.decision,'LRN_FEEDBACK_PERSISTED');
 assert.equal(r.observability_consumer.decision,'OBSERVABILITY_RECORDED');
 assert.equal(r.finops_consumer.decision,'FINOPS_ZERO_COST_RECORDED');
 assert.equal(r.backup_rollback_rebuild.rollback_green,true);
 assert.equal(r.backup_rollback_rebuild.rebuild_green,true);
 assert.equal(r.additional_cost_eur,0);
 assert.equal(r.prod_authorized,false);
 assert.equal(r.trading_access,false);
 assert.equal(r.android_touched,false);
});

test('canonical registry count is dynamic and internally consistent, not a hard-coded historical count',()=>{
 const c=loadEvtCanonicalEngineRegistry();
 assert.equal(c.count,c.engine_ids.length);
 assert.equal(new Set(c.engine_ids).size,c.count);
 assert.ok(c.engine_ids.includes('HCI-001'));
 assert.ok(c.engine_ids.includes('MOTION-001'));
});

test('omitting one registered engine event fail-closes exhaustive semantic coverage',async()=>{
 const b=clone(buildEvtAllEnginesProducerBundle());
 const victim=b.canonical_engine_ids.at(-1);
 b.events=b.events.filter(x=>x.context.engine_id!==victim);
 const r=await consume(b,'missing');
 assert.equal(r.full_e2e_real_preprod,false);
 assert.equal(r.consumer_coverage,(b.canonical_engine_count-1)/b.canonical_engine_count);
 assert.ok(r.missing_consumers.includes(victim));
 assert.ok(r.failed_consumers.includes(victim));
 assert.equal(r.evaluation_consumer.decision.startsWith('TRIBUNAL_'),true);
 assert.notEqual(r.evaluation_consumer.decision,'TRIBUNAL_PASS');
});

test('wrong registry fingerprint is semantically rejected and dead-lettered for the affected engine',async()=>{
 const b=clone(buildEvtAllEnginesProducerBundle());
 const victim=b.canonical_engine_ids[3];
 const i=b.events.findIndex(x=>x.context.engine_id===victim);
 b.events[i].payload.registry_fingerprint='bad-fingerprint';
 const r=await consume(b,'fingerprint');
 const ev=r.consumers.find(x=>x.engine_id===victim);
 assert.equal(ev.decision,'REGISTRY_EPOCH_NOT_APPLIED');
 assert.equal(ev.outcome.delivery_status,'DEAD_LETTER');
 assert.equal(ev.outcome.delivery_attempts,3);
 assert.ok(r.failed_consumers.includes(victim));
 assert.equal(r.full_e2e_real_preprod,false);
});

test('shared semantic consumer exercises native bounded retry and still applies after one transient failure',async()=>{
 const b=buildEvtAllEnginesProducerBundle();
 const victim=b.canonical_engine_ids[7];
 const r=await consume(b,'retry',{transient_fail_engine_id:victim});
 const ev=r.consumers.find(x=>x.engine_id===victim);
 assert.equal(ev.decision,'REGISTRY_EPOCH_APPLIED');
 assert.equal(ev.outcome.delivery_status,'DELIVERED');
 assert.equal(ev.outcome.delivery_attempts,2);
 assert.equal(r.dead_letter_total,0);
 assert.equal(r.full_e2e_real_preprod,true);
});

test('durable rerun is idempotent across publish delivery semantic state telemetry and LRN',async()=>{
 const root=wd('restart');
 const a=await runEvtAllEnginesFullE2ERealV1({workdir:root,source_run_id:91,source_head_sha:HEAD});
 const b=await runEvtAllEnginesFullE2ERealV1({workdir:root,source_run_id:91,source_head_sha:HEAD});
 assert.equal(a.full_e2e_real_preprod,true);
 assert.equal(b.full_e2e_real_preprod,true);
 assert.equal(a.publish_accepted_total,a.canonical_engine_count);
 assert.equal(b.publish_accepted_total,0);
 assert.equal(b.publish_duplicate_total,b.canonical_engine_count);
 assert.equal(b.skipped_terminal_total,b.canonical_engine_count);
 assert.equal(b.learning_sink.outcome.first_created_total,0);
 assert.equal(b.learning_sink.outcome.second_created_total,0);
 assert.equal(b.observability_consumer.outcome.records_for_correlation,1);
 assert.equal(b.finops_consumer.outcome.events,1);
 assert.equal(a.semantic_state_hash,b.semantic_state_hash);
 assert.equal(a.outcome_hash,b.outcome_hash);
});

test('cross-company event specification is rejected before transport use',async()=>{
 const b=clone(buildEvtAllEnginesProducerBundle());
 b.events[0].context.company_id='other-company';
 await assert.rejects(()=>consume(b,'tenant'),/EVT_ALL_ENGINES_CONTEXT_MISMATCH/);
});

test('rollback plus journal rebuild is mandatory and restores the full semantic state',async()=>{
 const r=await runEvtAllEnginesFullE2ERealV1({workdir:wd('rebuild'),source_run_id:91,source_head_sha:HEAD});
 assert.equal(r.backup_rollback_rebuild.backup_ready,true);
 assert.equal(r.backup_rollback_rebuild.rollback_green,true);
 assert.equal(r.backup_rollback_rebuild.rebuild_green,true);
 assert.equal(r.backup_rollback_rebuild.rebuilt_engine_count,r.canonical_engine_count);
 assert.equal(r.backup_rollback_rebuild.applied_state_hash,r.backup_rollback_rebuild.rebuilt_state_hash);
});

test('LRN feedback remains mandatory even with complete semantic engine coverage',async()=>{
 const r=await consume(buildEvtAllEnginesProducerBundle(),'lrn',{emit_learning:false});
 assert.equal(r.consumer_coverage,1);
 assert.equal(r.evaluation_consumer.decision,'TRIBUNAL_PASS');
 assert.equal(r.learning_sink.decision,'LRN_FEEDBACK_INCOMPLETE');
 assert.equal(r.full_e2e_real_preprod,false);
});
