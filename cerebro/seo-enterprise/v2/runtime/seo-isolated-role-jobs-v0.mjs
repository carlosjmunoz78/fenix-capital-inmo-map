/** Three distinct Github-hosted jobs with provider-checked job identities and signed receipts.
 * SYNTHETIC LAB FIXTURE ONLY; no web, GSC, WordPress, CRM, or customer data.
 * Does NOT create independent CEREBRO IAM accounts or provider-signed role claims.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
import {runSeoEditorialMission} from './seo-workforce-lab-v0.mjs';
import {sealProcessReceipt,verifyProcessReceipt} from './seo-process-signature-v0.mjs';
import {verifyIsolatedWorkload,JOB_ROLE} from './seo-isolated-workload-v0.mjs';
const CONTEXT=Object.freeze({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0'});
const FIXTURE='Simulación hipotecaria de Córdoba. La furura cuota y la constucción de una vivienda son ejemplos sintéticos.';
const SOURCE='https://example.invalid/seo-v2-lab-fixture';
const sha=s=>createHash('sha256').update(s).digest('hex');
const check=(test,reason)=>{if(!test)throw Error('SEO_ISOLATED_'+reason)};
const expectedJobs=['seo-worker-isolated','seo-qa-isolated','seo-tribunal-isolated'];
const actorIds=['SEO_D15_WORKER','SEO_D31_QA','SEO_JUDGE_A'];
function checkAttestation(a,role){
 check(a?.status==='SEPARATE_GITHUB_JOB_PROVIDER_VERIFIED','WORKLOAD_UNVERIFIED');
 check(JOB_ROLE[a.job_name]?.role_id===role&&a.role_id===role&&a.role_scope===JOB_ROLE[a.job_name].scope,'ROLE_SCOPE');
 check(a.company_id===CONTEXT.company_id&&a.engine_id===CONTEXT.engine_id&&
  a.environment===CONTEXT.environment&&a.version===CONTEXT.version,'TENANT');
 check(a.workflow==='.github/workflows/cerebro-seo-staging-readonly-v0.yml'&&
  a.provider_authenticated_api_read===true&&a.job_isolation_by_github_job_id===true,'PROVIDER_CHECK');
 check(a.prod_write_authorized===false&&a.web_staging_write_authorized===false&&
  a.independent_agent_iam_credentials_verified===false,'GATE');
 check(Number.isSafeInteger(a.github_job_id)&&a.github_job_id>0&&
  Number.isSafeInteger(a.run_id)&&a.run_id>0,'JOB_ID');
 return true;
}
function mission(){
 return runSeoEditorialMission({mission_id:'SEO_V2_ISOLATED_FIXTURE_V0',
  company_id:'fenix',environment:'LAB',version:'0_1_0',
  author_actor_id:actorIds[0],reviewer_actor_id:actorIds[1],judge_actor_id:actorIds[2],
  text:FIXTURE,sources:[SOURCE],budget_eur:0,allow_writes:false,allow_paid_ai:false});
}
export function isolatedWorker({workload,journal_path,now_ms=1771000000000}){
 checkAttestation(workload,actorIds[0]);
 const res=mission(),digest=res.evidence.source_sha256;
 const rt=new DurableJobRuntimeV1({file_path:journal_path,environment:'PREPROD'});
 const idempotency='seo-isolated-fixture-'+sha(digest);
 const enqueued=rt.enqueue({name:'SEO_ISOLATED_SYNTHETIC_FIXTURE',context:CONTEXT,
  idempotency_key:idempotency,max_attempts:1,timeout_ms:10000,now_ms,
  payload:{synthetic_fixture:true,source_ref:'LAB_FIXTURE_NOT_A_REAL_WEBSITE',source_sha256:digest}});
 check(enqueued.accepted||enqueued.duplicate,'ENQUEUE');
 if(enqueued.accepted){
  const claimed=rt.claim({context:CONTEXT,worker_id:actorIds[0],now_ms,lease_ms:60000});
  check(claimed?.job_id===enqueued.job.job_id,'JOB_CLAIM');
  rt.checkpoint({job_id:claimed.job_id,worker_id:actorIds[0],now_ms,
   checkpoint:{fixture_sha256:digest,readonly:true}});
  rt.complete({job_id:claimed.job_id,worker_id:actorIds[0],now_ms,
   result:{observations_count:res.evidence.observations.length,
    risk_count:res.evidence.risk_flags.length,source_sha256:digest,
    evidence_sha256:sha(JSON.stringify(res.evidence)),prod_authorized:false}});
 }
 const reopened=new DurableJobRuntimeV1({file_path:journal_path});
 const record=reopened.get(enqueued.job.job_id);
 check(record?.status==='SUCCEEDED'&&record.payload.synthetic_fixture===true,'DURABLE_REPLAY');
 const journal_sha256=sha(fs.readFileSync(journal_path));
 return sealProcessReceipt({role_id:actorIds[0],receipt:{
  schema_version:'0.1.0',company_id:'fenix',environment:'PREPROD',engine_id:'SEO-001',version:'0.1.0',
  worker_role_id:actorIds[0],worker_process_pid:process.pid,job_id:record.job_id,
  run_state:record.status,source_type:'SYNTHETIC_LAB_FIXTURE',source_sha256:digest,
  fixture_label:'SEO_V2_ISOLATED_LAB_SAMPLE',findings_count:res.evidence.observations.length,
  risk_count:res.evidence.risk_flags.length,evidence_sha256:record.result.evidence_sha256,
  journal_sha256,job001_reopened_verified:true,workload,
  role_identity_verified:false,prod_authorized:false,external_writes:0,added_eur:0
 }});
}
function requirePrevious(current,earlier,expectedJob){
 check(current.run_id===earlier.run_id&&current.run_attempt===earlier.run_attempt&&
  current.head_sha===earlier.head_sha&&current.github_job_id!==earlier.github_job_id,'WORKLOAD_CHAIN');
 check(earlier.job_name===expectedJob,'PREDECESSOR_ROLE');
}
export function isolatedQa({workload,worker,journal_path}){
 checkAttestation(workload,actorIds[1]);
 verifyProcessReceipt({receipt:worker,expected_role:actorIds[0]});
 checkAttestation(worker.workload,actorIds[0]);
 requirePrevious(workload,worker.workload,expectedJobs[0]);
 check(workload.verified_previous_job_count===1,'WORKER_NOT_PROVIDER_RECHECKED');
 const rt=new DurableJobRuntimeV1({file_path:journal_path,environment:'PREPROD'});
 const jobs=rt.listForContext(CONTEXT),res=mission(),digest=res.evidence.source_sha256;
 check(jobs.length===1&&jobs[0].job_id===worker.job_id&&jobs[0].status==='SUCCEEDED','JOB001_STATE');
 check(worker.source_type==='SYNTHETIC_LAB_FIXTURE'&&worker.source_sha256===digest&&
   jobs[0].result.source_sha256===digest&&jobs[0].payload.synthetic_fixture,'FIXTURE_PROVENANCE');
 check(sha(fs.readFileSync(journal_path))===worker.journal_sha256,'DURABLE_HASH');
 check(worker.evidence_sha256===sha(JSON.stringify(res.evidence))&&
  worker.findings_count===res.evidence.observations.length&&
  worker.risk_count===res.evidence.risk_flags.length,'INDEPENDENT_RECHECK');
 return sealProcessReceipt({role_id:actorIds[1],receipt:{
  schema_version:'0.1.0',company_id:'fenix',environment:'PREPROD',engine_id:'SEO-001',version:'0.1.0',
  role_id:actorIds[1],worker_role_id:actorIds[0],worker_process_pid:worker.worker_process_pid,
  reviewer_process_pid:process.pid,worker_job_id:worker.workload.github_job_id,
  job_id:worker.job_id,source_sha256:digest,
  worker_receipt_sha256:sha(JSON.stringify(worker)),source_type:'SYNTHETIC_LAB_FIXTURE',
  verified_observations_count:res.evidence.observations.length,
  independent_fixture_recomputed:true,durable_journal_verified:true,workload,
  role_identity_verified:false,prod_authorized:false,external_writes:0,added_eur:0
 }});
}
export function isolatedTribunal({workload,worker,review}){
 checkAttestation(workload,actorIds[2]);
 verifyProcessReceipt({receipt:worker,expected_role:actorIds[0]});
 verifyProcessReceipt({receipt:review,expected_role:actorIds[1]});
 checkAttestation(worker.workload,actorIds[0]);
 checkAttestation(review.workload,actorIds[1]);
 requirePrevious(workload,worker.workload,expectedJobs[0]);
 requirePrevious(workload,review.workload,expectedJobs[1]);
 requirePrevious(review.workload,worker.workload,expectedJobs[0]);
 check(workload.verified_previous_job_count===2&&review.workload.verified_previous_job_count===1,'PROVIDER_CHAIN');
 check(new Set([worker.workload.github_job_id,review.workload.github_job_id,workload.github_job_id]).size===3,'JOBS_NOT_DISTINCT');
 check(review.worker_receipt_sha256===sha(JSON.stringify(worker))&&
  review.worker_job_id===worker.workload.github_job_id&&
  review.job_id===worker.job_id&&
  review.source_sha256===worker.source_sha256&&
  review.verified_observations_count===worker.findings_count&&
  review.independent_fixture_recomputed===true,'QA_INTEGRITY');
 check(worker.prod_authorized===false&&review.prod_authorized===false,'PROD_GATE');
 return sealProcessReceipt({role_id:actorIds[2],receipt:{
  schema_version:'0.1.0',company_id:'fenix',environment:'PREPROD',engine_id:'SEO-001',version:'0.1.0',
  judge_role_id:actorIds[2],judge_process_pid:process.pid,worker_role_id:actorIds[0],
  qa_role_id:actorIds[1],job_id:worker.job_id,
  status:'THREE_GITHUB_JOBS_DISTINCT_VERIFIED_LAB_NO_RELEASE',
  source_type:'SYNTHETIC_LAB_FIXTURE',
  distinct_github_job_ids:[worker.workload.github_job_id,review.workload.github_job_id,workload.github_job_id],
  distinct_job_identifiers_verified:true,
  predecessor_status_verified_by_github_provider:true,
  signed_worker_receipt_verified:true,signed_qa_receipt_verified:true,
  workload,per_actor_cerebro_iam_verified:false,
  actual_website_audited_in_this_workflow:false,
  website_publishing_authorized:false,
  award_granted:false,prod_authorized:false,external_writes:0,added_eur:0
 }});
}
async function main(){
 const [stage,...params]=process.argv.slice(2);
 check(['worker','qa','tribunal'].includes(stage),'STAGE_INVALID');
 const inputs=stage==='worker'?[]:stage==='qa'?[params[0]]:[params[0],params[1]];
 const from=p=>JSON.parse(fs.readFileSync(path.resolve(p),'utf8'));
 const predecessors=inputs.map(from);
 const workload=await verifyIsolatedWorkload({env:process.env,token:process.env.GH_READONLY_TOKEN,
  previous_jobs:predecessors.map(x=>x.workload)});
 let result,output;
 if(stage==='worker'){
  check(params.length===1,'WORKER_ARGS');
  output=params[0];fs.mkdirSync(output,{recursive:true});
  result=isolatedWorker({workload,journal_path:path.join(output,'job001.v8')});
  fs.writeFileSync(path.join(output,'worker.json'),JSON.stringify(result,null,2)+'\n');
 }else if(stage==='qa'){
  check(params.length===3,'QA_ARGS');
  output=params[2];fs.mkdirSync(output,{recursive:true});
  const jobpath=path.join(params[1],'job001.v8');
  const worker=from(params[0]);
  result=isolatedQa({workload,worker,journal_path:jobpath});
  fs.writeFileSync(path.join(output,'review.json'),JSON.stringify(result,null,2)+'\n');
 }else{
  check(params.length===3,'TRIBUNAL_ARGS');
  output=params[2];fs.mkdirSync(output,{recursive:true});
  const worker=from(params[0]);
  const review=from(params[1]);
  result=isolatedTribunal({workload,worker,review});
  fs.writeFileSync(path.join(output,'tribunal.json'),JSON.stringify(result,null,2)+'\n');
 }
 process.stdout.write(JSON.stringify({stage,status:stage==='tribunal'?result.status:'ISOLATED_STAGE_VERIFIED',
  github_job_id:workload.github_job_id,previous_jobs_checked:workload.verified_previous_job_count,
  synthetic_fixture_only:true,website_publishing_authorized:false,role_iam_verified:false,external_writes:0})+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{process.stderr.write(JSON.stringify({status:'BLOCKED',reason:String(e.message).slice(0,110),
  external_writes:0})+'\n');process.exitCode=2;});
