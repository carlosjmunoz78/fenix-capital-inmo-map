import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const p=new URL('./P0B_RUNTIME_OBSERVATION_FENIX_2026-11-16.json',import.meta.url);
const s=JSON.parse(readFileSync(p,'utf8'));
const entries=o=>Object.entries(o||{});
const sum=o=>entries(o).reduce((acc,[,value])=>acc+value,0);
test('P0B snapshot is archived, pinned to Fénix/LAB, and never advertises verified active agents',()=>{
 assert.equal(s.snapshot_kind,'IMMUTABLE_READ_ONLY_AUDIT');
 assert.equal(s.company_id,'fenix');assert.equal(s.environment,'LAB');
 assert.equal(s.runtime_claims.active_agent_count,null);
 assert.equal(s.runtime_claims.active_subagent_count,null);
 assert.equal(s.runtime_claims.active_worker_count,null);
 assert.equal(s.runtime_claims.active_job_count,null);
 assert.equal(s.runtime_claims.verified_zero_active,false);
 assert.equal(s.runtime_claims.live_runtime_certified,false);
 assert.equal(s.use_policy.refresh_needed_before_real_time_answer,true);
 assert.equal(s.use_policy.no_activation_from_snapshot,true);
 assert.equal(s.use_policy.no_control_write_from_snapshot,true);
});
test('P0B snapshot keeps real Fénix job totals separate from other-company rows',()=>{
 const q=s.sources.supabase_lab;
 assert.equal(q.scope.company_id,'fenix');
 assert.equal(q.scope.is_current_app_preprod,false);
 for(const name of ['browser_v2','jarvis_v1','creative_v1','browser_v1']){
  const v=q.jobs[name];assert.equal(sum(v.by_status),v.total,name);
 }
 assert.equal(q.jobs.browser_v2.total,117);
 assert.equal(q.tenant_isolation_observation.other_company_browser_v2_rows_excluded,84);
 assert.equal(q.tenant_isolation_observation.global_browser_v2_row_count,201);
 assert.equal(q.jobs.browser_v2.total+q.tenant_isolation_observation.other_company_browser_v2_rows_excluded,201);
 assert.equal(q.jobs.job001_telemetry.not_evidence_of_global_zero_jobs,true);
});
test('P0B counts deployed Workers/Edge functions, NOT active runtimes',()=>{
 const c=s.sources.cloudflare,d=s.sources.supabase_lab;
 assert.equal(c.checked_lab_scripts.length,4);
 assert.equal(c.control_plane_workers_total,38);
 for(const w of c.checked_lab_scripts){
  assert.equal(w.deployment_exists,true);assert.equal(w.runtime_verified,false);
  assert.equal(w.cron_count,0);
 }
 assert.equal(d.control_plane_edge_functions_total,367);
 assert.equal(d.control_plane_edge_functions_marked_active,367);
 assert.equal(d.edge_status_is_not_runtime_heartbeat,true);
 for(const e of d.edge_observers){assert.equal(e.live_owner_e2e_certified,false);}
 assert.equal(d.runtime_evidence.historical_worker_ids_are_not_verified_live_agents,true);
 assert.equal(d.runtime_evidence.worker_metric_samples_last24h,0);
 assert.equal(d.runtime_evidence.device_heartbeats_fresh5m,0);
});
test('P0B Cloudflare recent events reconcile, without false job or publishing claims',()=>{
 const cf=s.sources.cloudflare,obs=cf.observability;
 assert.equal(obs.event_count,obs.services.reduce((n,x)=>n+x.events,0));
 assert.equal(obs.not_requests_or_successes,true);
 assert.equal(obs.no_observed_events_does_not_prove_no_invocations,true);
 assert.ok(Date.parse(cf.observed_window.to)>Date.parse(cf.observed_window.from));
 assert.ok(Math.abs(Date.parse(cf.observed_window.to)-Date.parse(cf.observed_window.from)-86400000)<1000);
});
test('P0B source snapshot does not invent costs or a current LIVE agent count',()=>{
 const d=s.sources.supabase_lab,cf=s.sources.cloudflare;
 assert.equal(d.runtime_evidence.recorded_incremental_cost_eur_in_samples,0);
 assert.equal(d.runtime_evidence.overall_provider_cost_eur,null);
 assert.equal(cf.measured_cost_eur,null);
 assert.equal(d.active_worker_proof,'NOT_VERIFIED_IN_SAMPLED_RUNTIME_SOURCES');
 const source=readFileSync(p,'utf8');
 assert.doesNotMatch(source,/sb_secret_|-----BEGIN PRIVATE KEY-----|authorization: Bearer|Fenix2020!/i);
});

test('P0B historical failure classes reconcile without replay or exposing error payloads',()=>{
 const d=s.sources.supabase_lab, f=d.historical_failure_families;
 assert.equal(f.browser_dead_letter.total,d.jobs.browser_v2.by_status.DEAD_LETTER);
 assert.equal(f.browser_dead_letter.total,f.browser_dead_letter.identity_session_or_permission_related+f.browser_dead_letter.lease_expired+f.browser_dead_letter.browser_code_error+f.browser_dead_letter.navigation_timeout);
 assert.equal(f.browser_hold.total,f.browser_hold.reauth_required+f.browser_hold.identity_unverified);
 assert.equal(f.browser_hold.total,d.jobs.browser_v2.by_status.HOLD);
 assert.equal(f.browser_queued.total,d.jobs.browser_v2.by_status.QUEUED);
 assert.equal(f.browser_queued.older_than_24h,1);
 assert.equal(f.creative_hold.total,f.creative_hold.paid_lane_or_security_gate_pending+f.creative_hold.owner_rejected);
 assert.equal(f.creative_hold.total,d.jobs.creative_v1.by_status.HOLD);
 assert.equal(f.jarvis_dead_letter.total,d.jobs.jarvis_v1.by_status.DEAD_LETTER);
 assert.equal(f.replay_or_release_authorized,false);
 assert.equal(f.contains_unredacted_error_code,false);
 assert.equal(f.browser_dead_letter.classifications_are_diagnostic_not_verified_root_cause,true);
});
