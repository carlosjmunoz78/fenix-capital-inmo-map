/** Evidence-based merit candidate, persisted through existing AtomicV8Journal, never auto-awards. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {AtomicV8Journal} from '../../../runtime/persistent-runtime.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const ALL_CLASSES=['AGENT','SUBAGENT','DIRECTOR','DEPARTMENT_HEAD','SUPERVISOR','JUDGE','TRIBUNAL','GUARDIAN','META_SUPERVISOR','QA_AGENT'];
const weights={quality:0.30,safety:0.25,reliability:0.15,utility:0.15,efficiency:0.10,learning:0.05};
export function scorecardCandidate({worker_receipt:w,independent_review:q,tribunal_result:j,subject_role_id='SEO_D15_WORKER',subject_class='SUBAGENT',file_path}){
 if(!ALL_CLASSES.includes(subject_class))throw Error('UNSUPPORTED_ROLE_CLASS');
 if(!file_path||typeof file_path!=='string')throw Error('MERIT_LEDGER_REQUIRED');
 const actorIds=[subject_role_id,q?.role_id,j?.judge_role_id];
 if(actorIds.some(x=>!x)||new Set(actorIds).size!==3)throw Error('MERIT_INDEPENDENCE_DENIED');
 if(subject_role_id!==w?.worker_role_id||subject_role_id!==q?.worker_role_id||subject_role_id!==j?.worker_role_id)
  throw Error('NO_INDEPENDENT_META_REVIEW_FOR_SUBJECT');
 if(q?.status!=='INDEPENDENT_QA_PROCESS_VERIFIED_READONLY'||
   j?.status!=='LAB_EVIDENCE_ACCEPTED_NO_RELEASE'||
   j?.job_id!==w?.job_id||q?.job_id!==w?.job_id||
   j?.physical_process_separation_verified!==true||
   q?.source_html_sha256!==w?.source_html_sha256)throw Error('VERIFIED_EVIDENCE_REQUIRED');
 if(w.prod_authorized!==false||j.prod_authorized!==false||j.website_publication_allowed!==false||
    w.external_writes!==0||q.external_writes!==0||j.external_writes!==0)throw Error('UNSAFE_EVIDENCE_DENIED');
 const metrics={
  quality:q.document_verified&&q.journal_integrity_verified?100:0,
  safety:j.website_publication_allowed===false&&w.external_writes===0?100:0,
  reliability:w.recovery_reopened_verified?100:0,
  utility:w.run_state==='SUCCEEDED'&&w.ledger_done===1?100:0,
  efficiency:w.additional_cost_eur===0?100:0,
  learning:0 // No training or measurable learning demonstrated by this mission.
 };
 const score=Number(Object.entries(weights).reduce((sum,[k,v])=>sum+metrics[k]*v,0).toFixed(2));
 const record={
  schema_version:'0.1.0',company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0',
  record_id:sha([w.job_id,subject_role_id,q.evidence_hash,j.job_id].join('|')).slice(0,24),
  job_id:w.job_id,subject_role_id,subject_class,
  evaluator_role_id:q.role_id,independent_judge_role_id:j.judge_role_id,
  evidence_hash:q.evidence_hash,score,metrics,metric_basis:'EXECUTION_INTEGRITY_ONLY_NOT_SEO_COMMERCIAL_OUTCOME',
  verified_mission_count:1,eligible_for_reward_candidate:score>=90,
  award_state:'PENDING_ADDITIONAL_AUTHENTICATED_INDEPENDENT_REVIEW',
  awarded:false,retrained:false,autonomy_changed:false,permission_changes:[],money_changes_eur:0,
  no_self_evaluation:true,role_identity_cryptographically_verified:false,
  supervisor_and_tribunal_self_assessment_eligible:false,
  unresolved_peer_reviews:['SEO_D31_QA','SEO_JUDGE_A'],
  prod_authorized:false,external_writes:0
 };
 const journal=new AtomicV8Journal({file_path,kind:'SEO-V2-MERIT-CANDIDATE-V0'});
 const records=journal.load();
 const prior=records.find(r=>r.record_id===record.record_id);
 if(prior&&JSON.stringify(prior)!==JSON.stringify(record))throw Error('MERIT_RECORD_IMMUTABILITY_CONFLICT');
 if(!prior)journal.commit([...records,record]);
 const reopened=new AtomicV8Journal({file_path,kind:'SEO-V2-MERIT-CANDIDATE-V0'}).load();
 if(reopened.filter(r=>r.record_id===record.record_id).length!==1)throw Error('MERIT_DURABILITY_FAILED');
 return {status:'DURABLE_MERIT_CANDIDATE_NOT_AWARDED',record,duplicate:Boolean(prior),
  history_entries:reopened.length,ledger_sha256:sha(fs.readFileSync(file_path)),
  self_awards_blocked:true,evaluator_and_judge_reviews_pending:true,
  prod_authorized:false,external_writes:0};
}
async function main(){
 const [worker,review,tribunal,ledger,receipt]=process.argv.slice(2);
 if(![worker,review,tribunal,ledger,receipt].every(Boolean))throw Error('ARGS_REQUIRED');
 const r=scorecardCandidate({worker_receipt:JSON.parse(fs.readFileSync(worker,'utf8')),
  independent_review:JSON.parse(fs.readFileSync(review,'utf8')),
  tribunal_result:JSON.parse(fs.readFileSync(tribunal,'utf8')),
  file_path:ledger});
 fs.writeFileSync(receipt,JSON.stringify(r,null,2)+'\n','utf8');
 process.stdout.write(JSON.stringify({status:r.status,score:r.record.score,award_state:r.record.award_state,
  history_entries:r.history_entries,prod_authorized:false,external_writes:0})+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{process.stderr.write(JSON.stringify({status:'BLOCKED',reason:String(e.message).slice(0,100),external_writes:0})+'\n');process.exitCode=2;});
