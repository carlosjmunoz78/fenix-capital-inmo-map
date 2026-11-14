/** SEO V2: read-only physical JOB-001 work unit. Reuses the existing durable journal. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {enforceSeoRoleIfRequested} from './seo-role-access-gate-v0.mjs';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
import {Job001LedgerControlPlaneV1} from '../../../runtime/job001-ledger-control-plane-v1.mjs';
import {runStagingReadonlyMission} from './staging-transversal-readonly-v0.mjs';
import {sealProcessReceipt} from './seo-process-signature-v0.mjs';

const CTX=Object.freeze({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0'});
const WORKER='SEO_D15_WORKER';
const hashlib=x=>crypto.createHash('sha256').update(x).digest('hex');
export function executeSeoJob001Staging({html,headers='',status=200,journal_path,now_ms=Date.now()}={}){
 if(typeof journal_path!=='string'||!journal_path.trim())throw Error('JOURNAL_PATH_REQUIRED');
 if(!Number.isSafeInteger(now_ms)||now_ms<1)throw Error('CLOCK_INVALID');
 // The input itself remains ephemeral, only a fingerprint and audit receipts go to JOB-001.
 const dryRun=runStagingReadonlyMission({html,headers,status});
 const source_hash=hashlib(html);
 const runtime=new DurableJobRuntimeV1({file_path:journal_path,environment:'PREPROD'});
 const idempotency_key='seo-staging-readonly-v0:'+source_hash;
 const enq=runtime.enqueue({name:'SEO_STAGING_PUBLIC_READONLY_AUDIT_V0',context:CTX,
  payload:{source_url:'https://staging.fenixcapital.es/',source_html_sha256:source_hash,source_provenance:'PUBLIC_HTTP_GET',no_customer_data_expected:true},
  idempotency_key,priority:80,max_attempts:1,timeout_ms:10000,now_ms});
 let completed=null;
 if(enq.accepted){
  const claimed=runtime.claim({context:CTX,worker_id:WORKER,now_ms,lease_ms:60000});
  if(!claimed||claimed.job_id!==enq.job.job_id)throw Error('JOB001_CLAIM_MISMATCH');
  runtime.checkpoint({job_id:claimed.job_id,worker_id:WORKER,now_ms,
    checkpoint:{stage:'PUBLIC_READONLY_WORK_DONE',source_html_sha256:source_hash,ready:false}});
  const result={status:'WORK_EXECUTED_QA_LOGICAL_ONLY',source_html_sha256:source_hash,
   departments_exercised:dryRun.departments_exercised,
   technical_gate:dryRun.technical.staging_readonly_probe_passed,
   findings_count:dryRun.editorial.findings.length,risk_count:dryRun.editorial.risk_flags.length,
   logical_verdict:dryRun.editorial.verdict.decision,
   evidence_hash:hashlib(JSON.stringify(dryRun)),role_ids:[WORKER,'SEO_D31_QA','SEO_JUDGE_A'],
   role_identity_verified:false,real_independent_qa_verified:false,
   external_writes:0,prod_authorized:false};
  completed=runtime.complete({job_id:claimed.job_id,worker_id:WORKER,result,now_ms});
 }else{
  completed=runtime.get(enq.job.job_id);
  if(completed?.status!=='SUCCEEDED'||completed.result?.source_html_sha256!==source_hash)throw Error('JOB001_DUPLICATE_NOT_COMPLETED');
 }
 const reload=new DurableJobRuntimeV1({file_path:journal_path,environment:'PREPROD'});
 const recovered=reload.get(enq.job.job_id);
 if(!recovered||recovered.status!=='SUCCEEDED'||recovered.result.evidence_hash!==completed.result.evidence_hash)
  throw Error('JOB001_REPLAY_INTEGRITY_FAILED');
 const ledger=new Job001LedgerControlPlaneV1({job_runtime:reload,contexts:[CTX]});
 const summary=ledger.inspect({actor:{scopes:['cerebro:ledger:read']},context:CTX});
 return sealProcessReceipt({role_id:WORKER,receipt:{
  schema_version:'0.1.0',state:'PHYSICAL_PREPROD_JOB001_LAB_WORK_UNIT_NOT_SEO_DEPARTMENT_READY',
  context:CTX,job_id:completed.job_id,worker_role_id:WORKER,run_state:completed.status,
  idempotency_key_sha256:hashlib(idempotency_key),duplicate:!enq.accepted,
  source_html_sha256:source_hash,source_url:'https://staging.fenixcapital.es/',
  findings_count:completed.result.findings_count,risk_count:completed.result.risk_count,
  departments_exercised:completed.result.departments_exercised,
  logical_verdict:completed.result.logical_verdict,
  ledger_done:summary.totals.done,ledger_total:summary.totals.total,
  recovery_reopened_verified:true,
  job001_journal_sha256:hashlib(fs.readFileSync(journal_path)),
  worker_process_pid:process.pid,
  roles_declared_not_authenticated:true,role_identity_verified:false,independent_process_qa_verified:false,
  site_backup_verified:false,site_rollback_verified:false,
  no_customer_data_guarantee:false, // public snapshot is expected, not fully audited for sensitive payloads
  ready:false,prod_authorized:false,web_write_authorized:false,
  external_writes:0,additional_cost_eur:0
 }});
}
async function main(){
 enforceSeoRoleIfRequested({role_id:WORKER,scope:'mission:execute'});
 const [htmlFile,headersFile,httpStatus,journalFile,receiptFile]=process.argv.slice(2);
 if(![htmlFile,headersFile,httpStatus,journalFile].every(Boolean))throw Error('USAGE_ARGS_MISSING');
 const r=executeSeoJob001Staging({html:fs.readFileSync(htmlFile,'utf8'),
  headers:fs.readFileSync(headersFile,'utf8'),status:Number(httpStatus),journal_path:journalFile});
 const serialized=JSON.stringify(r,null,2)+'\n';
 if(receiptFile){fs.mkdirSync(path.dirname(path.resolve(receiptFile)),{recursive:true});fs.writeFileSync(receiptFile,serialized,'utf8');}
 process.stdout.write(serialized);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{process.stderr.write(JSON.stringify({status:'BLOCKED',error:String(e.message).slice(0,100),external_writes:0})+'\n');process.exitCode=2;});
