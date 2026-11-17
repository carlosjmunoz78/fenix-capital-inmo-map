import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateDeviceLiveProjection} from '../../../api/cerebro-device-live.ts';
const now=Date.now(),stamp=new Date(now).toISOString();
const row=(environment)=>({
 environment,meaning:environment==='LAB'?'LAB_DEVICE_RECORDS':'HISTORICAL_PREPROD_LABEL_IN_LAB_PROJECT',
 stored_online_count:2,not_revoked_count:2,heartbeat_5m_count:0,heartbeat_24h_count:0,
 last_seen_at:'2026-11-10T10:00:00Z',commands_total:1,
 commands_completed:1,commands_failed:0,commands_other:0,
 commands_created_24h:0,latest_completed_at:'2026-11-10T11:00:00Z',receipt_count:1,
 semantically_verified_receipts:1,comparable_successful_duration_samples:1,
 p50_completed_seconds:1.2,p90_completed_seconds:1.2
});
const payload=()=>({
 status:'OK',source:'FENIX_DEVICE_LAB_OWNER_READ_V1',company_id:'fenix',environment:'LAB',
 observed_at:new Date().toISOString(),read_only:true,executed:false,
 data_source_project:'hnqlnvakzaywtafeiybt',data_freshness:'SOURCE_READ_AT_REQUEST_TIME',
 active_agents_verified:null,active_subagents_verified:null,active_jobs_verified:null,cost_eur_measured:null,
 contains_device_ids:false,contains_command_payloads:false,contains_result_bodies:false,
 environments:[row('LAB'),row('PREPROD')]
});
test('LAB owner projection whitelists safe fields and rejects agent census inference',()=>{
 const input={...payload(),secret:'FORBIDDEN',environments:[{...row('LAB'),device_id:'private-device'},row('PREPROD')]};
 const r=validateDeviceLiveProjection(input);
 assert.equal(r.status,'OK');
 assert.equal(r.active_agents_verified,null);
 assert.equal(r.cost_eur_measured,null);
 assert.ok(!JSON.stringify(r).includes('private-device'));
 assert.ok(!JSON.stringify(r).includes('FORBIDDEN'));
 assert.equal(r.environments.length,2);
});
test('inconsistent counts, invalid scope, suspicious ages or bad source fail closed',()=>{
 for(const patch of [
  {company_id:'other'}, {environment:'PROD'}, {data_source_project:'cluhljgonannaafpmblx'},
  {status:'FAILED'}, {executed:true},{active_agents_verified:5},
  {observed_at:'2026-01-01T00:00:00Z'},
  {environments:[{...row('LAB'),heartbeat_5m_count:4},row('PREPROD')]},
  {environments:[{...row('LAB'),receipt_count:3},row('PREPROD')]},
  {environments:[row('PREPROD'),row('LAB')]}
 ])assert.equal(validateDeviceLiveProjection({...payload(),...patch}),null,JSON.stringify(patch).slice(0,130));
});
test('unauthenticated and production requests cannot fetch anything, backend only on demand',async t=>{
 const old=process.env.VERCEL_ENV,oldFetch=globalThis.fetch;
 t.after(()=>{process.env.VERCEL_ENV=old;globalThis.fetch=oldFetch});
 const {default:handler}=await import('../../../api/cerebro-device-live.ts');
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No network permitted')};
 async function run(host,auth=false,method='GET',query='?company_id=fenix'){
  let status,body;
  const res={setHeader(){},status(s){status=s;return this},json(x){body=x;return this}};
  await handler({method,url:'/api/cerebro-device-live'+query,headers:{
   host,...(auth?{authorization:'Bearer '+'x'.repeat(40),apikey:'pub-key-pub-key-pub-key'}:{})
  }},res);
  return {status,body};
 }
 process.env.VERCEL_ENV='production';
 assert.equal((await run('fenix-capital-preprod-qa.vercel.app',true)).status,403);
 process.env.VERCEL_ENV='preview';
 assert.equal((await run('app.fenixcapital.es',true)).status,403);
 assert.equal((await run('fenix-capital-preprod-qa.vercel.app')).status,401);
 assert.equal((await run('fenix-capital-preprod-qa.vercel.app',true,'POST')).status,405);
 assert.equal((await run('fenix-capital-preprod-qa.vercel.app',true,'GET','?company_id=other')).status,403);
 assert.equal(calls,0);
});
