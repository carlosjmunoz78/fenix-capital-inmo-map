import { verifyActionsPublication } from './actions-provenance.mjs';
const repo = 'carlosjmunoz78/fenix-capital-inmo-map';
const branch = 'cerebro-rsi-learning-state-v0';
const workflowId = 403468557;
const root = 'cerebro/runtime/rsi-learning-state';
const scope = Object.freeze({company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.6.0'});
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8',{fatal:true});
async function digest(algorithm,data) {
  return Array.from(new Uint8Array(await crypto.subtle.digest(algorithm,data)),b=>b.toString(16).padStart(2,'0')).join('');
}
async function attestBlob(file) {
  if(!(file.bytes instanceof Uint8Array)||file.bytes.length>262144)throw Error('INVALID_SOURCE_BYTES');
  const prefix=encoder.encode('blob '+file.bytes.length+'\0');
  const buffer=new Uint8Array(prefix.length+file.bytes.length);
  buffer.set(prefix);buffer.set(file.bytes,prefix.length);
  if(await digest('SHA-1',buffer)!==file.sha)throw Error('GIT_BLOB_MISMATCH');
  return {sha:file.sha,sha256:await digest('SHA-256',file.bytes)};
}
export async function verifyLearningPublication({github,runId,attempt,stateCommit}) {
  if(!Number.isSafeInteger(runId)||runId<=0||!Number.isSafeInteger(attempt)||attempt<=0||!/^[0-9a-f]{40}$/.test(stateCommit))throw Error('INVALID_PUBLICATION_REFERENCE');
  const [workflow,run,jobs]=await Promise.all([
    github.workflow(repo,workflowId),
    github.attempt(repo,runId,attempt),
    github.jobs(repo,runId,attempt)
  ]);
  if(run.id!==runId||run.run_attempt!==attempt)throw Error('ATTEMPT_MISMATCH');
  const publishers=jobs.filter(x=>x.name==='run-preprod-control-plane');
  if(publishers.length!==1||!Number.isSafeInteger(publishers[0].id))throw Error('PUBLISHER_AMBIGUOUS');
  const job=publishers[0];
  const [lines,head]=await Promise.all([github.log(repo,job.id),github.head(repo,branch)]);
  if(!/^[a-f0-9]{40}$/.test(head)||!await github.isAncestor(repo,stateCommit,head))throw Error('DURABLE_BRANCH_DENIED');
  const filePath=root+'/last-control-plane-run.json';
  const file=await github.file(repo,stateCommit,filePath);
  const hashes=await attestBlob(file);
  const summary=JSON.parse(decoder.decode(file.bytes));
  const provenance=verifyActionsPublication({run,workflow,job,lines,stateCommit,sourceHead:summary.control_plane?.source_head_sha,expectedJobId:job.id});
  if(await github.resolveCommit(repo,provenance.publicationPrefix)!==stateCommit)throw Error('COMMIT_RESOLUTION_DENIED');
  if(summary.control_plane?.company_id!==scope.company_id||
     summary.control_plane?.engine_id!==scope.engine_id||
     summary.control_plane?.environment!==scope.environment||
     summary.control_plane?.version!==scope.version||
     summary.control_plane?.github_run_id!==String(runId)||
     summary.control_plane?.prod_authorized!==false||
     summary.control_plane?.prod_write_authorized!==false||
     summary.control_plane?.additional_cost_eur!==0||
     summary.status!=='GREEN')throw Error('PUBLICATION_SCOPE_OR_STATUS_DENIED');
  const daily=summary.horizons?.completed?.filter(x=>x.cadence==='DAILY' && x.task==='LEARNING_METRICS_AND_FAILURE_SCAN');
  if(!Array.isArray(daily)||daily.length>1||daily.some(x=>typeof x.lock_key!=='string'||!/^[0-9a-f]{64}$/.test(x.lock_key)))throw Error('DAILY_RESULT_AMBIGUOUS');
  return {
    schema:'zeus-lrn-publication/v1',repository:repo,branch,scope,
    runId,attempt,workflowId,jobId:job.id,stateCommit,sourceHead:run.head_sha,
    event:run.event,execution_state:'COMPLETED',health_state:'GREEN_AT_OBSERVATION',
    autonomy_state:'PREPROD_POLICY_ONLY',promotion_allowed:false,additional_cost_eur:0,
    summary:{path:filePath,git_blob:hashes.sha,sha256:hashes.sha256},
    daily_result:daily.length?{status:'ELIGIBLE',lock_key:daily[0].lock_key}:{status:'NO_DAILY_RESULT'}
  };
}
