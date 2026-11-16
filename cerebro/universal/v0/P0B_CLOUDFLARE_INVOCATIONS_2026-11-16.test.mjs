import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=JSON.parse(readFileSync(new URL('./P0B_CLOUDFLARE_INVOCATIONS_2026-11-16.json',import.meta.url),'utf8'));
const sum=(a,k)=>a.reduce((n,x)=>n+x[k],0);
test('P0B invocation audit reconciles weighted Cloudflare account records without calling them jobs',()=>{
 assert.equal(s.snapshot_type,'READ_ONLY_BOUNDED_AUDIT_NOT_LIVE_DASHBOARD');
 assert.equal(s.dataset,'events.workersInvocations');
 assert.equal(s.dataset_sampling,'ADAPTIVE');
 assert.equal(s.source_rows,s.rows.length);
 assert.equal(s.source_rows,11);
 assert.equal(s.observed_script_names,new Set(s.rows.map(x=>x.script_name)).size);
 assert.equal(s.observed_script_names,10);
 assert.equal(sum(s.rows,'weighted_invocations'),s.weighted_invocation_total);
 assert.equal(sum(s.rows,'sampled_rows'),s.sampled_rows_total);
 assert.equal(s.weighted_invocation_total,992);
 assert.equal(s.sampled_rows_total,992);
 assert.equal(Object.values(s.weighted_invocations_by_type).reduce((a,b)=>a+b,0),992);
 assert.deepEqual(s.weighted_invocations_by_type,{cron:648,fetch:191,queue:153});
 assert.ok(s.rows.every(x=>x.status==='success'));
 assert.equal(s.weighted_invocations_by_status.success,992);
});
test('P0B separates explicitly declared company from unknown account scope',()=>{
 const yes=s.rows.filter(x=>x.company_id_plain_text_binding==='fenix-capital');
 const no=s.rows.filter(x=>x.company_id_plain_text_binding===null);
 assert.equal(sum(yes,'weighted_invocations'),405);
 assert.equal(sum(no,'weighted_invocations'),587);
 assert.equal(s.tagged_fenix_capital.weighted_invocations,405);
 assert.equal(s.tagged_fenix_capital.scripts,5);
 assert.equal(s.tagged_fenix_capital.canonical_registry_mapping_verified,false);
 assert.equal(s.without_verified_company_binding.weighted_invocations,587);
 assert.equal(s.without_verified_company_binding.scripts,5);
 assert.equal(s.without_verified_company_binding.attribution,'ACCOUNT_LEVEL_NOT_ATTRIBUTABLE_TO_FENIX_WITHOUT_REGISTRY');
});
test('P0B cron-free canary has queue invocations but no autonomous agent claim',()=>{
 assert.equal(s.canary_has_cron,false);
 const canary=s.rows.filter(x=>x.script_name==='cerebro-operativa-control-canary-lab');
 assert.equal(canary.length,1);
 assert.equal(canary[0].invocation_type,'queue');
 assert.equal(canary[0].weighted_invocations,2);
 assert.equal(s.canary_queue_invocations_recorded,2);
 assert.equal(s.worker_runtimes_live_at_instant,null);
 assert.equal(s.verified_agent_count,null);
 assert.equal(s.verified_business_job_success_count,null);
 assert.equal(s.verified_publications_count,null);
 assert.equal(s.cost_eur_measured,null);
 assert.equal(s.requires_job_receipt_correlation,true);
});
test('P0B does not fabricate zero activity from absent priority Worker rows',()=>{
 assert.equal(s.priority_lab_scripts_not_returned.length,4);
 for(const name of s.priority_lab_scripts_not_returned){
  assert.equal(s.rows.some(x=>x.script_name===name),false);
 }
 assert.equal(s.priority_silence_meaning,'NO_ROWS_IN_SAMPLED_QUERY_NOT_PROOF_OF_ZERO_INVOCATIONS');
 assert.equal(Date.parse(s.window_end_utc)-Date.parse(s.window_start_utc),86400000);
 const str=JSON.stringify(s);
 assert.doesNotMatch(str,/sb_secret_|-----BEGIN PRIVATE KEY-----|Bearer\\s+eyJ|Fenix2020!/);
});
