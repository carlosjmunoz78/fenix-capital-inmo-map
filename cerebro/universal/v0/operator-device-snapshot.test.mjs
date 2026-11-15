import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const path=new URL('./device-runtime-snapshot-fenix-2026-11-15.json',import.meta.url);
const read=async()=>JSON.parse(await readFile(path,'utf8'));
test('historical LAB evidence is aggregate, scoped and intentionally not a live endpoint',async()=>{
 const d=await read();
 assert.equal(d.schema,'CEREBRO_DEVICE_RUNTIME_SNAPSHOT_V1');
 assert.equal(d.kind,'DATED_READ_ONLY_EVIDENCE');
 assert.equal(d.source_project_role,'SUPABASE_LAB_NOT_PROD');
 assert.equal(d.company_id,'fenix');
 assert.equal(d.environments.length,2);
 assert.ok(Number.isFinite(Date.parse(d.observed_at)));
 assert.equal(d.active_agents_verified,null);
 assert.equal(d.active_subagents_verified,null);
 assert.equal(d.jobs_running_verified,null);
 assert.equal(d.cost_eur_measured,null);
 assert.equal(d.contains_device_ids,false);
 assert.equal(d.contains_command_payloads,false);
 assert.equal(d.contains_personal_data,false);
});
test('stored ONLINE status is never used to infer active devices without a recent heartbeat',async()=>{
 const d=await read();
 assert.equal(d.environments.reduce((s,x)=>s+x.declared_online,0),5);
 assert.equal(d.environments.reduce((s,x)=>s+x.heartbeat_24h,0),0);
 assert.equal(d.environments.reduce((s,x)=>s+x.heartbeat_5m,0),0);
 for(const r of d.environments){
  assert.ok(Date.parse(r.last_seen_at)<Date.parse(d.observed_at)-24*60*60*1000);
  assert.ok(r.heartbeat_5m<=r.heartbeat_24h&&r.heartbeat_24h<=r.not_revoked);
 }
});
test('command and semantic receipt counts are finite historical bounded totals',async()=>{
 const d=await read();
 const [lab,old]=d.environments;
 assert.equal(lab.environment,'LAB');
 assert.equal(old.environment,'PREPROD');
 assert.equal(lab.commands_total,8);
 assert.equal(old.commands_total,96);
 assert.deepEqual([lab.completed,lab.failed,old.completed,old.failed],[6,2,75,21]);
 assert.deepEqual([lab.receipt_count,lab.semantic_verified_count,old.receipt_count,old.semantic_verified_count],[6,6,96,75]);
 assert.deepEqual([lab.comparable_successful_duration_samples,old.comparable_successful_duration_samples],[6,66]);
 for(const x of d.environments){
  assert.ok(x.completed+x.failed<=x.commands_total);
  assert.ok(x.semantic_verified_count<=x.receipt_count);
  assert.ok(x.comparable_successful_duration_samples<=x.completed);
  assert.ok(x.p50_completed_seconds>=0&&x.p90_completed_seconds>=x.p50_completed_seconds);
 }
});
test('historic PREPROD label cannot certify an active PREPROD app deployment',async()=>{
 const d=await read();
 const old=d.environments.find(x=>x.environment==='PREPROD');
 assert.match(old.meaning,/NOT_AN_APP_PREPROD_DEPLOYMENT/);
 assert.ok(d.caveats.some(x=>x.includes('not a revived App PREPROD')));
});
test('evidence contains no device IDs, command text, tokens, customer details or raw result JSON',async()=>{
 const d=await read(),raw=JSON.stringify(d);
 for(const key of ['device_id','command_id','token_sha256','idempotency_key','payload_sha256','result_sha256','customer_email','access_token']){
  assert.equal(Object.hasOwn(d,key),false);
  assert.ok(!new RegExp('"'+key+'"\\s*:').test(raw));
 }
 for(const row of d.environments)assert.ok(!Object.keys(row).some(k=>/device_id|payload|result_json|token|email|client/i.test(k)));
});
