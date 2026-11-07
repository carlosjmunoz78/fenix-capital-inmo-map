/** Separate QA OS process: compares independent full source inspection with JOB-001 journal.
 * Does not authenticate a CEREBRO agent. No publishing or external writes.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {enforceSeoRoleIfRequested} from './seo-role-access-gate-v0.mjs';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
import {runStagingReadonlyMission} from './staging-transversal-readonly-v0.mjs';
import {sealProcessReceipt,verifyProcessReceipt} from './seo-process-signature-v0.mjs';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const CTX={company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0'};
const registry=()=>JSON.parse(fs.readFileSync(new URL('../seo-role-workunit-bindings-v0.json',import.meta.url),'utf8'));
export function independentlyReviewJob({html,headers='',status=200,journal_path,worker_receipt,reviewer_role_id='SEO_D31_QA'}){
 const bindings=registry();
 if(bindings.environment!=='PREPROD'||bindings.governance.prod_writes||bindings.governance.agent_self_certification!==false)throw Error('ROLE_POLICY_INVALID');
 if(!bindings.roles.some(x=>x.role_id===reviewer_role_id&&x.role_type==='QA_AGENT'))throw Error('QA_ROLE_UNBOUND');
 if(typeof worker_receipt!=='object'||!worker_receipt||!Number.isInteger(worker_receipt.worker_process_pid))
   throw Error('WORKER_RECEIPT_REQUIRED');
 if(worker_receipt.worker_process_pid===process.pid)throw Error('INDEPENDENT_PROCESS_REQUIRED');
 if(worker_receipt.role_identity_verified!==false||worker_receipt.prod_authorized!==false)throw Error('WORKER_SCOPE_INVALID');
 const journal=new DurableJobRuntimeV1({file_path:journal_path});
 const entries=journal.listForContext(CTX).filter(x=>x.job_id===worker_receipt.job_id);
 if(entries.length!==1||entries[0].status!=='SUCCEEDED')throw Error('JOB001_COMPLETED_JOB_NOT_FOUND');
 const job=entries[0];
 if(job.worker_id!==null||job.result.role_ids.includes(reviewer_role_id)===false)throw Error('JOB001_ROLE_CHAIN_INVALID');
 if(job.result.role_ids[0]===reviewer_role_id)throw Error('SELF_QA_DENIED');
 const source_hash=sha(html);
 const replay=runStagingReadonlyMission({html,headers,status});
 const expected=sha(JSON.stringify(replay));
 if(source_hash!==job.payload.source_html_sha256||source_hash!==worker_receipt.source_html_sha256)throw Error('SOURCE_HASH_MISMATCH');
 if(expected!==job.result.evidence_hash||worker_receipt.findings_count!==replay.editorial.findings.length ||
  worker_receipt.risk_count!==replay.editorial.risk_flags.length)throw Error('EVIDENCE_MISMATCH');
 if(sha(fs.readFileSync(journal_path))!==worker_receipt.job001_journal_sha256)throw Error('JOURNAL_MUTATED_AFTER_WORKER');
 verifyProcessReceipt({receipt:worker_receipt,expected_role:'SEO_D15_WORKER'});
 const reviewer=bindings.roles.find(x=>x.role_id===reviewer_role_id);
 if(!reviewer.scope.includes('mission:evaluate'))throw Error('QA_SCOPE_DENIED');
 return sealProcessReceipt({role_id:reviewer_role_id,receipt:{status:'INDEPENDENT_QA_PROCESS_VERIFIED_READONLY',job_id:job.job_id,company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',version:'0.1.0',role_id:reviewer_role_id,worker_role_id:job.result.role_ids[0],
  worker_process_pid:worker_receipt.worker_process_pid,reviewer_process_pid:process.pid,
  separate_os_processes_checked:true,source_html_sha256:source_hash,evidence_hash:expected,
  document_verified:true,journal_integrity_verified:true,
  observations_count:replay.editorial.findings.length,risk_flags_count:replay.editorial.risk_flags.length,
  content_published:false,identity_cryptographically_attested:false,
  review_status:replay.editorial.risk_flags.length?'RISK_REQUIRES_HUMAN':'EVIDENCE_MATCHED',
  ready:false,prod_authorized:false,external_writes:0,cost_added_eur:0}});
}
async function main(){
 enforceSeoRoleIfRequested({role_id:'SEO_D31_QA',scope:'mission:evaluate'});
 const [htmlFile,headersFile,statusRaw,journalFile,workerReceiptFile,reviewFile]=process.argv.slice(2);
 if(![htmlFile,headersFile,statusRaw,journalFile,workerReceiptFile,reviewFile].every(Boolean))throw Error('ARGS_REQUIRED');
 const review=independentlyReviewJob({html:fs.readFileSync(htmlFile,'utf8'),headers:fs.readFileSync(headersFile,'utf8'),
  status:Number(statusRaw),journal_path:journalFile,worker_receipt:JSON.parse(fs.readFileSync(workerReceiptFile,'utf8'))});
 fs.writeFileSync(reviewFile,JSON.stringify(review,null,2)+'\n','utf8');
 process.stdout.write(JSON.stringify(review)+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{process.stderr.write(JSON.stringify({status:'BLOCKED',reason:String(e.message).slice(0,80),external_writes:0})+'\n');process.exitCode=2;});
