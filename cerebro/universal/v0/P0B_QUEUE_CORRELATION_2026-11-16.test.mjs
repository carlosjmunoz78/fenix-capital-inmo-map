import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=JSON.parse(readFileSync(new URL('./P0B_QUEUE_CORRELATION_2026-11-16.json',import.meta.url),'utf8'));
const m=new Map(s.queues.map(q=>[q.queue_name,q]));
test('queue audit is a bounded 24h immutable source snapshot, not executable evidence',()=>{
 assert.equal(s.kind,'P0B_TRANSPORT_AGGREGATE_RECEIPT');
 assert.equal(Date.parse(s.query_window_end_utc)-Date.parse(s.query_window_start_utc),86400000);
 assert.equal(s.analytics_sampling,'ADAPTIVE');
 assert.equal(s.queues.length,4);
 assert.equal(s.account_inventory.queues_total,22);
 assert.equal(s.account_inventory.d1_databases_total,10);
 assert.equal(s.mutations,'NONE');
 assert.equal(s.proof_boundaries.safe_for_prod_promotion,false);
 assert.equal(s.proof_boundaries.business_job_result_verified,false);
 assert.equal(s.proof_boundaries.customer_publication_verified,false);
 assert.equal(s.proof_boundaries.live_worker_agent_count_verified,false);
 assert.equal(s.proof_boundaries.cost_eur_measured,null);
});
test('canary has 2 observed queue write/read/delete and 2 Worker invocations without claims of per-job proof',()=>{
 const c=s.canary,q=m.get(c.queue_name);
 assert.equal(c.worker_invocations_queue_in_same_window,2);
 assert.equal(q.queue_aggregate.write_weighted,2);
 assert.equal(q.queue_aggregate.read_weighted,2);
 assert.equal(q.queue_aggregate.delete_success_weighted,2);
 assert.equal(c.cron_count,0);assert.equal(c.workers_dev_enabled,false);
 assert.equal(c.preview_urls_enabled,false);
 assert.equal(c.message_id_join_verified,false);
 assert.equal(c.job_receipt_join_verified,false);
 assert.equal(c.correlation_grade,'SAME_WINDOW_SAME_CONSUMER_AGGREGATE_ONLY');
});
test('Instagram 71 vs 72 mismatch, LinkedIn 72 vs 72 do not imply individual correlation',()=>{
 assert.equal(s.instagram.worker_queue_invocations_in_same_window,71);
 assert.equal(s.instagram.queue_delete_success_weighted,72);
 assert.equal(s.instagram.reconciliation_grade,'MISMATCH_71_VS_72_ADAPTIVE_SAMPLING_OR_BATCHING_NOT_PROVEN');
 assert.equal(s.linkedin.worker_queue_invocations_in_same_window,72);
 assert.equal(s.linkedin.queue_delete_success_weighted,72);
 assert.equal(s.linkedin.job_receipt_join_verified,false);
 assert.equal(s.linkedin.reconciliation_grade,'MATCHED_AGGREGATE_NOT_PER_MESSAGE_JOIN');
});
test('queue backlog count=0 with nonzero bytes is uncertain, not a queue-drained certificate',()=>{
 for(const name of ['cerebro-instagram-autoqual-ticker-lab-eu','cerebro-linkedin-autonomy-ticker-lab-eu']){
  const q=m.get(name);
  assert.equal(q.instant_queue_metrics.backlog_count,0);
  assert.ok(q.instant_queue_metrics.backlog_bytes>0);
  assert.equal(q.instant_queue_metrics.backlog_consistency,'INCONSISTENT_COUNT_ZERO_BYTES_NONZERO');
  assert.equal(q.instant_queue_metrics.certifies_no_pending_messages,false);
 }
 assert.equal(s.ums.write_weighted,8);assert.equal(s.ums.read_weighted,12);
 assert.equal(s.ums.delete_success_weighted,14);
 assert.equal(s.ums.reconciliation_grade,'DIFFERENT_WEIGHTS_ADAPTIVE_SAMPLING_NO_ONE_TO_ONE_INFERENCE');
});
test('no cross-company inference nor secrets from provider-level transport analytics',()=>{
 for(const q of s.queues){
  assert.equal(q.queue_aggregate.has_per_message_correlation,false);
  assert.equal(q.queue_aggregate.job_outcome_verified,false);
  assert.equal(q.consumer_binding_fenix_is_not_registry_proof,true);
 }
 const raw=JSON.stringify(s);
 assert.doesNotMatch(raw,/sb_secret_[A-Za-z0-9_-]{15,}|-----BEGIN .*PRIVATE KEY-----|Bearer\\s+eyJ|Fenix2020!/i);
 assert.equal(s.source_scope,'ACCOUNT_LEVEL_NOT_CANONICAL_COMPANY_REGISTRY');
});
