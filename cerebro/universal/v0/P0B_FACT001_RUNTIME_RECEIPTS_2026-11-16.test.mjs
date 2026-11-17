import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const d=JSON.parse(readFileSync(new URL('./P0B_FACT001_RUNTIME_RECEIPTS_2026-11-16.json',import.meta.url),'utf8'));
test('runner time-join is strong historical execution evidence but not business-job receipt',()=>{
 const r=d.evidence.factory_runner_temporal;
 assert.equal(r.cf_cron_successful_sampled_rows,288);
 assert.equal(r.d1_ticks,288);
 assert.equal(r.d1_empty_ticks,288);
 assert.equal(r.all_pairs_within_30_seconds,288);
 assert.equal(r.unpaired_cf_rows,0);assert.equal(r.unpaired_d1_rows,0);
 assert.ok(r.max_abs_diff_seconds<3);
 assert.equal(r.per_run_id_signature_verified,false);
 assert.equal(r.job_outcome_in_window,'EMPTY_NOT_BUSINESS_JOB_SUCCESS');
 assert.equal(r.autonomous_agent_identity_verified,false);
});
test('FACT command jobs have internal related events but current provider readback is limited',()=>{
 const e=d.evidence.command_job_ledger,o=d.evidence.owned_workers_physical_readback;
 assert.equal(e.jobs_total,6);
 assert.equal(e.jobs_state_completed,6);
 assert.equal(e.related_events,6);
 assert.equal(e.distinct_jobs_with_events,6);
 assert.equal(e.orphan_events,0);
 assert.equal(Object.values(e.operations).reduce((a,b)=>a+b,0),6);
 assert.equal(e.cross_providers_at_work_time_verified,false);
 assert.equal(o.ledger_rows_marked_deleted,2);
 assert.equal(o.deleted_ledger_workers_absent_in_cloudflare_inventory,2);
 assert.equal(o.deleted_ledger_workers_still_present,0);
 assert.equal(o.historical_transition_chain_proven,false);
});
test('receipt audit does not confuse social READY stock or knowledge ticker with actual AUTOQUAL execution',()=>{
 const ig=d.evidence.instagram_autoqual,fb=d.evidence.facebook_autoqual;
 assert.equal(ig.mode,'OFF');assert.equal(ig.attempts,0);assert.equal(ig.batch_receipts,0);
 assert.equal(ig.unrelated_knowledge_ticker_queue_invocations_do_not_prove_autoqual_training,true);
 assert.equal(fb.mode,'OFF');assert.equal(fb.ready_cases,3170);
 assert.equal(fb.cases_with_candidate_hash,0);assert.equal(fb.cases_with_review_hash,0);
 assert.equal(fb.training_batches_executed_proven,false);
});
test('multi-company identities remain unverified and no business active agents or costs are invented',()=>{
 assert.equal(d.canonical_company_registry_mapping_verified,false);
 assert.equal(d.scope.global_active_agents,null);
 assert.equal(d.scope.global_active_subagents,null);
 assert.equal(d.scope.production_promotion_authorized,false);
 assert.equal(d.scope.operational_change_performed,false);
 assert.equal(d.scope.marginal_query_cost_eur,null);
 const raw=JSON.stringify(d);
 assert.doesNotMatch(raw,/sb_secret_[A-Za-z0-9_-]{15,}|BEGIN PRIVATE KEY|Bearer\s+eyJ|Fenix2020!/);
});
