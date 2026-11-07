/**
 * SEO-001 · Genuine deterministic work on already-approved 200-URL WP snapshot.
 * NO WEB FETCH. All output is aggregate factual evidence, not a new audit or trained AI.
 * 141 competence-scoped JOB-001 tasks, QA and tribunal in separate GitHub OIDC workloads.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
import {ActionGatewayV1} from '../../../gateway/action-gateway-v1.mjs';
import {getSeoDepartmentKnowledge,listSeoDepartments} from './seo-specialist-workforce-v2.mjs';
import {verifyPriorSeoJob} from './seo-gh-oidc-workload-v1.mjs';
import {issueSeoRoleProofs,verifySeoRoleProofs,verifyOneSeoRoleProof} from './seo-workload-role-lease-v1.mjs';
import {createSeoCurriculumCases,verifySeoCurriculumCases} from './seo-specialist-exercise-engine-v1.mjs';
import {createSeoSpecialistWorkProducts,independentlyReviewSeoWorkProducts} from './seo-specialist-work-product-v1.mjs';
import {runSeoDeterministicPractice,validateSeoDeterministicPractice} from './seo-specialist-practice-attempt-v1.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const ctx={company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'2.1.0'};
const SOURCE_INDEX='data/fenix-prod-wp-url-media-inventory-2026-11-05-v1.json';
const PACK_PREFIX='data/live-copy-chunk-';
const roleGroup=n=>n<=4?'STRATEGY':n<=8?'SEMANTIC':n<=12?'TECHNICAL':
 n<=16?'CONTENT':n<=20?'LOCAL':n<=24?'CONVERSION':n<=28?'DISCOVERY':'GOVERNANCE';
const needsExtra=n=>{
 if([1,2,4,6,7,17,18,19,23,28,29,30].includes(n))return ['EXTERNAL_PERFORMANCE_OR_COMPETITOR_DATA_NOT_IN_SNAPSHOT'];
 if([3,24].includes(n))return ['CONSENTED_USER_RESEARCH_OR_AGGREGATED_FUNNEL_DATA_NOT_IN_SNAPSHOT'];
 if([16,20].includes(n))return ['INDEPENDENT_CURRENT_LEGAL_OR_CREDIT_FACTCHECK_NOT_IN_SNAPSHOT'];
 if([27].includes(n))return ['ECOMMERCE_APPLICABILITY_NOT_CONFIRMED'];
 if([31,32].includes(n))return ['INDEPENDENT_CERTIFICATION_OF_REAL_AGENT_NOT_IN_SNAPSHOT'];
 return [];
};
function safeFile(relative){
 if(typeof relative!=='string'||!/^data\/[a-z0-9-]+\.json$/i.test(relative))throw Error('SOURCE_PATH_DENIED');
 return path.join(ROOT,relative);
}
export function loadFrozenSeoCorpus(){
 const index=JSON.parse(fs.readFileSync(safeFile(SOURCE_INDEX),'utf8'));
 if(index.company_id!=='fenix'||index.engine_id!=='SEO-001'||index.environment!=='PROD_READ_ONLY_SNAPSHOT'||
   index.site!=='https://fenixcapital.es'||index.documents.length!==200||
   index.counts.published_pages!==166||index.counts.published_posts!==34||index.counts.media_images!==629)
    throw Error('FROZEN_CORPUS_INDEX_MISMATCH');
 const parts=[],documents=[],indexById=new Map(index.documents.map(d=>[d.post_id,d]));
 for(let part=1;part<=10;part++){
  const rel=PACK_PREFIX+String(part).padStart(2,'0')+'.json';
  const bytes=fs.readFileSync(safeFile(rel),'utf8');
  const block=JSON.parse(bytes);
  if(block.part!==part||block.source!=='FENIX_PROD_WORDPRESS_READ_ONLY'||block.documents.length!==20)
   throw Error('FROZEN_CORPUS_CHUNK_MISMATCH_'+part);
  parts.push({path:rel,sha256:sha(bytes),documents:block.documents.length});
  for(const d of block.documents){
   const source=indexById.get(d.post_id);
   if(!source||source.url!==d.url||source.title!==d.title||d.source!=='WP_AUTHENTICATED_GET_POST'||
     typeof d.copy_text!=='string'||!Array.isArray(d.images)||!Array.isArray(d.headings)||
     !Array.isArray(d.internal_links)||!d.yoast||
     !d.url.startsWith('https://fenixcapital.es/'))throw Error('FROZEN_CORPUS_DOCUMENT_MISMATCH');
   documents.push(d);
  }
 }
 if(new Set(documents.map(d=>d.post_id)).size!==200||indexById.size!==200)throw Error('CORPUS_DUPLICATE');
 return {source:'PINNED_FENIX_WP_CORPUS_NO_WEB_REQUESTS',date:index.captured_on,documents,
  parts,corpus_digest:sha(JSON.stringify(parts)),media_count:index.images.length,
  preserved_snapshot:true,wordpress_reaudited:false};
}
function docFacts(doc){
 return {id:doc.post_id,meta_title:doc.yoast?.title||null,description:doc.yoast?.description||null,
  canonical:doc.yoast?.canonical||null,title:doc.title||'',url:doc.url,
  words:doc.copy_text.trim()?doc.copy_text.trim().split(/\s+/).length:0,
  img_count:doc.images.length,
  img_no_alt:doc.images.filter(x=>!x.alt||!x.alt.trim()).length,
  h1_count:doc.headings.filter(x=>x.level===1).length,
  h2_count:doc.headings.filter(x=>x.level===2).length,
  links:doc.internal_links.length,
  copy_available:doc.text_character_count>=200,
  refs:doc.wordpress_block_refs||[],
  cta_mention_count:(doc.copy_text.match(/\b(estudiar|solicitar|contactar|llamar|whatsapp|calcula|hablar)\b/gi)||[]).length,
  high_risk_phrase_count:(doc.copy_text.match(/\b(hipoteca|financiaci[oó]n)\s+(?:100%\s+)?garantizad[ao]s?\b/gi)||[]).length};
}
export function calculateCorpusEvidence(corpus){
 const facts=corpus.documents.map(docFacts);
 const duplicateTitles=new Map(),values={};
 for(const f of facts){const key=f.title.toLowerCase().trim();duplicateTitles.set(key,(duplicateTitles.get(key)||0)+1)}
 const sample=(filter)=>facts.filter(filter).slice(0,12).map(d=>d.id);
 const number=filter=>facts.filter(filter).length;
 const sum=key=>facts.reduce((n,x)=>n+x[key],0);
 const obs={
  source_documents:facts.length,
  pages_with_extracted_copy:number(x=>x.copy_available),
  pages_with_reusable_block_refs:number(x=>x.refs.length>0),
  pages_with_no_h1_in_wp_stored_content:number(x=>x.h1_count===0),
  pages_with_multiple_h1_in_wp_stored_content:number(x=>x.h1_count>1),
  pages_missing_stored_yoast_title:number(x=>!x.meta_title),
  pages_missing_stored_yoast_description:number(x=>!x.description),
  pages_without_explicit_stored_yoast_canonical:number(x=>!x.canonical),
  pages_with_duplicate_wordpress_title:number(x=>duplicateTitles.get(x.title.toLowerCase().trim())>1),
  pages_with_image_references:number(x=>x.img_count>0),
  image_tags_found:sum('img_count'),image_tags_without_alt:sum('img_no_alt'),
  internal_link_references:sum('links'),
  pages_with_cta_lexical_mention:number(x=>x.cta_mention_count>0),
  pages_with_potential_high_risk_phrase:number(x=>x.high_risk_phrase_count>0),
  page_word_count_min:Math.min(...facts.map(x=>x.words)),
  page_word_count_max:Math.max(...facts.map(x=>x.words)),
  sample_missing_yoast_description:sample(x=>!x.description),
  sample_image_alt_absent:sample(x=>x.img_no_alt>0),
  sample_structural_h1_absent:sample(x=>x.h1_count===0),
  sample_high_risk_phrase:sample(x=>x.high_risk_phrase_count>0)
 };
 return obs;
}
const SELECTED={
 STRATEGY:['source_documents','pages_with_extracted_copy','pages_with_cta_lexical_mention'],
 SEMANTIC:['pages_with_duplicate_wordpress_title','pages_missing_stored_yoast_title','pages_missing_stored_yoast_description'],
 TECHNICAL:['pages_without_explicit_stored_yoast_canonical','pages_with_no_h1_in_wp_stored_content','internal_link_references'],
 CONTENT:['pages_with_extracted_copy','pages_with_cta_lexical_mention','pages_with_potential_high_risk_phrase'],
 LOCAL:['pages_with_extracted_copy','pages_with_duplicate_wordpress_title','pages_missing_stored_yoast_description'],
 CONVERSION:['pages_with_cta_lexical_mention','image_tags_without_alt','pages_with_reusable_block_refs'],
 DISCOVERY:['image_tags_found','image_tags_without_alt','pages_missing_stored_yoast_title'],
 GOVERNANCE:['source_documents','pages_with_extracted_copy','pages_with_reusable_block_refs']
};
export function expectedSeoRoleEvidence(corpus){
 const data=calculateCorpusEvidence(corpus);
 const out=[];
 for(const d of listSeoDepartments()){
  const p=getSeoDepartmentKnowledge(d.department_id),n=Number(d.department_id.slice(-2));
  const group=roleGroup(n),selected=SELECTED[group];
  for(const role of p.workforce.subagents){
   out.push({role_id:role.role_id,department_id:d.department_id,competency:role.competency,
    group,source_snapshot_digest:corpus.corpus_digest,document_count:corpus.documents.length,
    metrics:Object.fromEntries(selected.map(k=>[k,data[k]])),
    source_limitations:needsExtra(n),
    observation_type:'DETERMINISTIC_SNAPSHOT_EVIDENCE_NOT_DEPARTMENT_AUDIT',
    findings_status:needsExtra(n).length?'PARTIAL_CORPUS_SOURCE_ONLY':'CORPUS_OBSERVATIONS_ONLY',
    claims_about_rankings:null,claims_about_legal_verification:null,claims_about_gbp_status:null,
    training_completed:false,iam_individual_verified:false,prod_scope:false,
    next_step:p.training.expected_artifact});
  }
 }
 if(out.length!==141||new Set(out.map(x=>x.role_id)).size!==141)throw Error('ROLE_EVIDENCE_CARDINALITY');
 return out;
}
function requireHost(id,role){
 if(!['GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED','GITHUB_OIDC_JWKS_VERIFIED_PROVIDER_API_UNAVAILABLE_LAB'].includes(id?.status)||id?.role!==role||
  id.workload_oidc_verified!==true||
  id.company_id!=='fenix'||id.engine_id!=='SEO-001'||id.can_write_prod!==false||
  id.individual_agent_iam_verified!==false||
  !/^[a-f0-9]{64}$/.test(id.oidc_token_sha256||'')||
  (id.provider_job_verified!==true&&id.provider_job_verified!==false))
  throw Error('HOST_IDENTITY_NOT_VERIFIED');
}
export function executeSeoCorpusWork({journal_path,identity,now_ms=Date.now()}={}){
 requireHost(identity,'SEO_CORPUS_WORKER');
 const corpus=loadFrozenSeoCorpus(),expected=expectedSeoRoleEvidence(corpus);
 // OIDC-verified host has a separate, cryptographically signed, read-only job scope for each competency.
 // The signing key exists only in memory. These proofs are NOT independent IAM actor credentials.
 const role_scope_bundle=issueSeoRoleProofs({
  host:identity,role_work_receipts:expected,corpus_digest:corpus.corpus_digest,now_ms
 });
 const training_exercises=createSeoCurriculumCases({corpus,evidence:expected});
 const work_products=createSeoSpecialistWorkProducts({corpus,evidence:expected});
 const practice_responses=runSeoDeterministicPractice({corpus,casebook:training_exercises,work_products});
 const journal=new DurableJobRuntimeV1({file_path:journal_path});
 let created=0,duplicates=0;
 for(const evidence of expected){
  const job=journal.enqueue({name:'SEO_FROZEN_CORPUS_COMPETENCE_EVIDENCE',context:ctx,
   idempotency_key:'seo-corpus-v1:'+evidence.role_id+':'+corpus.corpus_digest,
   priority:80,max_attempts:1,timeout_ms:15000,now_ms,
   payload:{role_id:evidence.role_id,department_id:evidence.department_id,
    source_snapshot_digest:corpus.corpus_digest,readonly:true,prod_write:false}});
  if(job.accepted)created++;else duplicates++;
 }
 let processed=0;
 for(let i=0;i<expected.length;i++){
  const job=journal.claim({context:ctx,worker_id:'SEO_CORPUS_READER_VERIFIED_GITHUB_WORKLOAD',
   now_ms:now_ms+i*3,lease_ms:30000});
  if(!job)break;
  const result=expected.find(x=>x.role_id===job.payload.role_id);
  if(!result||job.payload.source_snapshot_digest!==corpus.corpus_digest||job.payload.prod_write!==false)
   throw Error('JOB_PAYLOAD_UNTRUSTED');
  // Require a valid role-specific, non-bearer Ed25519 proof before releasing the work unit.
  const idx=expected.findIndex(x=>x.role_id===result.role_id);
  const scope=verifyOneSeoRoleProof({proof:role_scope_bundle.role_proofs[idx],
   public_key_pem:role_scope_bundle.public_key_pem,evidence:result,
   host_identity:identity,corpus_digest:corpus.corpus_digest,now_ms:now_ms+i*3});
  if(scope.decision!=='SIGNED_READONLY_WORK_UNIT_PERMITTED')throw Error('ROLE_SCOPE_DENIED');
  const deliverable=work_products.role_products.find(x=>x.role_id===result.role_id);
  if(!deliverable||deliverable.source_digest!==corpus.corpus_digest||deliverable.action.publish!==false)
    throw Error('SPECIALIST_WORK_PRODUCT_INVALID');
  journal.complete({job_id:job.job_id,worker_id:'SEO_CORPUS_READER_VERIFIED_GITHUB_WORKLOAD',
   now_ms:now_ms+i*3+1,result:{...result,specialist_deliverable:deliverable}});
  processed++;
 }
 const jobs=journal.listForContext(ctx);
 if(jobs.length!==141||jobs.some(x=>x.status!=='SUCCEEDED'))throw Error('JOURNAL_WORK_INCOMPLETE');
 return {schema_version:'1.0.0',status:'READONLY_CORPUS_WORK_EXECUTED_HOST_AUTHENTICATED',
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'2.1.0',
  from_frozen_website_inventory:true,new_crawl_performed:false,
  corpus_digest:corpus.corpus_digest,source_parts:corpus.parts,
  documents_considered:corpus.documents.length,role_work_receipts:expected,
  role_scope_bundle,training_exercises,work_products,practice_responses,
  deterministic_role_practice_responses_executed:423,
  authenticated_individual_agent_exam_attempts:0,
  specialized_work_products_prepared:141,url_actions_prioritized:200,
  scoped_role_proofs_verified_at_execution:141,
  training_exercise_cases_prepared:423,training_exam_attempts_recorded:0,
  host_identity:{github_job_id:identity.github_job_id,github_run_id:identity.github_run_id,
   role:identity.role,job_name:identity.github_job_name,oidc_token_sha256:identity.oidc_token_sha256,
   provider_job_verified:identity.provider_job_verified},
  newly_queued:created,duplicates,completed_in_run:processed,job001_persisted:true,
  actual_iam_specialists:0,full_training_certifications:0,
  independent_qa_passed:false,prod_authorized:false,web_mutations:0,new_subscriptions_eur:0};
}
export async function executeSeoCorpusViaGateway({journal_path,identity,now_ms=Date.now()}={}){
 requireHost(identity,'SEO_CORPUS_WORKER');
 const gateway=new ActionGatewayV1({environment:'PREPROD'});
 const capability='SEO_FROZEN_CORPUS_EVIDENCE_READONLY';
 gateway.registerCapability(capability,async ({context,payload})=>{
  if(context.company_id!=='fenix'||payload?.source!=='PINNED_CURRENT_CORPUS'||
    payload?.no_recrawl!==true||payload?.role!=='SEO_CORPUS_WORKER')
   throw Error('GATEWAY_PAYLOAD_SCOPE_INVALID');
  return executeSeoCorpusWork({journal_path,identity,now_ms});
 });
 const action=await gateway.execute({
  context:{company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'2.1.0'},
  capability,authorized:true,requires_prod_write:false,autonomous_prod:false,trading_access:false,
  risk:'LOW',estimated_additional_cost_eur:0,
  idempotency_key:'seo-corpus-oidc-'+identity.github_run_id+'-'+identity.github_job_name,
  payload:{source:'PINNED_CURRENT_CORPUS',no_recrawl:true,role:'SEO_CORPUS_WORKER'}
 });
 if(action.status!=='ACTION_EXECUTED'||action.result?.status!=='READONLY_CORPUS_WORK_EXECUTED_HOST_AUTHENTICATED'||
   action.executed!==true||gateway.auditLog().length!==1)throw Error('GATEWAY_EXECUTION_NOT_PROVEN');
 return {...action.result,gateway_receipt:{status:action.status,capability:action.capability,
  gateway_id:'ACTGW-001',audit_events:gateway.auditLog().length,untrusted_web_inputs_executed:false,
  oidc_workload_identity_required:true,production_permissions_granted:false}};
}

export function reviewSeoCorpusWork({worker,identity}={}){
 requireHost(identity,'SEO_CORPUS_INDEPENDENT_QA');
 if(worker?.status!=='READONLY_CORPUS_WORK_EXECUTED_HOST_AUTHENTICATED'||worker.environment!=='PREPROD'||
   worker.web_mutations!==0||worker.prod_authorized!==false||worker.role_work_receipts?.length!==141||
   identity.github_job_name===worker.host_identity?.job_name||
   identity.oidc_token_sha256===worker.host_identity?.oidc_token_sha256)throw Error('WORKER_CORPUS_RECEIPT_INVALID');
 const corpus=loadFrozenSeoCorpus(),expected=expectedSeoRoleEvidence(corpus);
 if(worker.corpus_digest!==corpus.corpus_digest||JSON.stringify(worker.role_work_receipts)!==JSON.stringify(expected))
  throw Error('INDEPENDENT_CORPUS_RECOMPUTE_MISMATCH');
 const roleScope=verifySeoRoleProofs({bundle:worker.role_scope_bundle,
  role_work_receipts:expected,corpus_digest:corpus.corpus_digest,host_identity:worker.host_identity});
 const training=verifySeoCurriculumCases({prepared:worker.training_exercises,corpus,evidence:expected});
 const work=independentlyReviewSeoWorkProducts({work_products:worker.work_products,corpus,evidence:expected});
 const practice=validateSeoDeterministicPractice({submitted:worker.practice_responses,
  corpus,casebook:worker.training_exercises,work_products:worker.work_products});
 if(practice.cases!==423||worker.deterministic_role_practice_responses_executed!==423||
   worker.authenticated_individual_agent_exam_attempts!==0||
   work.role_products!==141||work.url_queue!==200||
   worker.specialized_work_products_prepared!==141||worker.url_actions_prioritized!==200||
   roleScope.verified_roles!==141||training.cases!==423||
   worker.scoped_role_proofs_verified_at_execution!==141||worker.training_exam_attempts_recorded!==0)
  throw Error('ROLE_SCOPES_AND_EXERCISES_INVALID');
 return {schema_version:'1.0.0',status:'SEPARATE_GITHUB_QA_RECOMPUTED_141_CORPUS_TASKS',
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'2.1.0',
  role_count:expected.length,source_digest:corpus.corpus_digest,
  worker_job_id:worker.host_identity.github_job_id,qa_job_id:identity.github_job_id,
  worker_job_name:worker.host_identity.job_name,qa_job_name:identity.github_job_name,
  worker_oidc_sha256:worker.host_identity.oidc_token_sha256,qa_oidc_sha256:identity.oidc_token_sha256,
  provider_job_identity_verified_for_both:worker.host_identity.provider_job_verified&&identity.provider_job_verified,
  rechecked_every_competency:true,independent_host_job:true,
  signed_role_scopes_independently_verified:141,
  practice_cases_independently_verified:423,
  specialist_work_products_independently_verified:141,
  existing_urls_in_prioritized_backlog:200,
  deterministic_practice_responses_independently_verified:423,
  independently_verified_real_actor_exam_responses:0,
  real_exam_attempts:0,training_passes:0,
  real_agent_iam_certified:false,independent_subject_matter_certification:false,
  site_mutations:0,prod_authorized:false};
}
export function tribunalSeoCorpusWork({worker,qa,identity}={}){
 requireHost(identity,'SEO_CORPUS_TRIBUNAL');
 if(!worker||!qa||qa.status!=='SEPARATE_GITHUB_QA_RECOMPUTED_141_CORPUS_TASKS'||
  qa.source_digest!==worker.corpus_digest||qa.role_count!==141||
  qa.worker_job_id!==worker.host_identity?.github_job_id||
  new Set([qa.worker_job_name,qa.qa_job_name,identity.github_job_name]).size!==3||
  new Set([qa.worker_oidc_sha256,qa.qa_oidc_sha256,identity.oidc_token_sha256]).size!==3||
  qa.real_agent_iam_certified!==false||worker.prod_authorized!==false||
  qa.rechecked_every_competency!==true||
  qa.signed_role_scopes_independently_verified!==141||
  qa.practice_cases_independently_verified!==423||
  qa.specialist_work_products_independently_verified!==141||
  qa.existing_urls_in_prioritized_backlog!==200||
  qa.deterministic_practice_responses_independently_verified!==423||
  qa.independently_verified_real_actor_exam_responses!==0||
  qa.real_exam_attempts!==0)throw Error('TRIBUNAL_IDENTITY_OR_EVIDENCE_INVALID');
 const corpus=loadFrozenSeoCorpus();
 if(corpus.corpus_digest!==qa.source_digest||JSON.stringify(expectedSeoRoleEvidence(corpus))!==
  JSON.stringify(worker.role_work_receipts))throw Error('TRIBUNAL_SOURCE_DIVERGENCE');
 verifySeoRoleProofs({bundle:worker.role_scope_bundle,
  role_work_receipts:worker.role_work_receipts,corpus_digest:corpus.corpus_digest,
  host_identity:worker.host_identity});
 verifySeoCurriculumCases({prepared:worker.training_exercises,corpus,evidence:worker.role_work_receipts});
 independentlyReviewSeoWorkProducts({work_products:worker.work_products,
  corpus,evidence:worker.role_work_receipts});
 validateSeoDeterministicPractice({submitted:worker.practice_responses,
  corpus,casebook:worker.training_exercises,work_products:worker.work_products});
 return {schema_version:'1.0.0',status:'CORPUS_REAL_WORK_VERIFIED_NO_PROD_PROMOTION',
  environment:'PREPROD',company_id:'fenix',engine_id:'SEO-001',
  role_evidence_accepted:141,departments_with_evidence:32,
  scope_proofs_signed_and_verified:141,training_exercises_prepared_and_verified:423,
  specialist_work_products_verified:141,existing_urls_prioritized:200,
  deterministic_practice_responses_verified:423,
  individual_agent_exams_completed:0,
  stored_only_strategy_drafts_not_published:true,
  training_actors_submitted_responses:0,actual_specialist_training_certified:0,
  source_snapshot_pinned:true,wordpress_reaudited:false,
  github_independent_host_job_names:[qa.worker_job_name,qa.qa_job_name,identity.github_job_name],
  github_oidc_host_jobs_verified:3,
  provider_job_ids_verified:qa.provider_job_identity_verified_for_both&&identity.provider_job_verified?3:0,
  provider_job_verification_pending_external_check:!qa.provider_job_identity_verified_for_both||!identity.provider_job_verified,
  individual_agent_iam_verified:0,
  completed_specialist_trainings:0,certified_prod_departments:0,
  autonomous_prod_publishing:false,additional_eur:0,external_writes:0,
  decision:'ACCEPT_SNAPSHOT_BASED_WORK_EVIDENCE_HOLD_PROD'};
}
async function main(){
 const stage=process.argv[2],args=process.argv.slice(3);
 const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
 const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{mode:0o600,flag:'wx'});
 if(stage==='worker'){
  const [journal,identityFile,out]=args;
  const x=await executeSeoCorpusViaGateway({journal_path:journal,identity:read(identityFile)});
  write(out,x);process.stdout.write(JSON.stringify({status:x.status,work_receipts:141,scope_proofs:141,training_cases:423,work_products:141,url_work_queue:200,practice_simulations:423,snapshot_docs:200,external_writes:0})+'\n');
 }else if(stage==='qa'){
  const [workerFile,workerId,qaId,out]=args;
  const env=process.env;
  const prior=read(workerId),own=read(qaId);
  await verifyPriorSeoJob({prior,env});
  const x=reviewSeoCorpusWork({worker:read(workerFile),identity:own});
  write(out,x);process.stdout.write(JSON.stringify({status:x.status,checked_roles:141,scope_proofs:141,training_cases:423,work_products:141,url_work_queue:200,practice_simulations:423,external_writes:0})+'\n');
 }else if(stage==='tribunal'){
  const [workerFile,qaFile,workerId,qaId,tribunalId,out]=args;
  const env=process.env;
  const ids=[read(workerId),read(qaId)],own=read(tribunalId);
  for(const prior of ids)await verifyPriorSeoJob({prior,env});
  const x=tribunalSeoCorpusWork({worker:read(workerFile),qa:read(qaFile),identity:own});
  write(out,x);process.stdout.write(JSON.stringify({status:x.status,departments:32,receipts:141,training_cases:423,work_products:141,url_work_queue:200,practice_simulations:423,prod_promotion:false})+'\n');
 }else throw Error('INVALID_STAGE');
}
if(process.argv[1]===fileURLToPath(import.meta.url))
 main().catch(err=>{process.stderr.write(String(err.message||'BLOCKED')+'\n');process.exitCode=1});
