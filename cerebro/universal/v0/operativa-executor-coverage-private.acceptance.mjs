import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import handler,{privateEvidenceHost} from '../../../api/cerebro-executor-coverage.ts';

const host='fenix-capital-preprod-abc123.vercel.app';
const env={...process.env},originalFetch=globalThis.fetch;
const clean=()=>{
 for(const k of ['VERCEL_ENV','VERCEL_URL','CEREBRO_CF_READ_TOKEN_PREVIEW','CEREBRO_PREPROD_PUBLISHABLE_KEY','CEREBRO_CF_D1_READ_ENABLED']){
  if(env[k]===undefined)delete process.env[k];else process.env[k]=env[k];
 }
 globalThis.fetch=originalFetch;
};
const response=()=>{let status=200,body=null;return{
 status(n){status=n;return this},setHeader(){},json(x){body=x;return this},get(){return {status,body}}
}};
const request=async (overrides={})=>{
 const output=response();
 await handler({method:'GET',url:'/api/cerebro-executor-coverage?company_id=fenix',headers:{
  host,authorization:'Bearer '+'a'.repeat(60),apikey:'sb_publishable_'+'b'.repeat(30),...overrides
 }},output);
 return output.get();
};
test('private host gate excludes PROD and unexpected Vercel deployment',()=>{
 assert.equal(privateEvidenceHost(host,'preview',undefined),true);
 assert.equal(privateEvidenceHost(host,'production',host),true);
 assert.equal(privateEvidenceHost(host,'production','fenix-capital-preprod-other.vercel.app'),false);
 assert.equal(privateEvidenceHost('app.fenixcapital.es','preview',undefined),false);
 assert.equal(privateEvidenceHost('evil.example','production','evil.example'),false);
});
test('owner-authenticated sources are separate inventories and historical LAB jobs, never agent activation',async()=>{
 process.env.VERCEL_ENV='preview';
 process.env.CEREBRO_CF_READ_TOKEN_PREVIEW='c'.repeat(60);
 process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY='sb_publishable_'+'d'.repeat(28);
 process.env.CEREBRO_CF_D1_READ_ENABLED='true';
 const urls=[];
 globalThis.fetch=async (url)=>{
  urls.push(String(url));
  if(String(url).includes('api.github.com')&&String(url).includes('/actions/workflows/')){
   const observed=new Date().toISOString();
   return{status:200,ok:true,text:async()=>JSON.stringify({workflow_runs:[{
    id:44373404586,workflow_id:422902482,name:'CEREBRO Operativa verified evidence bridge LAB',
    event:'pull_request',head_branch:'cerebro/operativa-live-evidence-bridge-lab-20261118',
    head_sha:'fa69e852aba63c3d5934b43b8e3f319da5dd6e8e',
    path:'.github/workflows/cerebro-operativa-evidence-bridge-lab.yml@refs/pull/81/merge',
    status:'completed',conclusion:'success',updated_at:observed,
    head_repository:{full_name:'carlosjmunoz78/fenix-capital-inmo-map'},
    html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44373404586'
   }]})};
  }
  if(String(url).includes('api.github.com')&&String(url).includes('/actions/runs/44373404586/jobs')){
   const observed=new Date().toISOString();
   return{status:200,ok:true,text:async()=>JSON.stringify({jobs:[{
    id:135050000001,name:'evidence-bridge',status:'completed',conclusion:'success',
    completed_at:observed,steps:[
      {name:'Run node --experimental-strip-types --test cerebro/universal/v0/agent-evidence-bridge-v1.test.mjs',status:'completed',conclusion:'success'},
      {name:'Run npm run build',status:'completed',conclusion:'success'}]
   }]})};
  }
  if(String(url).includes('fenix-app-gateway/session/context'))return{status:200,json:async()=>({ok:true,context:{actor_code:'CARLOS-ADMIN'}})};
  if(String(url).includes('/d1/database/1305f791-7c44-47f9-946b-f330a09c88aa/query'))return{
   status:200,ok:true,text:async()=>JSON.stringify({success:true,result:[{results:[{
     runner_ticks:2548,runner_completed:3,
     latest_runner_tick_at:'2026-11-19T06:05:44.227Z',
     p5_completed:8,latest_p5_completed_ms:1795046448698,last_24h_nonempty_ticks:0
   }]}]})
  };
  if(String(url).includes('cloudflare.com'))return{status:200,ok:true,text:async()=>JSON.stringify({
   success:true,result:[{id:'worker-one'},{id:'worker-two'}],result_info:{total_pages:1}
  })};
  if(String(url).includes('cerebro-agent-qa-health-lab-v1'))return{
   status:200,ok:true,text:async()=>JSON.stringify({
    status:'OK',source:'SUPABASE_PGCRON_QA_LAB_V1',company_id:'fenix',
    environment:'LAB',engine_id:'QA-001',agent_role_id:'ENG-QA',
    receipt_id:'11111111-2222-4333-8444-555555555555',
    observed_at:new Date().toISOString(),execution_status:'SUCCEEDED',
    tests_passed:6,tests_total:6,runs_count:2,recent:true,
    signature_verified:true,physical_execution_evidenced:true,
    operational_autonomy_certified:false,excellence_certified:false,
    customer_data_touched:false,prod_execution_enabled:false,
    read_only:true,request_executed_job:false
   })
  };
  if(String(url).includes('cerebro-creative-hold-gates-lab-v1'))return{
   status:200,ok:true,text:async()=>JSON.stringify({
    status:'OK',source:'CEREBRO_LAB_CREATIVE_HOLD_GATES_V1',company_id:'fenix',
    environment:'LAB',read_only:true,executed:false,paid_generation_enabled:false,
    owner_rejection_override:false,all_certified:false,prod_execution_enabled:false,
    external_actions_executed:false,engines:[
     {engine_id:'FACT-001',historical_jobs:17,jobs_on_hold:10,historical_succeeded:7,
      safe_to_resume:false,autonomy_certified:false,blockers:[
       {state:'HOLD',reason_code:'BLOCKED_EXECUTOR_PAID_LANE_NOT_DEPLOYED',count:1},
       {state:'HOLD',reason_code:'OPENAI_PAID_WORKER_AND_SECURITY_GATE_PENDING',count:9},
       {state:'SUCCEEDED',reason_code:'NONE',count:7}]},
     {engine_id:'UMS-001',historical_jobs:1,jobs_on_hold:1,historical_succeeded:0,
      safe_to_resume:false,autonomy_certified:false,blockers:[
       {state:'HOLD',reason_code:'CREATIVE_REJECTED_BY_OWNER',count:1}]}
    ]})
  };
  if(String(url).includes('cerebro-console-readonly-lab-v1'))return{status:200,ok:true,text:async()=>JSON.stringify({
   status:'OK',source:'CEREBRO_CONSOLE_READONLY_LAB_V1',
   company_id:'fenix',environment:'LAB',engine_id:'CONSOLE-001',
   capability_id:'repo.sandbox.public.readonly.v0',
   repository:'carlosjmunoz78/fenix-capital-inmo-map',branch:'main',
   read_only:true,executed_job:true,github_actions_used:false,
   original_dispatcher_unchanged:true,legacy_worker_executed:false,
   agent_role_identity_verified:false,full_engine_certified:false,
   autonomy_certified:false,external_actions_executed:false,prod_execution_enabled:false,
   marginal_cost_eur_measured:false,specific_capability_evidenced:true,signed:true,
   execution_state:'SUCCEEDED',http_status:200,
   completed_job_count:1,job_id:'997567e9-77d1-49e0-832c-e4695c25e18d',
   observed_commit_sha:'902022f5d4dcc4aab29e6d35411a63c38fe438e7',
   last_execution_at:new Date().toISOString()
  })};
  if(String(url).includes('cerebro-dispatch-health-lab-v1'))return{status:200,ok:true,text:async()=>JSON.stringify({
   status:'HEALTH_ENDPOINTS_RESPOND',source:'CEREBRO_LAB_DISPATCH_HEALTH_SIGNED_V1',
   company_id:'fenix',environment:'LAB',read_only:true,executed:false,
   signed_samples:4,healthy_endpoints:4,runner_capability:'HTTP_HEALTH_ONLY',
   legacy_jobs_executed:false,full_engine_certified:false,prod_execution_enabled:false,
   github_actions_required_to_execute_original_workers:true,
   signed_by_private_db_key:true,certifies_original_executors:false,
   sources:[
    {service:'jarvis-work-dispatch-v1-preprod',engine_id:'CONSOLE-001'},
    {service:'cerebro-browser-work-total-dispatch-v1-preprod',engine_id:'CONSOLE-001'},
    {service:'cerebro-creative-dispatch-v1',engine_id:'FACT-001'},
    {service:'cerebro-ums-production-dispatch-v1',engine_id:'UMS-001'}
   ].map(x=>({...x,last_checked_at:new Date().toISOString(),http_status:200,
    health_state:'HEALTH_ENDPOINT_OK',signature_verified:true,recent:true,
    runtime_execution_verified:false,autonomy_certified:false}))
  })};
  if(String(url).includes('cerebro-cert-supervisor-history-lab-v1'))return{status:200,ok:true,text:async()=>JSON.stringify({
   status:'OK',source:'CEREBRO_CERT_SUPERVISOR_DURABLE_LAB_V1',read_only:true,
   executed:false,company_id:'fenix',environment:'LAB',receipt_id:'aaaaaaa1-bbbb-4ccc-8ddd-eeeeeeeeeeee',
   observed_at:new Date().toISOString(),health:'EVIDENCE_OK_NOT_CERTIFIED',
   signed:true,history_count:2,recent:true,gate_count:5,
   global_autonomy_certified:false,excellence_certified:false,
   cost_measured:false,prod_execution_enabled:false,
   actual_engine_promotion:false,cron_job_id:77
  })};
  if(String(url).includes('cerebro-certification-gates-lab-v1'))return{status:200,ok:true,text:async()=>JSON.stringify({
   status:'OK',source:'CEREBRO_LAB_CERTIFICATION_GATES_V1',read_only:true,executed:false,
   company_id:'fenix',environment:'LAB',prod_execution_enabled:false,
   global_autonomy_certified:false,global_excellence_certified:false,cost_measured:false,
   evidence_categories:[
    {id:'QA-001',kind:'SIGNED_LAB_QA_EXECUTION',full_engine_certified:false,
      business_quality_certified:false,specific_capability_evidenced:true,tests_passed:6,tests_total:6,signed_runs:5},
    {id:'FACT-001',kind:'HISTORICAL_REGISTRY_ATTESTATION',full_engine_certified:false,
      business_quality_certified:false,specific_capability_evidenced:true},
    {id:'CONSOLE-001',kind:'LEGACY_JOB_HISTORY_UNATTRIBUTED',historical_rows:123,
      full_engine_certified:false,business_quality_certified:false},
    {id:'UMS-001',kind:'HOLD_IN_LEGACY_CREATIVE_QUEUE',historical_rows:1,
      full_engine_certified:false,business_quality_certified:false},
    {id:'SOCIAL_LAB_SCHEDULES',kind:'SCHEDULE_EXECUTION_METADATA',
      scheduled_jobs_total:19,active_schedules:17,active_schedules_succeeded_within_48h:9,
      agent_identity_verified:false,business_outcome_verified:false,full_engine_certified:false}
   ]
  })};
  if(String(url).includes('cerebro-engine-truth-lab-v1'))return{status:200,ok:true,text:async()=>JSON.stringify({
   status:'OK',source:'CEREBRO_LAB_ENGINE_TRUTH_AUDIT_V1',read_only:true,executed:false,
   company_id:'fenix',environment:'LAB',all_engines_certified:false,autonomy_global_certified:false,
   historical_job_rows:141,sources:[
    {source:'JARVIS',engine_id:'CONSOLE-001',environment:'PREPROD',
     historical_jobs:6,explicit_role_rows:0,recent_metadata_rows:0,
     last_job_metadata_at:'2026-11-09T00:00:00Z',diagnosis:'NO_RECENT_METADATA',
     role_activation_verified:false,engine_certified_autonomous:false},
    {source:'BROWSER',engine_id:'CONSOLE-001',environment:'PREPROD',
     historical_jobs:117,explicit_role_rows:0,recent_metadata_rows:0,
     last_job_metadata_at:'2026-10-26T00:00:00Z',diagnosis:'NO_RECENT_METADATA',
     role_activation_verified:false,engine_certified_autonomous:false},
    {source:'CREATIVE',engine_id:'FACT-001',environment:'PREPROD',
     historical_jobs:17,explicit_role_rows:0,recent_metadata_rows:0,
     last_job_metadata_at:'2026-11-05T00:00:00Z',diagnosis:'NO_RECENT_METADATA',
     role_activation_verified:false,engine_certified_autonomous:false},
    {source:'CREATIVE',engine_id:'UMS-001',environment:'PREPROD',
     historical_jobs:1,explicit_role_rows:0,recent_metadata_rows:0,
     last_job_metadata_at:'2026-10-26T00:00:00Z',diagnosis:'NO_RECENT_METADATA',
     role_activation_verified:false,engine_certified_autonomous:false}
   ]})};
  if(String(url).includes('cerebro-operativa-job-telemetry-lab-v0'))return{status:200,ok:true,text:async()=>JSON.stringify({
   status:'OK',source:'FENIX_LAB_AGENT_JOB_AGGREGATE_V1',company_id:'fenix',environment:'LAB',
   read_only:true,agent_identity_verified:false,active_agent_count:null,
   source_totals:[{source:'JARVIS_WORK',total_rows:2},{source:'BROWSER_V2',total_rows:4},{source:'CREATIVE_V1',total_rows:1}]
  })};
  throw Error('UNEXPECTED_NETWORK');
 };
 try{
  const x=await request();
  assert.equal(x.status,200,JSON.stringify(x.body));
  assert.equal(x.body.status,'OK');
  assert.equal(x.body.inventory_sources[0].visible_count,2);
  assert.equal(x.body.inventory_sources[1].visible_count,7);
  assert.equal(x.body.inventory_sources[0].metric_label,'WORKERS_IN_ACCOUNT');
  assert.equal(x.body.inventory_sources[1].metric_label,'HISTORICAL_LAB_JOB_ROWS');
  assert.equal(x.body.runtime_verified_profiles,1);
  assert.equal(x.body.active_recent_profiles,0);
  assert.equal(x.body.unverified_profiles,2476);
  assert.equal(x.body.templates_not_instances,29);
  assert.equal(x.body.active_executor_count,null);
  assert.equal(x.body.receipt_source_status,'SUPABASE_SIGNED_SQL_QA');
  assert.equal(x.body.lab_qa.status,'LIVE');
  assert.equal(x.body.lab_qa.signature_verified,true);
  assert.equal(x.body.lab_qa.tests_passed,6);
  assert.equal(x.body.verified_profiles[0].proof_source,'SUPABASE_PGCRON');
  assert.equal(x.body.verified_profiles[0].proof_url,null);
  assert.equal(x.body.verified_profiles[0].id,'ENG-QA');
  assert.equal(x.body.verified_profiles[0].tribunal_passed,false);
  assert.equal(x.body.supervisor.excellence_verified,0);
  assert.equal(x.body.engine_truth.status,'LIVE');
  assert.equal(x.body.engine_truth.historical_job_rows,141);
  assert.equal(x.body.engine_truth.sources.length,4);
  assert.equal(x.body.engine_truth.sources.filter(x=>x.recent_metadata_rows>0).length,0);
  assert.equal(x.body.engine_truth.sources.every(x=>x.engine_certified_autonomous===false),true);
  assert.equal(x.body.certification_gates.status,'LIVE');
  assert.equal(x.body.certification_gates.evidence_categories.length,5);
  assert.equal(x.body.certification_gates.global_autonomy_certified,false);
  assert.equal(x.body.certification_gates.evidence_categories.find(v=>v.id==='SOCIAL_LAB_SCHEDULES').active_schedules,17);
  assert.equal(x.body.certification_gates.evidence_categories.find(v=>v.id==='UMS-001').full_engine_certified,false);
  assert.equal(x.body.durable_supervisor.status,'LIVE');
  assert.equal(x.body.durable_supervisor.signed,true);
  assert.equal(x.body.durable_supervisor.cron_job_id,77);
  assert.equal(x.body.durable_supervisor.global_autonomy_certified,false);
  assert.equal(x.body.dispatch_health.status,'LIVE');
  assert.equal(x.body.dispatch_health.healthy_endpoints,4);
  assert.equal(x.body.dispatch_health.signed_samples,4);
  assert.equal(x.body.dispatch_health.full_engine_certified,false);
  assert.equal(x.body.dispatch_health.sources.every(x=>x.signature_verified===true&&x.runtime_execution_verified===false),true);
  assert.equal(x.body.console_job.status,'LIVE');
  assert.equal(x.body.console_job.signature_verified,true);
  assert.equal(x.body.console_job.specific_capability_evidenced,true);
  assert.equal(x.body.console_job.legacy_worker_executed,false);
  assert.equal(x.body.console_job.agent_role_identity_verified,false);
  assert.equal(x.body.creative_hold_gates.status,'LIVE');
  assert.equal(x.body.creative_hold_gates.engines[0].jobs_on_hold,10);
  assert.equal(x.body.creative_hold_gates.engines[1].blockers[0].reason_code,'CREATIVE_REJECTED_BY_OWNER');
  assert.equal(x.body.creative_hold_gates.owner_rejection_override,false);
  assert.equal(x.body.fact_p5_recovery.status,'LIVE');
  assert.equal(x.body.fact_p5_recovery.runner_ticks,2548);
  assert.equal(x.body.fact_p5_recovery.p5_completed,8);
  assert.equal(x.body.fact_p5_recovery.company_id_match,false);
  assert.equal(x.body.fact_p5_recovery.full_engine_certified,false);
  assert.equal(x.body.fact_p5_recovery.results_are_signed_agent_receipts,false);
  assert.equal(urls.length,13);
 }finally{clean();}
});
test('no session, wrong company or other host fail before provider fetch',async()=>{
 process.env.VERCEL_ENV='preview';
 let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('MUST_NOT_CALL_FETCH')};
 try{
  assert.equal((await request({authorization:''})).status,401);
  assert.equal((await request({host:'app.fenixcapital.es'})).status,403);
  const output=response();
  await handler({method:'GET',url:'/api/cerebro-executor-coverage?company_id=other',
   headers:{host,authorization:'Bearer '+'a'.repeat(60),apikey:'sb_publishable_'+'b'.repeat(30)}},output);
  assert.equal(output.get().status,403);
  assert.equal(calls,0);
 }finally{clean();}
});
test('preview client host and protected premium route do not regress',()=>{
 const roster=readFileSync(new URL('../../../src/CerebroRoleAgentRosterReadonly.tsx',import.meta.url),'utf8');
 const hostUI=readFileSync(new URL('../../../src/CerebroConsoleHost.tsx',import.meta.url),'utf8');
 assert(roster.includes('window.location.hostname'));
 assert(!roster.includes(String.fromCharCode(92,92)+'.vercel'));
 assert(hostUI.includes('const previewOwnerGate=Boolean(isCerebroPath&&previewHost);'));
 assert(hostUI.includes('const showPremiumV3=(realProduction||previewHost||visualPreview)&&!legacyRequested;'));
 assert(hostUI.includes("fetch('/api/cerebro-preview-owner'"));
});
