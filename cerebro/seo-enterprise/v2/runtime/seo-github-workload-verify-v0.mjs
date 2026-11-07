/** Read-only GH Actions runtime provenance check. NOT per-agent identity, OIDC, or token-scope proof.
 * Authenticates a GitHub API request using existing GITHUB_TOKEN (contents:read workflow).
 * Never logs/stores the bearer token. Deny-by-default for unrecognized runs.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const WORKFLOW='.github/workflows/cerebro-seo-staging-readonly-v0.yml';
const BRANCH='cerebro/seo-enterprise-family-staging-contract-v1-20261105';
const jobName='readonly-staging';
const exactInt=(x)=>typeof x==='string'&&/^[1-9][0-9]{0,14}$/.test(x)?Number(x):NaN;
const blocked=code=>{throw Error('WORKLOAD_IDENTITY_'+code)};
export async function verifyGithubWorkload({env,token,fetchImpl=globalThis.fetch,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 if(!env||env.GITHUB_ACTIONS!=='true')blocked('NOT_ACTIONS');
 if(env.GITHUB_REPOSITORY!==REPO||env.GITHUB_EVENT_NAME!=='pull_request')blocked('REPO_EVENT');
 if(env.GITHUB_HEAD_REF!==BRANCH||env.GITHUB_JOB!==jobName)blocked('BRANCH_JOB');
 const run_id=exactInt(env.GITHUB_RUN_ID),attempt=exactInt(env.GITHUB_RUN_ATTEMPT);
 if(!Number.isSafeInteger(run_id)||!Number.isSafeInteger(attempt))blocked('RUN_INPUT');
 if(typeof token!=='string'||token.length<15)blocked('TOKEN_REQUIRED');
 const query=async url=>{
  let response;
  try{response=await fetchImpl(url,{method:'GET',redirect:'error',headers:{
   'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(8000)})}
  catch{blocked('PROVIDER_UNAVAILABLE')}
  if(!response?.ok)blocked('PROVIDER_REJECTED');
  try{return await response.json()}catch{blocked('INVALID_PROVIDER_JSON')}
 };
 const run=await query('https://api.github.com/repos/'+REPO+'/actions/runs/'+run_id);
 if(run.id!==run_id||run.path!==WORKFLOW||run.repository?.full_name!==REPO)blocked('RUN_MISMATCH');
 if(run.event!=='pull_request'||run.head_branch!==BRANCH||run.run_attempt!==attempt)blocked('RUN_CONTEXT_MISMATCH');
 if(!/^[a-f0-9]{40}$/.test(run.head_sha||''))blocked('COMMIT_MISSING');
 if(!['queued','in_progress','completed'].includes(run.status))blocked('RUN_STATUS');
 let matched=[];let job_checks_attempted=0;
 for(let i=0;i<5;i++){
  const jobs=await query('https://api.github.com/repos/'+REPO+'/actions/runs/'+run_id+'/jobs?per_page=100');
  job_checks_attempted++;
  matched=(jobs.jobs||[]).filter(j=>j.name===jobName&&j.run_id===run_id);
  if(matched.length>1)blocked('AMBIGUOUS_JOB_IDENTITY');
  if(matched.length===1&&matched[0].conclusion&&matched[0].conclusion!=='success')blocked('JOB_PREVIOUSLY_FAILED');
  if(matched.length===1&&['in_progress','completed'].includes(matched[0].status))break;
  if(i<4)await pause(250*(i+1));
 }
 if(matched.length!==1||!['in_progress','completed'].includes(matched[0].status))blocked('JOB_IDENTITY_UNVERIFIED');
 if(matched[0].conclusion&&matched[0].conclusion!=='success')blocked('JOB_PREVIOUSLY_FAILED');
 return {schema_version:'0.1.0',status:'GITHUB_API_WORKLOAD_RUN_VERIFIED_READONLY',
  provider:'github-actions',repository:REPO,workflow_path:WORKFLOW,
  event:run.event,head_branch:run.head_branch,head_sha:run.head_sha,
  run_id,run_attempt:attempt,job_name:jobName,github_job_id:matched[0].id,job_checks_attempted,
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0',
  github_token_present_and_accepted:true,provider_api_read_completed:true,
  github_job_identity_observed:true,github_oidc_jwt_validated:false,
  credential_token_scopes_independently_verified:false,actor_role_credentials_verified:false,
  independent_subagent_identity_verified:false,authenticated_roles:[],
  workflow_declares_contents_read:true,role_permissions_increased:false,prod_write_authorized:false,
  scorecard_award_authorized:false,web_write_authorized:false,additional_eur:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3)blocked('ARGS_REQUIRED');
  const r=await verifyGithubWorkload({env:process.env,token:process.env.GH_READONLY_TOKEN});
  fs.writeFileSync(process.argv[2],JSON.stringify(r,null,2)+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});
  process.stdout.write(JSON.stringify({status:r.status,run_id:r.run_id,job_id:r.github_job_id,
   oidc_validated:false,agent_iam_verified:false,prod_write_authorized:false,external_writes:0})+'\n');
 }catch(err){process.stderr.write(JSON.stringify({status:'BLOCKED',reason:err?.message||'WORKLOAD_UNKNOWN'})+'\n');process.exitCode=2;}
}
