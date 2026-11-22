/** SEO-001 | First D05 specialist workload/context evidence, not an independent agent IAM principal.
 * Reuses verified GitHub OIDC host, ACTGW-001, JOB-001, pinned corpus and non-bearer role lease.
 * Offline only: no HTTP, no AI, no stage, no WordPress/App/CRM writes, no role promotion.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {getSeoDepartmentKnowledge,compileSeoSpecialistMission} from './seo-specialist-workforce-v2.mjs';
import {loadFrozenSeoCorpus,expectedSeoRoleEvidence} from './seo-corpus-job001-work-v1.mjs';
import {createSeoSpecialistWorkProducts} from './seo-specialist-work-product-v1.mjs';
import {verifyOneSeoRoleProof} from './seo-workload-role-lease-v1.mjs';
import {verifyPriorSeoJob} from './seo-gh-oidc-workload-v1.mjs';
import {requireSeoStagingOff,seoStagingSuspensionStatus} from './seo-staging-suspension-v1.mjs';
const ROLE='SEO-D05:SPECIALIST:01';
const HOSTS=Object.freeze({worker:['SEO_CORPUS_WORKER','seo-corpus-worker'],
 qa:['SEO_CORPUS_INDEPENDENT_QA','seo-corpus-qa'],
 tribunal:['SEO_CORPUS_TRIBUNAL','seo-corpus-tribunal']});
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const fail=x=>{throw Error('SEO_FIRST_ROLE_'+x)};
function requireHost(identity,kind){
 const [role,job]=HOSTS[kind];
 if(identity?.status!=='GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED'||
    identity.role!==role||identity.github_job_name!==job||
    identity.company_id!=='fenix'||identity.engine_id!=='SEO-001'||
    identity.workload_oidc_verified!==true||identity.provider_job_verified!==true||
    identity.individual_agent_iam_verified!==false||identity.can_write_prod!==false||
    identity.can_publish!==false||identity.can_grant_permissions!==false||
    !Number.isSafeInteger(identity.github_job_id)||
    !Number.isSafeInteger(identity.github_run_id)||
    !/^[0-9a-f]{64}$/.test(identity.oidc_token_sha256||''))fail('UNVERIFIED_HOST_'+kind.toUpperCase());
 return identity;
}
function requireSeparated(...identities){
 const first=identities[0];
 if(identities.some(x=>x.github_run_id!==first.github_run_id)||
    new Set(identities.map(x=>x.github_job_id)).size!==identities.length||
    new Set(identities.map(x=>x.github_job_name)).size!==identities.length||
    new Set(identities.map(x=>x.oidc_token_sha256)).size!==identities.length)
   fail('NOT_INDEPENDENT_GITHUB_JOBS');
}
function contextFromSource(){
 const policy=seoStagingSuspensionStatus();
 if(policy.staging_off!==true||policy.allow_staging_requests!==false)fail('STAGING_NOT_BLOCKED');
 requireSeoStagingOff({source_refs:['canonical:inventory:2026-11-05']});
 const p=getSeoDepartmentKnowledge('SEO-D05');
 const agent=p.workforce.subagents.find(x=>x.role_id===ROLE);
 if(!agent||agent.iam_principal_id!==null||agent.execution_state!=='ROLE_TEMPLATE_DEFINED_NOT_ACTIVE')fail('ROLE_DRIFT');
 const corpus=loadFrozenSeoCorpus(), all=expectedSeoRoleEvidence(corpus);
 const matching=all.find(x=>x.role_id===ROLE);
 if(!matching||matching.department_id!=='SEO-D05'||matching.source_snapshot_digest!==corpus.corpus_digest)fail('CORPUS_ROLE_DRIFT');
 const work=createSeoSpecialistWorkProducts({corpus,evidence:all}).role_products.find(x=>x.role_id===ROLE);
 if(!work||work.action?.publish!==false||!work.target_url?.startsWith('https://fenixcapital.es/')||
    work.source_digest!==corpus.corpus_digest||work.real_agent_execution_certified!==false)fail('ROLE_WORK_INVALID');
 const plan=compileSeoSpecialistMission({
  company_id:'fenix',department_id:'SEO-D05',subagent_role_id:ROLE,
  request_id:'SEO_D05_FIRST_SHADOW_V1',
  objective:'Verificar keyword seeds con evidencias del corpus guardado, sin recrawl ni publicación',
  environment:'LAB',source_refs:['canonical:inventory:2026-11-05'],
  allow_writes:false,allow_paid_ai:false,budget_eur:0
 });
 if(plan.state!=='LAB_PLAN_NOT_EXECUTED'||plan.created_real_job!==false||
    plan.can_publish!==false||plan.role_id!==ROLE)fail('PLAN_SCOPE_DRIFT');
 const packed={role_id:ROLE,department_id:'SEO-D05',
   knowledge_pack_id:p.knowledge_pack_id,knowledge:p.knowledge,
   owner_governance:p.owner_excellence_governance,assigned_competency:agent.competency,
   training_gate:p.readiness.certified_for_production,source_policy:p.source_policy};
 return {p,corpus,matching,work,plan,packed,context_sha256:hash(packed)};
}
export function firstSpecialistWorkerReceipt({worker,identity,now_ms=Date.now()}={}){
 requireHost(identity,'worker');
 if(worker?.status!=='READONLY_CORPUS_WORK_EXECUTED_HOST_AUTHENTICATED'||
    worker.gateway_receipt?.gateway_id!=='ACTGW-001'||
    worker.gateway_receipt?.status!=='ACTION_EXECUTED'||
    worker.job001_persisted!==true||worker.completed_in_run!==141||
    worker.new_crawl_performed!==false||worker.web_mutations!==0||
    worker.prod_authorized!==false||worker.actual_iam_specialists!==0||
    worker.host_identity?.github_job_id!==identity.github_job_id||
    worker.host_identity?.github_run_id!==identity.github_run_id||
    worker.host_identity?.oidc_token_sha256!==identity.oidc_token_sha256)fail('GATEWAY_JOB_EVIDENCE');
 const source=contextFromSource();
 if(worker.corpus_digest!==source.corpus.corpus_digest||
    !Array.isArray(worker.role_work_receipts)||worker.role_work_receipts.length!==141||
    !Array.isArray(worker.work_products?.role_products)||worker.work_products.role_products.length!==141)fail('CORPUS_CONTEXT');
 const i=worker.role_work_receipts.findIndex(x=>x.role_id===ROLE);
 const proof=worker.role_scope_bundle?.role_proofs?.[i];
 if(i<0||!proof||JSON.stringify(worker.role_work_receipts[i])!==JSON.stringify(source.matching)||
    JSON.stringify(worker.work_products.role_products.find(x=>x.role_id===ROLE))!==JSON.stringify(source.work))fail('WORK_CHANGED');
 const authorization=verifyOneSeoRoleProof({
  proof,public_key_pem:worker.role_scope_bundle.public_key_pem,
  evidence:source.matching,host_identity:identity,corpus_digest:source.corpus.corpus_digest,now_ms
 });
 if(authorization.decision!=='SIGNED_READONLY_WORK_UNIT_PERMITTED')fail('ROLE_PROOF_DENIED');
 const evidence={
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',version:'1.0.0',
  status:'D05_WORKLOAD_DELEGATION_EXECUTED_NOT_INDIVIDUAL_AGENT_IAM',
  role_id:ROLE,host_role:identity.role,host_job_id:identity.github_job_id,
  host_run_id:identity.github_run_id,host_oidc_sha256:identity.oidc_token_sha256,
  issued_at_ms:proof.payload.issued_at_ms,lease_expires_at_ms:proof.payload.expires_at_ms,
  role_proof_signature_sha256:hash(proof.signature),
  source_digest:source.corpus.corpus_digest,context_sha256:source.context_sha256,
  knowledge_pack_id:source.p.knowledge_pack_id,assigned_competency:source.matching.competency,
  mission_request_id:source.plan.request_id,mission_plan_state:source.plan.state,
  work_product_sha256:hash(source.work),target_post_id:source.work.target_post_id,
  target_url:source.work.target_url,source_copy_sha256:source.work.evidence.copy_sha256,
  work_status:source.work.status,source_limitations:source.matching.source_limitations,
  gateway_id:'ACTGW-001',job001_persisted:true,
  sources_checked:'PINNED_200_URL_CORPUS_NOT_LIVE_WEB',
  external_source_currently_verified:false,
  independent_agent_iam_verified:false,professional_exam_graded:false,
  independent_qa_completed:false,production_certified:false,
  publish_authorized:false,web_requests:0,external_writes:0,added_cost_eur:0,
  review_required:['D31_INDEPENDENT_QA','D32_TRAINING','TRIBUNAL','REAL_IAM_PRINCIPAL']
 };
 return {...evidence,receipt_sha256:hash(evidence)};
}
export function firstSpecialistQaReceipt({worker,worker_identity,receipt,qa_identity}={}){
 requireHost(worker_identity,'worker');requireHost(qa_identity,'qa');
 requireSeparated(worker_identity,qa_identity);
 if(receipt?.role_id!==ROLE||!Number.isSafeInteger(receipt.issued_at_ms)||
    !Number.isSafeInteger(receipt.lease_expires_at_ms)||receipt.lease_expires_at_ms-receipt.issued_at_ms!==600000)
   fail('QA_RECEIPT_BOUNDS');
 // Historic proof verification at issuance is evidence inspection, not a renewed lease or permission.
 const computed=firstSpecialistWorkerReceipt({
  worker,identity:worker_identity,now_ms:receipt.issued_at_ms+1
 });
 if(JSON.stringify(receipt)!==JSON.stringify(computed))fail('QA_RECEIPT_TAMPERED');
 const result={
  schema_version:'1.0.0',status:'D31_SEPARATE_OIDC_JOB_RECOMPUTED_D05_CONTEXT',
  role_id:ROLE,source_digest:receipt.source_digest,
  knowledge_sha256:receipt.context_sha256,work_sha256:receipt.work_product_sha256,
  worker_receipt_sha256:receipt.receipt_sha256,worker_job_id:worker_identity.github_job_id,
  qa_job_id:qa_identity.github_job_id,
  qa_oidc_sha256:qa_identity.oidc_token_sha256,
  qa_scope:'EVIDENCE_RECOMPUTE_ONLY',
  independent_github_job:true,individual_expert_exam_passed:false,
  independent_agent_iam_verified:false,
  tribunal_required:true,publish_authorized:false,external_writes:0,cost_eur:0
 };
 return {...result,qa_receipt_sha256:hash(result)};
}
export function firstSpecialistTribunalReceipt({worker,worker_identity,receipt,qa_identity,qa,tribunal_identity}={}){
 requireHost(tribunal_identity,'tribunal');
 requireSeparated(worker_identity,qa_identity,tribunal_identity);
 const expected=firstSpecialistQaReceipt({worker,worker_identity,receipt,qa_identity});
 if(JSON.stringify(expected)!==JSON.stringify(qa))fail('TRIBUNAL_QA_TAMPERED');
 return {schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',role_id:ROLE,
  status:'D05_WORKLOAD_CONTEXT_EVIDENCE_VERIFIED_NOT_AGENT_IAM_CERTIFICATION',
  worker_job_id:worker_identity.github_job_id,qa_job_id:qa_identity.github_job_id,
  tribunal_job_id:tribunal_identity.github_job_id,
  frozen_corpus_sha256:receipt.source_digest,knowledge_sha256:receipt.context_sha256,
  work_sha256:receipt.work_product_sha256,
  qa_receipt_sha256:qa.qa_receipt_sha256,
  github_oidc_jobs_verified:3,independent_specialist_agent_iam_verified:false,
  subject_matter_exams_passed:0,departments_certified_prod:0,
  release_decision:'HOLD_IAM_AND_PROFESSIONAL_EVALUATION',
  production_permissions_granted:false,publish_authorized:false,
  wordpress_writes:0,staging_requests:0,new_subscriptions_eur:0};
}
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const write=(f,obj)=>fs.writeFileSync(f,JSON.stringify(obj,null,2)+'\n',{mode:0o600,flag:'wx'});
async function main(){
 const [mode,...a]=process.argv.slice(2);
 if(mode==='worker'&&a.length===3){
  const result=firstSpecialistWorkerReceipt({worker:read(a[0]),identity:read(a[1])});
  write(a[2],result);
  process.stdout.write(JSON.stringify({status:result.status,role:ROLE,context_sha256:result.context_sha256,site_writes:0,agent_iam:false})+'\n');
 }else if(mode==='qa'&&a.length===5){
  await verifyPriorSeoJob({prior:read(a[1]),env:process.env});
  const result=firstSpecialistQaReceipt({worker:read(a[0]),worker_identity:read(a[1]),receipt:read(a[2]),qa_identity:read(a[3])});
  write(a[4],result);
  process.stdout.write(JSON.stringify({status:result.status,role:ROLE,publish:false})+'\n');
 }else if(mode==='tribunal'&&a.length===7){
  for(const previous of [read(a[1]),read(a[3])])await verifyPriorSeoJob({prior:previous,env:process.env});
  const result=firstSpecialistTribunalReceipt({worker:read(a[0]),worker_identity:read(a[1]),receipt:read(a[2]),qa_identity:read(a[3]),qa:read(a[4]),tribunal_identity:read(a[5])});
  write(a[6],result);
  process.stdout.write(JSON.stringify({status:result.status,role:ROLE,agent_iam:false,publish:false})+'\n');
 }else fail('INVALID_ARGS');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(err=>{process.stderr.write(String(err.message||'BLOCKED').slice(0,200)+'\n');process.exitCode=1});
}
