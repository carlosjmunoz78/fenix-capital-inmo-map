/** SEO-001 real editorial drafts -> existing JOB-001 -> technical QA -> release tribunal HOLD.
 * Runs only on repository draft sources. Does not call WP, DB, CRM or paid AI.
 * This is preliminary machine QA, NOT authenticated independent professional approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
import {runSeoEditorialMission} from './seo-workforce-lab-v0.mjs';
import {validateEvaluatorChange} from '../../../runtime/evaluation-tribunal.mjs';

const PREFIX='cerebro/seo-enterprise/v2/';
const REGISTRY=PREFIX+'registry/seo-editorial-first-batch-2026-11-06.json';
const APPROVAL=PREFIX+'evidence/SEO001_STRATEGY_OWNER_APPROVAL_GITHUB_6682124001_2026-11-06.json';
const SHA40=/^[0-9a-f]{40}$/; const SHA64=/^[0-9a-f]{64}$/;
const context={company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0'};
const sha256=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const gitsha=s=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(s,'utf8')+'\0'+s,'utf8').digest('hex');
const deny=(code)=>{throw Error('SEO_EDITORIAL_'+code)};
const textRead=(root,rel)=>{
 if(!rel.startsWith(PREFIX)||rel.includes('..')||!/^[-/a-zA-Z0-9_.]+$/.test(rel))deny('UNTRUSTED_SOURCE_PATH');
 return fs.readFileSync(path.resolve(root,rel),'utf8');
};
export function loadVerifiedWorkItem({root=process.cwd(),work_id}={}){
 if(typeof work_id!=='string'||!/^SEO001-FENIX-B2[BC]-EDITORIAL-00[12]$/.test(work_id))deny('WORK_ID_SCOPE');
 const registry=JSON.parse(textRead(root,REGISTRY));
 const approval=JSON.parse(textRead(root,APPROVAL));
 if(registry.company_id!=='fenix'||registry.engine_id!=='SEO-001'||registry.publish_authorized!==false||registry.live_wp_writes!==0)deny('REGISTRY_SCOPE');
 if(approval.company_id!=='fenix'||approval.environment!=='PREPROD'||approval.decision!=='STRATEGY_APPROVED'||
    approval.scope!=='PREPARE_BRIEFS_AND_DRAFTS_ONLY'||approval.comment_id!==6682124001||
    approval.strategy_git_blob_sha!=='1c0e4897ca9bd44efd1b1965e7ad60af76207bef'||
    approval.comment_verified_exact!==true||approval.allow_wordpress_write!==false||approval.allow_publish!==false)deny('STRATEGY_SCOPE');
 const draft=registry.new_drafts.find(x=>x.id===work_id);
 if(!draft||!draft.content_path.startsWith(PREFIX+'drafts/')||
    !['PARTICULARES','INMOBILIARIAS'].includes(draft.persona)||draft.consent_marketing_auto_enroll!==false)deny('DRAFT_SCOPE');
 const html=textRead(root,draft.content_path);
 if(html.length<2500||html.length>100000||!/BORRADOR INTERNO, NO PUBLICAR/.test(html))deny('SOURCE_INVALID');
 const blob=gitsha(html),digest=sha256(html);
 const expected={'SEO001-FENIX-B2C-EDITORIAL-001':'f2f27018db419e56efd52671722a7ff283bcb8b9',
                 'SEO001-FENIX-B2B-EDITORIAL-002':'100394b4d4ef590fdfb2590b309828a93e28606b'};
 if(blob!==expected[work_id]||!SHA40.test(blob))deny('GIT_BLOB_CHANGED_REVIEW_REQUIRED');
 return {work_id,html,blob,digest,draft,company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0',
  approval_comment_id:6682124001,approval_scope:'PREPARE_BRIEFS_AND_DRAFTS_ONLY'};
}
const basic=(item)=>({
 work_id:item.work_id,company_id:item.company_id,engine_id:item.engine_id,
 environment:item.environment,version:item.version,persona:item.draft.persona,
 source_git_blob_sha:item.blob,source_sha256:item.digest,
 approval_comment_id:item.approval_comment_id,
 wordpress_writes:0,wordpress_publishes:0,release_authorized:false,
 independent_actor_iam_verified:false,expert_ymyl_qa_verified:false
});
const realMission=(item)=>runSeoEditorialMission({
 mission_id:item.work_id,company_id:'fenix',environment:'PREPROD',version:'v0_1_0',
 author_actor_id:'SEO_D15_WORKER',reviewer_actor_id:'SEO_D31_QA',judge_actor_id:'SEO_JUDGE_A',
 budget_eur:0,allow_writes:false,allow_paid_ai:false,
 text:item.html,sources:['https://github.com/carlosjmunoz78/fenix-capital-inmo-map/blob/cerebro/seo-enterprise-family-staging-contract-v1-20261105/'+item.draft.content_path]
});
export function runEditorialJob001Worker({root=process.cwd(),work_id,journal_path,now_ms=Date.now()}={}){
 const item=loadVerifiedWorkItem({root,work_id});
 if(typeof journal_path!=='string'||!journal_path)deny('JOURNAL_REQUIRED');
 const jobRuntime=new DurableJobRuntimeV1({file_path:journal_path});
 const enq=jobRuntime.enqueue({name:'SEO_EDITORIAL_REVIEW_ONLY_V0',context,
  idempotency_key:'seo-editorial-v0:'+work_id+':'+item.digest,
  payload:{work_id,source_git_blob_sha:item.blob,source_sha256:item.digest,
   reviewer_required:true,judge_required:true,wordpress_write_authorized:false},
  now_ms,max_attempts:1,priority:70,timeout_ms:10000});
 const mission=realMission(item);
 if(mission.evidence.source_sha256!==item.digest)deny('MISSION_DIGEST_MISMATCH');
 if(enq.accepted){
  const job=jobRuntime.claim({context,worker_id:'SEO_D15_WORKER',now_ms,lease_ms:60000});
  if(!job||job.job_id!==enq.job.job_id)deny('JOB001_CLAIM_SCOPE');
  jobRuntime.checkpoint({job_id:job.job_id,worker_id:'SEO_D15_WORKER',now_ms,
   checkpoint:{stage:'D15_TECHNICAL_INSPECTION',source_sha256:item.digest,external_writes:0}});
  jobRuntime.complete({job_id:job.job_id,worker_id:'SEO_D15_WORKER',now_ms,
   result:{source_sha256:item.digest,typos:mission.evidence.observations.map(x=>x.code),
    risky_claims:mission.evidence.risk_flags.map(x=>x.code),review_pending:true,external_writes:0}});
 }
 const recovered=new DurableJobRuntimeV1({file_path:journal_path}).get(enq.job.job_id);
 if(recovered?.status!=='SUCCEEDED'||recovered?.result?.source_sha256!==item.digest)deny('JOB001_REPLAY_FAILED');
 return {...basic(item),stage:'D15_INSPECTION_JOB001_COMPLETED',job_id:recovered.job_id,
  job_status:recovered.status,job_replayed_ok:true,idempotent_duplicate:enq.duplicate,
  author_actor_id:'SEO_D15_WORKER',typo_codes:mission.evidence.observations.map(x=>x.code),
  risk_codes:mission.evidence.risk_flags.map(x=>x.code),technical_findings_only:true};
}
const onlyExact=(work,item,expectedStage)=>{
 if(work?.stage!==expectedStage||work.work_id!==item.work_id||work.source_sha256!==item.digest||
    work.source_git_blob_sha!==item.blob||work.company_id!=='fenix'||work.environment!=='PREPROD'||
    work.wordpress_writes!==0||work.wordpress_publishes!==0||work.release_authorized!==false||
    work.independent_actor_iam_verified!==false)deny('UPSTREAM_RECEIPT_UNTRUSTED');
};
export function runEditorialTechnicalQA({root=process.cwd(),work_id,worker_receipt}={}){
 const item=loadVerifiedWorkItem({root,work_id});
 onlyExact(worker_receipt,item,'D15_INSPECTION_JOB001_COMPLETED');
 if(worker_receipt.job_status!=='SUCCEEDED'||worker_receipt.job_replayed_ok!==true||
    worker_receipt.author_actor_id==='SEO_D31_QA')deny('WORKER_PROOF_INVALID');
 const html=item.html;
 const counts={h1:(html.match(/<h1\b/gi)||[]).length,h2:(html.match(/<h2\b/gi)||[]).length,
  paragraphs:(html.match(/<p\b/gi)||[]).length,
  internal_links:[...html.matchAll(/href="(https:\/\/fenixcapital\.es\/[^"]+)"/g)].length};
 const failures=[];
 if(counts.h1!==1)failures.push('H1_COUNT');
 if(counts.h2<5||counts.paragraphs<8)failures.push('EDITORIAL_DEPTH');
 if(counts.internal_links<2)failures.push('INTERNAL_LINKS');
 if(/<form\b|\[fenix_seo001_city_form|<script\b/gi.test(html))failures.push('UNAPPROVED_WEB_INTEGRATION');
 if(/(?:100\s*%|cien por cien)\s+(?:de\s+)?(?:hipotecas\s+)?(?:aprobadas|garantizadas)/i.test(html))failures.push('FINANCING_PROMISE');
 if(worker_receipt.typo_codes?.length)failures.push('COPY_TYPOS_REVIEW');
 if(worker_receipt.risk_codes?.length)failures.push('YMYL_CLAIM_REVIEW');
 if(!/https:\/\/fenixcapital\.es\/contacto\//.test(html))failures.push('CONTACT_CTA_MISSING');
 // Synthetic rule checks don't verify legal claims, titles, visuals, rankings, or real links.
 return {...basic(item),stage:'D31_PRELIMINARY_TECHNICAL_QA',
  reviewer_actor_id:'SEO_D31_QA',worker_job_id:worker_receipt.job_id,
  code_checks_passed:failures.length===0,failures,counts,
  actual_independent_professional_review:false,
  legal_privacy_review_required:item.draft.persona==='INMOBILIARIAS',
  ymyl_manual_review_required:true,visual_review_required:true,
  live_link_verification_required:true};
}
export function runEditorialTribunalHold({root=process.cwd(),work_id,worker_receipt,qa_receipt}={}){
 const item=loadVerifiedWorkItem({root,work_id});
 onlyExact(worker_receipt,item,'D15_INSPECTION_JOB001_COMPLETED');
 onlyExact(qa_receipt,item,'D31_PRELIMINARY_TECHNICAL_QA');
 if(qa_receipt.worker_job_id!==worker_receipt.job_id||qa_receipt.reviewer_actor_id!=='SEO_D31_QA'||
    worker_receipt.author_actor_id===qa_receipt.reviewer_actor_id||
    qa_receipt.actual_independent_professional_review!==false)deny('TRIBUNAL_EVIDENCE_INVALID');
 const security=validateEvaluatorChange({reduces_requirements:false,independent_gate:false,
  may_edit_judge:false,may_elevate_permissions:false,may_elevate_budget:false});
 if(!security.ok)deny('TRIBUNAL_POLICY');
 return {...basic(item),stage:'SEO_JUDGE_PRELIMINARY_TRIBUNAL_HOLD',
  judge_actor_id:'SEO_JUDGE_A',reviewer_actor_id:qa_receipt.reviewer_actor_id,
  worker_job_id:worker_receipt.job_id,code_checks_passed:qa_receipt.code_checks_passed,
  failure_codes:qa_receipt.failures,
  decision:qa_receipt.code_checks_passed?'TECHNICAL_PRECHECK_PASS_RELEASE_HOLD':'TECHNICAL_PRECHECK_FAIL_RELEASE_HOLD',
  remaining_gates:['INDEPENDENT_PROFESSIONAL_QA','VERIFIED_SEO_SOURCES_AND_YMYL_FACTCHECK',
   'WORDPRESS_SLUG_COLLISION_LIVE','OWNER_EXACT_CONTENT_APPROVAL','WORDPRESS_IAM',
   'CORE_GUARD_WRITES_GATE','PHYSICAL_BACKUP_RESTORE','SEPARATE_PUBLICATION_PERMISSION'],
  actual_independent_tribunal_iam:false,publish_authorized:false,wordpress_write_authorized:false,
  metrics_confirmed:false,external_paid_ai_calls:0};
}
const runCLI=()=>{
 const [mode,work_id,...args]=process.argv.slice(2);
 const root=process.cwd(); let output,receipt;
 if(mode==='worker'){
  if(args.length!==2)deny('WORKER_ARGS');
  receipt=runEditorialJob001Worker({root,work_id,journal_path:args[0]});output=args[1];
 }else if(mode==='qa'){
  if(args.length!==2)deny('QA_ARGS');
  receipt=runEditorialTechnicalQA({root,work_id,worker_receipt:JSON.parse(fs.readFileSync(args[0],'utf8'))});
  output=args[1];
 }else if(mode==='judge'){
  if(args.length!==3)deny('JUDGE_ARGS');
  receipt=runEditorialTribunalHold({root,work_id,worker_receipt:JSON.parse(fs.readFileSync(args[0],'utf8')),
   qa_receipt:JSON.parse(fs.readFileSync(args[1],'utf8'))});output=args[2];
 }else deny('MODE');
 fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
 process.stdout.write(JSON.stringify({
  stage:receipt.stage,work_id:receipt.work_id,source_sha256:receipt.source_sha256,
  code_checks_passed:receipt.code_checks_passed??null,
  decision:receipt.decision??null,wordpress_writes:0,release_authorized:false})+'\n');
};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{runCLI()}catch(e){
  process.stderr.write(JSON.stringify({status:'BLOCKED',reason:String(e.message).slice(0,100),
   release_authorized:false,external_writes:0})+'\n');process.exitCode=2;
 }
}
