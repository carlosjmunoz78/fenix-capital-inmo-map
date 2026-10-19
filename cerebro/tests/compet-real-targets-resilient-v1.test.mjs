import test from 'node:test';
import assert from 'node:assert/strict';
import { isRetryableCompetTransientV1, runCompetRealTargetsResilientV1 } from '../runtime/compet-real-targets-resilient-v1.mjs';

const green=Object.freeze({
  schema_version:'1.0.0',state_type:'CEREBRO_COMPET_REAL_TARGET_SCAN_V0',company_id:'fenix',engine_id:'COMPET-001',environment:'PREPROD',
  status:'REAL_COMPETITOR_CONTINUOUS_SCAN_GREEN',target_count:3,snapshots:[],baseline_complete:true,change_count:0,changes:[],job_id:'fixture',job_status:'SUCCEEDED',next_scheduled_for:'2026-10-19T00:00:00Z',
  network_reads:3,provider_writes:0,customer_data_used:false,personal_data_extracted:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
});

test('classifier retries only transient transport or server failures',()=>{
  for(const e of [new TypeError('fetch failed'),new Error('remote HTTP status 503'),new Error('ECONNRESET'),new Error('ETIMEDOUT')])assert.equal(isRetryableCompetTransientV1(e),true,String(e));
  for(const e of [new Error('remote HTTP status 404'),new Error('public source adapter requires HTTPS'),new Error('content-type denied:image/png')])assert.equal(isRetryableCompetTransientV1(e),false,String(e));
});

test('transient first failure retries once and preserves V0 green authority',async()=>{
  let calls=0;let sleeps=0;
  const run_v0=async()=>{calls+=1;if(calls===1)throw new TypeError('fetch failed');return green;};
  const out=await runCompetRealTargetsResilientV1({run_v0,sleep_fn:async()=>{sleeps+=1;},retry_delays_ms:[0,0]});
  assert.equal(calls,2);assert.equal(sleeps,1);assert.equal(out.attempt_count,2);assert.equal(out.retry_count,1);
  assert.equal(out.base_runtime_preserved,true);assert.equal(out.resilience_wrapper,'compet-real-targets-resilient-v1');
  assert.equal(out.prod_authorized,false);assert.equal(out.prod_write_authorized,false);assert.equal(out.provider_writes,0);assert.equal(out.customer_data_used,false);assert.equal(out.trading_access,false);assert.equal(out.additional_cost_eur,0);
});

test('persistent transient failure stops after exactly three attempts',async()=>{
  let calls=0;let sleeps=0;
  const run_v0=async()=>{calls+=1;throw new TypeError('fetch failed');};
  await assert.rejects(()=>runCompetRealTargetsResilientV1({run_v0,sleep_fn:async()=>{sleeps+=1;},retry_delays_ms:[0,0]}),/fetch failed/);
  assert.equal(calls,3);assert.equal(sleeps,2);
});

test('non-transient policy failure remains fail-closed without retry',async()=>{
  let calls=0;let sleeps=0;
  const run_v0=async()=>{calls+=1;throw new Error('remote HTTP status 404');};
  await assert.rejects(()=>runCompetRealTargetsResilientV1({run_v0,sleep_fn:async()=>{sleeps+=1;},retry_delays_ms:[0,0]}),/remote HTTP status 404/);
  assert.equal(calls,1);assert.equal(sleeps,0);
});

test('wrapper rejects any accidental authority expansion from preserved V0',async()=>{
  const unsafe=async()=>({...green,prod_authorized:true});
  await assert.rejects(()=>runCompetRealTargetsResilientV1({run_v0:unsafe,retry_delays_ms:[]}),/authority boundary violated/);
});
