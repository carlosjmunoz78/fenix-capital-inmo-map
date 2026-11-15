import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectAgentJobSummary} from './agent-job-live/job-projection.mjs';
import {validateJobFleetLive} from '../../../api/cerebro-agent-job-live.ts';
const now=Date.now(),observedAt=new Date(now).toISOString();
const old=new Date(now-10*86400000).toISOString();
const recent=new Date(now-60000).toISOString();
const job=(status,source='JARVIS_WORK')=>({
 company_id:'fenix',environment:'PREPROD',engine_id:'CONSOLE-001',status,
 created_at:old,updated_at:recent,lease_expires_at:null,
 ...(source==='JARVIS_WORK'?{heartbeat_at:null}:{last_heartbeat_at:null}),
 job_id:'MUST_NEVER_BE_RETURNED',payload:{secret:'PRIVATE'}});
const metric={
 company_id:'fenix',environment:'PREPROD',outcome:'SUCCEEDED',created_at:old,
 duration_ms:5400,incremental_cost_eur:'0.0000',secret_material_logged:false,
 worker_id:'PRIVATE_ID',job_id:'PRIVATE_JOB'};
const input=()=>({
 observedAt,jarvis:[job('SUCCEEDED'),job('DEAD_LETTER')],
 browser:[{...job('QUEUED','BROWSER_V2'),updated_at:old},job('SUCCEEDED','BROWSER_V2')],
 creative:[{...job('HOLD','CREATIVE_V1'),engine_id:'FACT-001'}],
 metrics:[metric]
});
test('real job records produce historical grouped evidence without agent identity or payloads',()=>{
 const r=projectAgentJobSummary(input());
 assert.equal(r.status,'OK');
 assert.equal(r.active_agent_count,null);
 assert.equal(r.active_job_count,null);
 assert.equal(r.independent_worker_heartbeat_verified,false);
 assert.equal(r.source_totals.find(x=>x.source==='JARVIS_WORK').total_rows,2);
 assert.equal(r.attention_groups.length,3);
 assert.ok(r.attention_groups.some(x=>x.status==='QUEUED'&&x.stale_queued_24h_count===1));
 assert.ok(!JSON.stringify(r).includes('PRIVATE_ID'));
 assert.ok(!JSON.stringify(r).includes('MUST_NEVER_BE_RETURNED'));
 assert.equal(r.cost_metrics.recorded_incremental_cost_eur,0);
 assert.equal(r.cost_metrics.overall_infrastructure_cost_eur,null);
 assert.equal(r.cost_metrics.p50_duration_seconds,5.4);
 assert.equal(r.cost_metrics.p90_duration_seconds,5.4);
});
test('invalid company, duplicate labels, secret log flag, time and oversized sources fail closed',()=>{
 const b=input();
 for(const patch of [
  {jarvis:[{...job('SUCCEEDED'),company_id:'other'}]},
  {browser:[{...job('HOLD','BROWSER_V2'),environment:'PROD'}]},
  {creative:[{...job('HOLD','CREATIVE_V1'),engine_id:'INVALID!'}]},
  {metrics:[{...metric,secret_material_logged:true}]},
  {metrics:[{...metric,incremental_cost_eur:'-3'}]},
  {jarvis:Array(301).fill(job('SUCCEEDED'))},
  {observedAt:'not-a-date'}
 ])assert.equal(projectAgentJobSummary({...b,...patch}),null);
});
test('preview response validates source scopes, counters, prices; strips injected fields',()=>{
 const p=projectAgentJobSummary(input());
 const valid=validateJobFleetLive({...p,private_field:'NO_LEAK',
  groups:p.groups.map(x=>({...x,payload:'NO_LEAK_GROUP'}))});
 assert.equal(valid.status,'OK');
 assert.ok(!JSON.stringify(valid).includes('NO_LEAK'));
 assert.equal(valid.cost_metrics.recorded_incremental_cost_eur,0);
 assert.equal(valid.cost_metrics.overall_infrastructure_cost_eur,null);
 for(const patch of [
  {company_id:'other'}, {environment:'PROD'}, {active_agent_count:100},
  {project_id:'PROD'}, {observed_at:'2026-01-01T00:00:00Z'},
  {cost_metrics:{...p.cost_metrics,overall_infrastructure_cost_eur:0}},
  {groups:p.groups.map((x,i)=>i===0?{...x,heartbeat_5m_count:999}:x)}
 ])assert.equal(validateJobFleetLive({...p,...patch}),null);
});
test('preview blocks unauthenticated, arbitrary origin, wrong scope and production before fetching',async t=>{
 const orig=process.env.VERCEL_ENV,origFetch=globalThis.fetch;
 t.after(()=>{process.env.VERCEL_ENV=orig;globalThis.fetch=origFetch});
 const {default:handler}=await import('../../../api/cerebro-agent-job-live.ts');
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unexpected remote fetch')};
 async function invoke(host,auth=false,method='GET',query='?company_id=fenix',origin=null){
  let status=null;
  const res={setHeader(){},status(n){status=n;return this},json(){return this}};
  await handler({method,url:'/api/cerebro-agent-job-live'+query,headers:{
   host,...(origin?{origin}:{}),...(auth?{authorization:'Bearer '+'z'.repeat(40),apikey:'test-publishable-key-012345'}:{})
  }},res);
  return status;
 }
 process.env.VERCEL_ENV='production';
 assert.equal(await invoke('fenix-capital-preprod-x.vercel.app',true),403);
 process.env.VERCEL_ENV='preview';
 assert.equal(await invoke('app.fenixcapital.es',true),403);
 assert.equal(await invoke('fenix-capital-preprod-x.vercel.app'),401);
 assert.equal(await invoke('fenix-capital-preprod-x.vercel.app',true,'POST'),405);
 assert.equal(await invoke('fenix-capital-preprod-x.vercel.app',true,'GET','?company_id=other'),403);
 assert.equal(await invoke('fenix-capital-preprod-x.vercel.app',true,'GET','?company_id=fenix','https://attacker.invalid'),403);
 assert.equal(calls,0);
});
