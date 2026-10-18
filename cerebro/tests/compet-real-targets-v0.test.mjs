import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCompetTargetEvidenceV0, isRetryablePublicSourceError } from '../runtime/compet-real-targets-v0.mjs';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const config=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../registry/compet-real-targets.v0.json'),'utf8'));

const target=Object.freeze({competitor_id:'fixture-competitor',name:'Fixture',url:'https://example.test/',geography:'cordoba',business_relevance:'fixture'});
const greenEvidence=Object.freeze({
  status:'REMOTE_READ_GREEN',
  http_status:200,
  read_only:true,
  final_url:'https://example.test/',
  summary:Object.freeze({title:'Fixture'}),
  body_sha256:'a'.repeat(64),
  body_bytes:1
});

test('COMPET real targets remain PREPROD, public and company scoped',()=>{
  assert.equal(config.company_id,'fenix');
  assert.equal(config.engine_id,'COMPET-001');
  assert.equal(config.environment,'PREPROD');
  assert.equal(config.source_policy,'PUBLIC_OFFICIAL_COMPETITOR_WEBSITE_GET_ONLY');
  assert.equal(config.targets.length,3);
  for(const item of config.targets){
    const u=new URL(item.url);
    assert.equal(u.protocol,'https:');
    assert.match(item.competitor_id,/^[a-z0-9-]+$/);
    assert.equal(item.geography,'cordoba');
  }
});

test('real baselines and three genuine scheduled runs are certified without granting side effects',()=>{
  assert.equal(config.status,'REAL_TARGETS_CONTINUOUS_PREPROD_ACCEPTANCE_GREEN');
  assert.equal(config.baseline_capture.result,'GREEN');
  assert.equal(config.targets.every(t=>t.baseline&&typeof t.baseline.body_sha256==='string'&&t.baseline.body_sha256.length===64),true);
  assert.equal(config.scheduler.configured,true);
  assert.equal(config.scheduler.kind,'GITHUB_ACTIONS_CRON');
  assert.equal(config.scheduler.cron,'43 5 * * *');
  assert.equal(config.scheduler.soak_complete,true);
  assert.equal(config.scheduler.required_scheduled_green_runs,3);
  assert.equal(config.scheduler.verified_scheduled_green_runs,3);
  assert.equal(config.scheduler.qualifying_run_ids.length,3);
  assert.equal(new Set(config.scheduler.qualifying_run_ids).size,3);
  assert.equal(config.scheduled_soak_certification.verified_scheduled_green_runs,3);
  assert.equal(config.scheduled_soak_certification.missing_scheduled_green_runs,0);
  assert.equal(config.scheduled_soak_certification.manual_or_dispatch_substitution,false);
  assert.equal(config.remaining_gate,null);
});

test('data minimization and authority are fail closed',()=>{
  assert.equal(config.data_minimization.personal_data,false);
  assert.equal(config.data_minimization.customer_data,false);
  assert.equal(config.data_minimization.body_persisted,false);
  assert.equal(config.data_minimization.contacts_extracted,false);
  const a=config.authority;
  assert.equal(a.prod_authorized,false);
  assert.equal(a.prod_write_authorized,false);
  assert.equal(a.provider_write_authorized,false);
  assert.equal(a.customer_data_authorized,false);
  assert.equal(a.external_dependency_install_authorized,false);
  assert.equal(a.trading_access,false);
  assert.equal(a.automatic_paid_fallback,false);
  assert.equal(a.additional_cost_eur,0);
});

test('retry classifier accepts only bounded transient network/server failures',()=>{
  for(const error of [new TypeError('fetch failed'),new Error('remote HTTP status 503'),new Error('ECONNRESET'),new Error('ETIMEDOUT')])assert.equal(isRetryablePublicSourceError(error),true,String(error));
  for(const error of [new Error('remote HTTP status 404'),new Error('public source adapter requires HTTPS'),new Error('content-type denied:image/png')])assert.equal(isRetryablePublicSourceError(error),false,String(error));
});

test('one transient failure retries once and then accepts a green read-only result',async()=>{
  let calls=0;let sleeps=0;
  const fetcher=async()=>{calls+=1;if(calls===1)throw new TypeError('fetch failed');return greenEvidence;};
  const result=await fetchCompetTargetEvidenceV0(target,{fetcher,sleep_fn:async()=>{sleeps+=1;},retry_delays_ms:[0,0]});
  assert.equal(calls,2);
  assert.equal(sleeps,1);
  assert.equal(result.attempts,2);
  assert.equal(result.evidence.status,'REMOTE_READ_GREEN');
  assert.equal(result.evidence.read_only,true);
});

test('persistent transient failure stops after exactly three attempts',async()=>{
  let calls=0;let sleeps=0;
  const fetcher=async()=>{calls+=1;throw new TypeError('fetch failed');};
  await assert.rejects(()=>fetchCompetTargetEvidenceV0(target,{fetcher,sleep_fn:async()=>{sleeps+=1;},retry_delays_ms:[0,0]}),/fetch failed/);
  assert.equal(calls,3);
  assert.equal(sleeps,2);
});

test('non-transient failure remains fail-closed without retry',async()=>{
  let calls=0;let sleeps=0;
  const fetcher=async()=>{calls+=1;throw new Error('remote HTTP status 404');};
  await assert.rejects(()=>fetchCompetTargetEvidenceV0(target,{fetcher,sleep_fn:async()=>{sleeps+=1;},retry_delays_ms:[0,0]}),/remote HTTP status 404/);
  assert.equal(calls,1);
  assert.equal(sleeps,0);
});
