/** GitHub provider-checked identity for 3 separately hosted Actions jobs.
 * Authenticates each GitHub job identity (not individual human/agent IAM or an OIDC identity).
 * All tokens are read-only and transient, never persisted.
 */
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const BRANCH='cerebro/seo-enterprise-family-staging-contract-v1-20261105';
const WORKFLOW='.github/workflows/cerebro-seo-staging-readonly-v0.yml';
export const JOB_ROLE=Object.freeze({
 'seo-worker-isolated':{role_id:'SEO_D15_WORKER',scope:'mission:execute'},
 'seo-qa-isolated':{role_id:'SEO_D31_QA',scope:'mission:evaluate'},
 'seo-tribunal-isolated':{role_id:'SEO_JUDGE_A',scope:'mission:verdict:read'}
});
const fail=code=>{throw Error('SEO_ISOLATED_WORKLOAD_'+code)};
const number=s=>typeof s==='string'&&/^[1-9][0-9]{0,14}$/.test(s)?Number(s):NaN;
function guardInt(n){return Number.isSafeInteger(n)&&n>0}
export async function verifyIsolatedWorkload({env,token,fetchImpl=globalThis.fetch,pause=ms=>new Promise(r=>setTimeout(r,ms)),previous_jobs=[]}={}){
 if(!env||env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==REPO||
    env.GITHUB_EVENT_NAME!=='pull_request'||env.GITHUB_HEAD_REF!==BRANCH)fail('CONTEXT_DENIED');
 if(!Object.hasOwn(JOB_ROLE,env.GITHUB_JOB))fail('ROLE_JOB_NOT_ALLOWED');
 const runId=number(env.GITHUB_RUN_ID),attempt=number(env.GITHUB_RUN_ATTEMPT);
 if(!guardInt(runId)||!guardInt(attempt)||typeof token!=='string'||token.length<15)fail('TOKEN_OR_RUN_INVALID');
 if(!Array.isArray(previous_jobs)||previous_jobs.some(x=>!x||typeof x!=='object'))fail('PREVIOUS_JOBS_INVALID');
 const ask=async path=>{
  let response;
  try{response=await fetchImpl('https://api.github.com/repos/'+REPO+path,{
   method:'GET',redirect:'error',headers:{
    Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
    Authorization:'Bearer '+token
   },signal:AbortSignal.timeout(8000)})}
  catch{fail('PROVIDER_UNAVAILABLE')}
  if(!response?.ok)fail('PROVIDER_REJECTED_'+(path.includes('/jobs?')?'JOBS':'RUN')+'_'+String(response?.status||'UNKNOWN'));
  try{return await response.json()}catch{fail('PROVIDER_INVALID_RESPONSE')}
 };
 const run=await ask('/actions/runs/'+runId);
 if(run.id!==runId||run.repository?.full_name!==REPO||run.path!==WORKFLOW||
   run.event!=='pull_request'||run.head_branch!==BRANCH||run.run_attempt!==attempt||
   !/^[0-9a-f]{40}$/.test(run.head_sha||''))fail('RUN_UNTRUSTED');
 if(env.SEO_EXPECTED_HEAD_SHA&&env.SEO_EXPECTED_HEAD_SHA!==run.head_sha)fail('HEAD_SHA_MISMATCH');
 let jobs=null,own=[],job_checks_attempted=0;
 for(let i=0;i<5;i++){
  jobs=await ask('/actions/runs/'+runId+'/jobs?per_page=100');
  job_checks_attempted++;
  if(!Array.isArray(jobs.jobs))fail('JOB_LIST_INVALID');
  own=jobs.jobs.filter(j=>j.name===env.GITHUB_JOB&&j.run_id===runId);
  if(own.length>1)fail('OWN_JOB_AMBIGUOUS');
  if(own.length===1&&own[0].conclusion&&own[0].conclusion!=='success')
   fail('OWN_JOB_PREVIOUS_FAILURE');
  if(own.length===1&&guardInt(own[0].id)&&
    ['in_progress','completed'].includes(own[0].status))break;
  if(i<4)await pause(250*(i+1));
 }
 if(own.length!==1||!guardInt(own[0].id)||!['in_progress','completed'].includes(own[0].status))
  fail('OWN_JOB_UNTRUSTED');
 const priorIds=new Set();
 for(const prev of previous_jobs){
  if(!Object.hasOwn(JOB_ROLE,prev.job_name)||prev.job_name===env.GITHUB_JOB||
     !guardInt(prev.github_job_id)||priorIds.has(prev.github_job_id)||prev.run_id!==runId||
     prev.run_attempt!==attempt||prev.head_sha!==run.head_sha)fail('PRIOR_BOUNDARY_MISMATCH');
  const j=jobs.jobs.filter(x=>x.id===prev.github_job_id&&x.name===prev.job_name&&x.run_id===runId);
  if(j.length!==1||j[0].status!=='completed'||j[0].conclusion!=='success')fail('PRIOR_JOB_NOT_VERIFIED_SUCCESS');
  priorIds.add(prev.github_job_id);
 }
 if(priorIds.has(own[0].id))fail('JOB_NOT_ISOLATED');
 const role=JOB_ROLE[env.GITHUB_JOB];
 return {schema_version:'0.1.0',status:'SEPARATE_GITHUB_JOB_PROVIDER_VERIFIED',
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0',
  repository:REPO,workflow:WORKFLOW,branch:BRANCH,head_sha:run.head_sha,
  run_id:runId,run_attempt:attempt,job_name:env.GITHUB_JOB,
  github_job_id:own[0].id,job_checks_attempted,role_id:role.role_id,role_scope:role.scope,
  verified_previous_job_count:priorIds.size,
  provider_authenticated_api_read:true,job_isolation_by_github_job_id:true,
  own_token_valid_for_provider_read:true,token_value_saved:false,
  token_permissions_provider_attested:false,independent_agent_iam_credentials_verified:false,
  github_oidc_verified:false,web_staging_write_authorized:false,prod_write_authorized:false,
  additional_subscription_eur:0};
}
