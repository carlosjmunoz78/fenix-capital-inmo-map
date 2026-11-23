/**
 * Read-only GitHub Actions first-party provider attestation for ONE LAB capability.
 * The GitHub API response must be fetched by a server-only, fixed-origin adapter.
 * A successful CI job demonstrates the ENG-QA QA-001 capability executed tests;
 * it does NOT prove a standalone autonomous agent exists or passes tribunal gates.
 */
export const GITHUB_PROVIDER_ATTESTED_V1=Symbol('CEREBRO_GITHUB_VERIFIED_REAL_WORKFLOW_V1');
export const GITHUB_QA_WORKFLOW_ID=422902482;
export const GITHUB_QA_HEAD='cerebro/operativa-live-evidence-bridge-lab-20261118';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const PATH='.github/workflows/cerebro-operativa-evidence-bridge-lab.yml';
const SHA=/^[a-f0-9]{40}$/;
const at=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):NaN;
const success=s=>s?.status==='completed'&&s?.conclusion==='success';
export function attestGithubQaRunV1({run,jobs,now}={}){
 const clock=at(now);
 if(!Number.isFinite(clock)||!run||!Array.isArray(jobs)||jobs.length>100||
  !Number.isSafeInteger(run.id)||run.id<=0||run.workflow_id!==GITHUB_QA_WORKFLOW_ID||
  run.name!=='CEREBRO Operativa verified evidence bridge LAB'||
  run.head_branch!==GITHUB_QA_HEAD||run.event!=='pull_request'||
  !(run.path===PATH||String(run.path||'').startsWith(PATH+'@'))||
  run.head_repository?.full_name!==REPO||!SHA.test(run.head_sha||'')||
  !success(run)||!String(run.html_url||'').startsWith('https://github.com/'+REPO+'/actions/runs/'+run.id)||
  !Number.isFinite(at(run.updated_at))||at(run.updated_at)>clock+60000||
  at(run.updated_at)<clock-86400000)return null;
 const proof=jobs.find(j=>j?.name==='evidence-bridge'&&success(j)&&Number.isSafeInteger(j.id)&&j.id>0);
 if(!proof||!Array.isArray(proof.steps))return null;
 const mandatory=[
  'Run node --experimental-strip-types --test cerebro/universal/v0/agent-evidence-bridge-v1.test.mjs',
  'Run npm run build'
 ];
 if(mandatory.some(prefix=>!proof.steps.some(s=>String(s.name||'').startsWith(prefix)&&
    s.status==='completed'&&s.conclusion==='success')))return null;
 const timestamp=proof.completed_at;
 if(!Number.isFinite(at(timestamp))||at(timestamp)>clock+60000||
    at(timestamp)<clock-86400000)return null;
 const receipt={
  receipt_id:'gh-run-'+run.id+'-job-'+proof.id,
  source:'GITHUB_ACTIONS',company_id:'fenix',environment:'LAB',
  engine_id:'QA-001',executor_id:'github-actions/evidence-bridge',
  job_id:'gh-job-'+proof.id,agent_role_id:'ENG-QA',subagent_role_id:null,
  event:'SUCCEEDED',emitted_at:timestamp,version:run.head_sha.slice(0,12),
  server_collector_verified:true,integrity:'VERIFIED_BY_SOURCE_ADAPTER',
  provenance:'GITHUB_ACTIONS_FIRST_PARTY_API_JOB_AND_REQUIRED_STEPS',
  autonomy_claim:false,quality_gate_claim:false,run_id:run.id,
  run_url:run.html_url
 };
 return Object.defineProperty(receipt,GITHUB_PROVIDER_ATTESTED_V1,
  {value:true,enumerable:false,writable:false});
}
