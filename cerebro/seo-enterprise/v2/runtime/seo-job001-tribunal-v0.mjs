/** Third OS process, tribunal. Source is verified by QA in another process.
 * No autonomous permissions or awards. This is not an IAM-authenticated judge.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {enforceSeoRoleIfRequested} from './seo-role-access-gate-v0.mjs';
import {sealProcessReceipt,verifyProcessReceipt} from './seo-process-signature-v0.mjs';
export function tribunalReview({worker_receipt,independent_review,judge_role_id='SEO_JUDGE_A'}){
 const b=JSON.parse(fs.readFileSync(new URL('../seo-role-workunit-bindings-v0.json',import.meta.url),'utf8'));
 const j=b.roles.find(x=>x.role_id===judge_role_id&&x.role_type==='JUDGE');
 if(!j||!j.scope.includes('mission:verdict:read'))throw Error('JUDGE_ROLE_SCOPE_DENIED');
 const w=worker_receipt,q=independent_review;
 if(!w||!q||q.role_id===judge_role_id||q.role_id===w.worker_role_id||judge_role_id===w.worker_role_id)
  throw Error('TRIBUNAL_INDEPENDENCE_DENIED');
 if(!Number.isInteger(w.worker_process_pid)||!Number.isInteger(q.reviewer_process_pid)||
  new Set([w.worker_process_pid,q.reviewer_process_pid,process.pid]).size!==3)
  throw Error('THREE_DISTINCT_OS_PROCESSES_REQUIRED');
 if(q.status!=='INDEPENDENT_QA_PROCESS_VERIFIED_READONLY'||!q.document_verified||!q.journal_integrity_verified||
    !q.separate_os_processes_checked||q.job_id!==w.job_id||q.source_html_sha256!==w.source_html_sha256||
    q.worker_process_pid!==w.worker_process_pid||q.observations_count!==w.findings_count||
    q.risk_flags_count!==w.risk_count)throw Error('QA_EVIDENCE_MISMATCH');
 if(w.run_state!=='SUCCEEDED'||w.ready!==false||w.prod_authorized!==false||
    q.identity_cryptographically_attested!==false)throw Error('WORKER_RELEASE_POLICY_DENIED');
 verifyProcessReceipt({receipt:w,expected_role:'SEO_D15_WORKER'});
 verifyProcessReceipt({receipt:q,expected_role:'SEO_D31_QA'});
 const decision=q.review_status==='EVIDENCE_MATCHED'?'LAB_EVIDENCE_ACCEPTED_NO_RELEASE':'HUMAN_REQUIRED_NO_RELEASE';
 return sealProcessReceipt({role_id:judge_role_id,receipt:{schema_version:'0.1.0',company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0',
  job_id:w.job_id,worker_role_id:w.worker_role_id||'SEO_D15_WORKER',qa_role_id:q.role_id,judge_role_id,
  judge_process_pid:process.pid,physical_process_separation_verified:true,
  status:decision,verified_source_sha256:w.source_html_sha256,three_level_independence_logical:true,
  all_roles_iam_authenticated:false,
  merit_scorecards_required_for_all_roles:true,merit_awards_applied:0,merit_candidates:[],
  judge_review_requires_independent_meta_evaluation:true,
  training_and_replacement_physically_verified:false,backup_website_verified:false,rollback_website_verified:false,
  website_publication_allowed:false,canary_prod_authorized:false,
  ready:false,prod_authorized:false,external_writes:0,additional_eur:0}});
}
async function main(){
 enforceSeoRoleIfRequested({role_id:'SEO_JUDGE_A',scope:'mission:verdict:read'});
 const [receiptFile,reviewFile,verdictFile]=process.argv.slice(2);
 if(![receiptFile,reviewFile,verdictFile].every(Boolean))throw Error('ARGS_REQUIRED');
 const result=tribunalReview({worker_receipt:JSON.parse(fs.readFileSync(receiptFile,'utf8')),
  independent_review:JSON.parse(fs.readFileSync(reviewFile,'utf8'))});
 fs.writeFileSync(verdictFile,JSON.stringify(result,null,2)+'\n','utf8');
 process.stdout.write(JSON.stringify(result)+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{process.stderr.write(JSON.stringify({status:'BLOCKED',reason:String(e.message).slice(0,100),external_writes:0})+'\n');process.exitCode=2;});
