import {githubActionsReader} from './github-actions-reader.mjs';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const WORKFLOW_PATH='.github/workflows/cerebro-rsi-learning-control-plane-v0.yml';
const STATE_BRANCH='cerebro-rsi-learning-state-v0';
const SUMMARY_PATH='cerebro/runtime/rsi-learning-state/last-control-plane-run.json';
const SCOPE={company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.6.0'};
const runId=Number(process.env.GITHUB_RUN_ID),attempt=Number(process.env.GITHUB_RUN_ATTEMPT);
if(process.env.GITHUB_REPOSITORY!==REPO||process.env.GITHUB_REF!=='refs/heads/main'||
  !['schedule','workflow_run','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)||
  !Number.isSafeInteger(runId)||runId<1||!Number.isSafeInteger(attempt)||attempt<1||
  !process.env.GITHUB_TOKEN_LRN_LAB)throw Error('TRUSTED_GITHUB_CONTEXT_REQUIRED');
const github=githubActionsReader(async fn=>fn(process.env.GITHUB_TOKEN_LRN_LAB));
const [workflow,run,jobs]=await Promise.all([
  github.workflow(REPO,403468557),github.attempt(REPO,runId,attempt),github.jobs(REPO,runId,attempt)
]);
if(workflow.id!==403468557||workflow.path!==WORKFLOW_PATH||run.id!==runId||
  run.workflow_id!==403468557||run.path!==WORKFLOW_PATH||
  run.repository!==REPO||run.head_repository!==REPO||run.head_branch!=='main'||
  run.head_sha!==process.env.GITHUB_SHA||run.run_attempt!==attempt||
  run.event!==process.env.GITHUB_EVENT_NAME||!['queued','in_progress','completed'].includes(run.status)||
  (run.status==='completed'&&run.conclusion!=='success'))
  throw Error('GH_RUN_IDENTITY_INVALID');
const publishers=jobs.filter(x=>x.name==='run-preprod-control-plane');
if(publishers.length!==1)throw Error('PUBLISHER_AMBIGUOUS');
const job=publishers[0];
if(job.status!=='completed'||job.conclusion!=='success'||job.run_id!==runId||
  job.run_attempt!==attempt||job.head_sha!==run.head_sha)throw Error('PUBLISHER_NOT_SUCCESS');
const lines=await github.log(REPO,job.id);
const created=lines.map(x=>x.match(/\[detached HEAD ([a-f0-9]{8,40})\]/)?.[1]).filter(Boolean);
const pushed=lines.map(x=>x.match(/\b[a-f0-9]{8,40}\.\.([a-f0-9]{8,40})\s+HEAD -> cerebro-rsi-learning-state-v0$/)?.[1]).filter(Boolean);
if(!pushed.length&&!created.length) {
  if(!lines.some(x=>x.includes('No LRN state delta; idempotent no-op.')))throw Error('PUBLISHER_NO_RECEIPT_UNEXPLAINED');
  console.log(JSON.stringify({status:'SKIPPED_NO_DURABLE_DELTA',runId,attempt,backendWrites:0}));
  process.exit(0);
}
if(created.length!==1||pushed.length!==1||!created[0].startsWith(pushed[0])&&!pushed[0].startsWith(created[0]))
  throw Error('PUBLISHER_COMMIT_AMBIGUOUS');
const commit=await github.resolveCommit(REPO,pushed[0]);
if(!/^[a-f0-9]{40}$/.test(commit)||!commit.startsWith(created[0]))throw Error('DURABLE_COMMIT_INVALID');
const head=await github.head(REPO,STATE_BRANCH);
if(!await github.isAncestor(REPO,commit,head))throw Error('DURABLE_BRANCH_MISMATCH');
const file=await github.file(REPO,commit,SUMMARY_PATH);
const blobHead=new TextEncoder().encode('blob '+file.bytes.length+'\0');
const full=new Uint8Array(blobHead.length+file.bytes.length);full.set(blobHead);full.set(file.bytes,blobHead.length);
const digest=await crypto.subtle.digest('SHA-1',full);
const blobSha=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
if(blobSha!==file.sha)throw Error('DURABLE_BLOB_SHA');
const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',file.bytes)),x=>x.toString(16).padStart(2,'0')).join('');
const summary=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(file.bytes));
const cp=summary.control_plane||{};
if(summary.status!=='GREEN'||cp.company_id!==SCOPE.company_id||
  cp.engine_id!==SCOPE.engine_id||cp.environment!==SCOPE.environment||
  cp.version!==SCOPE.version||cp.github_run_id!==String(runId)||
  cp.source_head_sha!==run.head_sha||cp.prod_authorized!==false||
  cp.prod_write_authorized!==false||cp.trading_access!==false||cp.additional_cost_eur!==0)
  throw Error('DURABLE_POLICY_DENIED');
const daily=(summary.horizons?.completed||[]).filter(x=>x.cadence==='DAILY'&&x.task==='LEARNING_METRICS_AND_FAILURE_SCAN');
if(daily.length>1||daily.some(x=>typeof x.lock_key!=='string'||!/^[a-f0-9]{64}$/.test(x.lock_key)))
  throw Error('DAILY_RESULT_CONFLICT');
const manifest={
  schema:'zeus-lrn-publication-auto/v1',repository:REPO,workflow_id:403468557,
  source_branch:STATE_BRANCH,scope:SCOPE,run_id:runId,run_attempt:attempt,
  publisher_job_id:job.id,source_head_sha:run.head_sha,state_commit:commit,
  event:run.event,execution_state:'PUBLISHER_JOB_SUCCESS',
  health_state:'GREEN_AT_OBSERVATION',autonomy_state:'PREPROD_POLICY_ONLY',
  promotion_allowed:false,additional_cost_eur:0,
  summary:{path:SUMMARY_PATH,git_blob:file.sha,sha256},
  daily_result:daily.length?{status:'ELIGIBLE',lock_key:daily[0].lock_key}:{status:'NO_DAILY_RESULT'}
};
const issuerUrl=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL||'');
issuerUrl.searchParams.set('audience','cerebro-zeus-lrn-auto-lab');
const issued=await fetch(issuerUrl,{redirect:'manual',headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},signal:AbortSignal.timeout(10000)});
if(!issued.ok)throw Error('OIDC_ISSUE_'+issued.status);
const jwt=(await issued.json()).value;
if(typeof jwt!=='string'||jwt.split('.').length!==3)throw Error('OIDC_FORMAT');
const target='https://cerebro-zeus-lrn-auto-lab.carlosj-munozcabeza.workers.dev/v1/publication';
const received=await fetch(target,{method:'POST',redirect:'manual',headers:{Authorization:'Bearer '+jwt,'Content-Type':'application/json'},body:JSON.stringify(manifest),signal:AbortSignal.timeout(15000)});
const data=await received.json().catch(()=>({}));
if(received.status!==200||data.ok!==true||data.run_id!==runId||data.run_attempt!==attempt||
  ![0,1].includes(data.new_writes))throw Error('ZEUS_RECEIPT_'+received.status+'_'+String(data.reason||'UNKNOWN'));
console.log(JSON.stringify({status:'RECORDED_AUTO',runId,attempt,jobId:job.id,
  commit,classification:manifest.daily_result.status,new_writes:data.new_writes,
  recovery:'D1',promotion_allowed:false,additional_cost_eur:0}));
