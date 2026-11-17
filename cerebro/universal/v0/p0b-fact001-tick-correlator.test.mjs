import {test} from 'node:test';
import assert from 'node:assert/strict';
import {correlateFact001CronTicks} from './p0b-fact001-tick-correlator.mjs';
const start=Date.parse('2026-11-15T06:00:00Z');
const scriptName='cerebro-fact001-recovery-runner-lab';
const cf=(i,weight=1)=>({scriptName,invocationType:'cron',status:'success',sampleInterval:weight,
 timestamp:new Date(start+i*300000).toISOString().replace('T',' ').replace('Z','').replace(/\.\d{3}$/,'')});
const d1=(i,delay=1300)=>({started_at:new Date(start+i*300000+delay).toISOString(),outcome:'EMPTY'});
const check=(a,b)=>correlateFact001CronTicks({cloudflareInvocations:a,d1Ticks:b});
test('288 cron invocations match 288 empty ticks while refusing job or actor claims',()=>{
 const a=Array.from({length:288},(_,i)=>cf(i));
 const b=Array.from({length:288},(_,i)=>d1(i));
 const result=check(a,b);
 assert.equal(result.status,'TEMPORAL_ALIGNMENT_OBSERVED');
 assert.equal(result.cf_rows,288);
 assert.equal(result.d1_ticks,288);
 assert.equal(result.matched_pairs,288);
 assert.equal(result.cf_unmatched,0);assert.equal(result.d1_unmatched,0);
 assert.equal(result.max_abs_drift_seconds,1.3);
 assert.equal(result.crypto_or_run_id_join_verified,false);
 assert.equal(result.worker_identity_signed,false);
 assert.equal(result.completed_business_jobs_claim_allowed,false);
 assert.equal(result.active_agent_count,null);
 assert.equal(result.prod_promotion_allowed,false);
});
test('missing D1 tick is a partial observation, not success',()=>{
 const result=check([cf(0),cf(1),cf(2)],[d1(0),d1(2)]);
 assert.equal(result.status,'TEMPORAL_ALIGNMENT_INCOMPLETE');
 assert.equal(result.cf_unmatched,1);
 assert.equal(result.matched_pairs,2);
});
test('mismatched far-apart timestamps cannot be paired',()=>{
 const result=check([cf(0),cf(1)],[d1(0),d1(3)]);
 assert.equal(result.status,'TEMPORAL_ALIGNMENT_INCOMPLETE');
 assert.equal(result.cf_unmatched,1);
 assert.equal(result.d1_unmatched,1);
});
test('sampled intervals above one fail closed instead of claiming exact cardinality',()=>{
 assert.equal(check([cf(0,2)],[d1(0)]),null);
});
test('different worker, outcome, invocation type and response status fail closed',()=>{
 assert.equal(check([{...cf(0),scriptName:'other'}],[d1(0)]),null);
 assert.equal(check([{...cf(0),invocationType:'fetch'}],[d1(0)]),null);
 assert.equal(check([{...cf(0),status:'exception'}],[d1(0)]),null);
 assert.equal(check([cf(0)],[{...d1(0),outcome:'COMPLETED'}]),null);
});
test('duplicates, out-of-range times, bad timestamps and empty input fail closed',()=>{
 assert.equal(check([cf(0),cf(0)],[d1(0)]),null);
 assert.equal(check([cf(0)],[d1(-1)]),null);
 assert.equal(check([cf(0)],[{...d1(0),started_at:'not-a-timestamp'}]),null);
 assert.equal(check([],[]),null);
});
test('never return identifiers, credentials, real-time proof or PII',()=>{
 const s=JSON.stringify(check([cf(0)],[d1(0)]));
 assert.doesNotMatch(s,/"(?:tick_key|message_id|receipt_id|job_id|worker_id)"\s*:/i);
 assert.doesNotMatch(s,/Bearer\s+eyJ|sb_secret_|-----BEGIN .*PRIVATE KEY-----/i);
 assert.match(s,/"requires_fresh_source_read":true/);
});
