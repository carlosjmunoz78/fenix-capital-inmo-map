import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeFailedJob} from './operator-job-detail.mjs';

const repo='carlosjmunoz78/fenix-capital-inmo-map',run_id=53111;
const job=(overrides={})=>({
 id:88,run_id,status:'completed',conclusion:'failure',name:'test and lint',
 html_url:'https://github.com/'+repo+'/actions/runs/'+run_id+'/job/88',
 steps:[{name:'Set up job',number:1,status:'completed',conclusion:'success'},
  {name:'Run tests',number:2,status:'completed',conclusion:'failure'}],
 ...overrides
});
test('public provider metadata yields only verified failed step and never engine identity',()=>{
 const o=summarizeFailedJob({jobs:[job()]},{repo,run_id});
 assert.equal(o.status,'FAILED_STEP_VERIFIED');
 assert.equal(o.failed_step_name,'Run tests');
 assert.equal(o.failed_step_number,2);
 assert.equal(o.job_id,88);
 assert.equal(o.agent_id,null);
 assert.equal(o.engine_id,null);
 assert.equal(o.runtime_failure_verified,false);
 assert.equal(o.executed,false);
 assert.equal(o.evidence_url,'https://github.com/'+repo+'/actions/runs/'+run_id+'/job/88');
 assert.equal('logs' in o,false);
});
test('failed job without failed step cannot attribute a step or cause',()=>{
 const o=summarizeFailedJob({jobs:[job({steps:[{number:1,name:'Job started',conclusion:'success',status:'completed'}]})]},{repo,run_id});
 assert.equal(o.status,'FAILED_JOB_STEP_UNKNOWN');
 assert.equal(o.failed_step_name,null);
 assert.equal(o.failed_step_number,null);
});
test('forged provider job, repo, cross run and URL fail closed',()=>{
 for(const bad of [
  {jobs:[job({run_id:123})]},{jobs:[job({id:-8})]},{jobs:[job({status:'in_progress'})]},
  {jobs:[job({conclusion:'success'})]},{jobs:[job({html_url:'https://attacker.invalid/steal'})]},
  {jobs:[job({steps:Array(81).fill({name:'spam',number:1,status:'completed',conclusion:'failure'} )})]},
  {jobs:Array(21).fill(job())}
 ])assert.equal(summarizeFailedJob(bad,{repo,run_id}),null);
 assert.equal(summarizeFailedJob({jobs:[job()]},{repo:'thirdparty/company',run_id}),null);
 assert.equal(summarizeFailedJob({jobs:[job()]},{repo,run_id:0}),null);
});
test('bounded provider data, no executable commands or secrets retained',()=>{
 const o=summarizeFailedJob({jobs:[job({name:'Z'.repeat(180),
  steps:[{number:2,name:'A'.repeat(180),conclusion:'failure',status:'completed'}]})]},{repo,run_id});
 assert.equal(o.job_name.length,100);
 assert.equal(o.failed_step_name.length,100);
});
test('route in PROD and unauthenticated preview refuses network access',async(t)=>{
 const oldEnv=process.env.VERCEL_ENV,oldFetch=globalThis.fetch;
 t.after(()=>{process.env.VERCEL_ENV=oldEnv;globalThis.fetch=oldFetch});
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('NETWORK_UNAUTHORIZED')};
 const {default:handler}=await import('../../../api/cerebro-fleet-job-detail.ts');
 const invoke=async(host,auth=false)=>{
  let code=null,body=null;
  const res={setHeader(){},status(n){code=n;return this},json(v){body=v;return this}};
  await handler({method:'GET',url:'/api/cerebro-fleet-job-detail?company_id=fenix&repo=fenix-capital-inmo-map&run_id=53111',
   headers:{host,...auth?{authorization:'Bearer '+'x'.repeat(25),apikey:'not-a-real-key-123'}:{}}},res);
  return {code,body};
 };
 process.env.VERCEL_ENV='production';
 assert.deepEqual((await invoke('fenix-capital-preprod-qa.vercel.app')).code,403);
 process.env.VERCEL_ENV='preview';
 assert.equal((await invoke('prod.fenixcapital.es')).code,403);
 assert.equal((await invoke('fenix-capital-preprod-qa.vercel.app')).code,401);
 assert.equal(calls,0);
});
test('owner-gated preview fetches one allowlisted provider endpoint, never raw logs',async(t)=>{
 const oldEnv=process.env.VERCEL_ENV,oldFetch=globalThis.fetch;
 t.after(()=>{process.env.VERCEL_ENV=oldEnv;globalThis.fetch=oldFetch});
 process.env.VERCEL_ENV='preview';
 const urls=[];
 globalThis.fetch=async(url,opts)=>{
  urls.push({url,method:opts.method});
  if(url.includes('/session/context'))return {status:200,json:async()=>({context:{actor_code:'CARLOS-ADMIN'}})};
  if(url==='https://api.github.com/repos/'+repo+'/actions/runs/'+run_id+'/jobs?per_page=20')
   return {status:200,json:async()=>({jobs:[job()]})};
  throw Error('UNEXPECTED_ENDPOINT');
 };
 const {default:handler}=await import('../../../api/cerebro-fleet-job-detail.ts');
 const invoke=async(url)=>{
  let code,body;
  const res={setHeader(){},status(n){code=n;return this},json(v){body=v;return this}};
  await handler({method:'GET',url,
   headers:{host:'fenix-capital-preprod-qa.vercel.app',authorization:'Bearer '+'x'.repeat(25),
    apikey:'not-a-real-key-123'}},res);
  return {code,body};
 };
 const r=await invoke('/api/cerebro-fleet-job-detail?company_id=fenix&repo=fenix-capital-inmo-map&run_id=53111');
 assert.equal(r.code,200);
 assert.equal(r.body.status,'OK');
 assert.equal(r.body.job_status,'FAILED_STEP_VERIFIED');
 assert.equal(r.body.failed_step_name,'Run tests');
 assert.equal(r.body.engine_id,null);
 assert.equal(r.body.read_only,true);
 assert.equal(r.body.executed,false);
 assert.equal(urls.length,2);
 assert.equal(urls[0].method,'GET');
 assert.equal(urls[1].method,'GET');
 const before=urls.length;
 const denied=await invoke('/api/cerebro-fleet-job-detail?company_id=fenix&repo=other-repo&run_id=53111');
 assert.equal(denied.code,400);
 assert.equal(urls.length,before);
});
