import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {verifyJwtSignedByGithub} from '../runtime/seo-gh-oidc-workload-v1.mjs';
import {issueSeoRoleProofs,verifySeoRoleProofs,verifyOneSeoRoleProof} from '../runtime/seo-workload-role-lease-v1.mjs';
import {createSeoCurriculumCases,verifySeoCurriculumCases} from '../runtime/seo-specialist-exercise-engine-v1.mjs';
import {createSeoSpecialistWorkProducts,independentlyReviewSeoWorkProducts} from '../runtime/seo-specialist-work-product-v1.mjs';
import {runSeoDeterministicPractice,validateSeoDeterministicPractice} from '../runtime/seo-specialist-practice-attempt-v1.mjs';
import {createSeoEditorialWriteBundle,physicallyWriteSeoDrafts,proveSeoDraftRollback,executeSeoSandboxWrite} from '../runtime/seo-draft-writer-lab-v1.mjs';
import {planOfficialWordPressDraftDryRun,rejectUnauthorizedWordPressCommit,denyWordPressPublish,denyWordPressExistingPageUpdate} from '../runtime/seo-wordpress-draft-bridge-v1.mjs';


import {loadFrozenSeoCorpus,calculateCorpusEvidence,expectedSeoRoleEvidence,executeSeoCorpusWork,executeSeoCorpusViaGateway,reviewSeoCorpusWork,tribunalSeoCorpusWork} from '../runtime/seo-corpus-job001-work-v1.mjs';
const makeIdentity=(role,id)=>({status:'GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED',
 company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',role,
 github_job_name:({'SEO_CORPUS_WORKER':'seo-corpus-worker','SEO_CORPUS_INDEPENDENT_QA':'seo-corpus-qa','SEO_CORPUS_TRIBUNAL':'seo-corpus-tribunal'})[role],
 oidc_token_sha256:crypto.createHash('sha256').update(String(id)).digest('hex'),
 oidc_subject_sha256:crypto.createHash('sha256').update('test-sub').digest('hex'),
 workload_oidc_verified:true,provider_job_verified:true,github_job_id:id,github_run_id:123,
 individual_agent_iam_verified:false,can_write_prod:false});
const tmp=t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seo-corpus-v1-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return path.join(dir,'journal.v8');};
test('frozen canonical corpus is consumed without network, 200 records, 10 nonduplicate chunks',()=>{
 const c=loadFrozenSeoCorpus(),e=calculateCorpusEvidence(c),roles=expectedSeoRoleEvidence(c);
 assert.equal(c.documents.length,200);assert.equal(c.parts.length,10);
 assert.equal(e.source_documents,200);assert.equal(roles.length,141);
 assert.equal(new Set(roles.map(x=>x.role_id)).size,141);
 assert.ok(e.image_tags_found>=0);assert.ok(e.pages_with_extracted_copy>0);
 assert.equal(c.wordpress_reaudited,false);
 assert.equal(roles.filter(x=>x.department_id==='SEO-D29').every(x=>x.claims_about_rankings===null),true);
 assert.equal(roles.filter(x=>x.department_id==='SEO-D30').every(x=>x.source_limitations.length>0),true);
});
test('JOB-001 records 141 real snapshot-derived receipts, distinct Github QA and tribunal recheck',t=>{
 const file=tmp(t),workerId=makeIdentity('SEO_CORPUS_WORKER',101),
 qaId=makeIdentity('SEO_CORPUS_INDEPENDENT_QA',102),
 tribunalId=makeIdentity('SEO_CORPUS_TRIBUNAL',103);
 const w=executeSeoCorpusWork({journal_path:file,identity:workerId});
 assert.equal(w.status,'READONLY_CORPUS_WORK_EXECUTED_HOST_AUTHENTICATED');
 assert.equal(w.role_work_receipts.length,141);
 assert.equal(w.completed_in_run,141);assert.equal(w.actual_iam_specialists,0);
 assert.equal(w.independent_qa_passed,false);assert.equal(w.web_mutations,0);
 const q=reviewSeoCorpusWork({worker:w,identity:qaId});
 assert.equal(q.rechecked_every_competency,true);
 const j=tribunalSeoCorpusWork({worker:w,qa:q,identity:tribunalId});
 assert.equal(j.status,'CORPUS_REAL_WORK_VERIFIED_NO_PROD_PROMOTION');
 assert.equal(j.role_evidence_accepted,141);assert.equal(j.certified_prod_departments,0);
 const again=executeSeoCorpusWork({journal_path:file,identity:workerId});
 assert.equal(again.newly_queued,0);assert.equal(again.duplicates,141);
 assert.equal(again.completed_in_run,0);
});
test('tampered reports, same-job reviewer, fake agent certifications and wrong scope denied',t=>{
 const w=executeSeoCorpusWork({journal_path:tmp(t),identity:makeIdentity('SEO_CORPUS_WORKER',201)});
 const wrong={...w,role_work_receipts:[...w.role_work_receipts]};
 wrong.role_work_receipts[0]={...wrong.role_work_receipts[0],competency:'invented'};
 assert.throws(()=>reviewSeoCorpusWork({worker:wrong,identity:makeIdentity('SEO_CORPUS_INDEPENDENT_QA',202)}),/RECOMPUTE_MISMATCH/);
 assert.throws(()=>reviewSeoCorpusWork({worker:w,identity:makeIdentity('SEO_CORPUS_INDEPENDENT_QA',201)}),/RECEIPT_INVALID/);
 assert.throws(()=>executeSeoCorpusWork({journal_path:'/tmp/none',identity:makeIdentity('SEO_CORPUS_TRIBUNAL',201)}),/HOST_IDENTITY/);
 const q=reviewSeoCorpusWork({worker:w,identity:makeIdentity('SEO_CORPUS_INDEPENDENT_QA',202)});
 assert.throws(()=>tribunalSeoCorpusWork({worker:w,qa:q,identity:makeIdentity('SEO_CORPUS_TRIBUNAL',202)}),/TRIBUNAL_IDENTITY/);
});
test('JWT signed with valid asymmetric RSA key required; wrong audience/sha/signature rejected',()=>{
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const now=Math.floor(Date.now()/1000),env={GITHUB_RUN_ID:'1009',GITHUB_RUN_ATTEMPT:'1',
 GITHUB_SHA:'a'.repeat(40),GITHUB_REF:'refs/pull/22/merge'};
 const payload={iss:'https://token.actions.githubusercontent.com',
 aud:'cerebro-seo-corpus-workload-lab-v1',iat:now,exp:now+480,
 repository:'carlosjmunoz78/fenix-capital-inmo-map',repository_owner:'carlosjmunoz78',
 event_name:'pull_request',workflow:'CEREBRO SEO Corpus Workforce Identity V1',
 run_id:env.GITHUB_RUN_ID,run_attempt:env.GITHUB_RUN_ATTEMPT,sha:env.GITHUB_SHA,ref:env.GITHUB_REF,
 sub:'repo:carlosjmunoz78/fenix-capital-inmo-map:pull_request'};
 const header=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT',kid:'unit-test'})).toString('base64url');
 const sign=obj=>{const body=Buffer.from(JSON.stringify(obj)).toString('base64url');
 const content=header+'.'+body;const sig=crypto.sign('RSA-SHA256',Buffer.from(content),privateKey).toString('base64url');return content+'.'+sig};
 const jwk={...publicKey.export({format:'jwk'}),kid:'unit-test',use:'sig',alg:'RS256'};
 const good=sign(payload),jwks={keys:[jwk]};
 assert.equal(verifyJwtSignedByGithub({jwt:good,jwks,env,nowSeconds:now}).verified,true);
 assert.throws(()=>verifyJwtSignedByGithub({jwt:sign({...payload,aud:'wrong'}),jwks,env,nowSeconds:now}),/JWT_ISSUER_AUDIENCE/);
 assert.throws(()=>verifyJwtSignedByGithub({jwt:sign({...payload,sha:'b'.repeat(40)}),jwks,env,nowSeconds:now}),/JWT_CLAIM_SHA/);
 const altered=good.slice(0,-3)+'aaa';
 assert.throws(()=>verifyJwtSignedByGithub({jwt:altered,jwks,env,nowSeconds:now}),/JWT_SIGNATURE/);
});

test('signed provider workload passes through existing ACTGW-001 to durable JOB-001, not merely a helper',async t=>{
 const p=makeIdentity('SEO_CORPUS_WORKER',301);
 p.github_run_id=42106140949;
 const result=await executeSeoCorpusViaGateway({journal_path:tmp(t),identity:p});
 assert.equal(result.gateway_receipt.gateway_id,'ACTGW-001');
 assert.equal(result.gateway_receipt.status,'ACTION_EXECUTED');
 assert.equal(result.gateway_receipt.audit_events,1);
 assert.equal(result.completed_in_run,141);
 assert.equal(result.web_mutations,0);
 assert.equal(result.prod_authorized,false);
});

test('141 non-bearer Ed25519 read-only role proofs are individually scoped and tamper-resistant',()=>{
 const c=loadFrozenSeoCorpus(), evidence=expectedSeoRoleEvidence(c),host=makeIdentity('SEO_CORPUS_WORKER',501);
 const now=Date.now();
 const issued=issueSeoRoleProofs({host,role_work_receipts:evidence,corpus_digest:c.corpus_digest,now_ms:now});
 const report=verifySeoRoleProofs({bundle:issued,role_work_receipts:evidence,
  corpus_digest:c.corpus_digest,host_identity:host,at_issue_time:true});
 assert.equal(report.verified_roles,141);assert.equal(report.bearer_credentials_created,0);
 assert.equal(issued.keys_persisted,false);
 assert.equal(issued.role_proofs[0].payload.can_publish,false);
 assert.equal(verifyOneSeoRoleProof({proof:issued.role_proofs[0],public_key_pem:issued.public_key_pem,
  evidence:evidence[0],host_identity:host,corpus_digest:c.corpus_digest,now_ms:now}).decision,'SIGNED_READONLY_WORK_UNIT_PERMITTED');
 const altered=structuredClone(issued);
 altered.role_proofs[0].payload.can_write_prod=true;
 assert.throws(()=>verifySeoRoleProofs({bundle:altered,role_work_receipts:evidence,
   corpus_digest:c.corpus_digest,host_identity:host}),/SCOPE_OR_WORK_MISMATCH/);
 assert.throws(()=>verifyOneSeoRoleProof({proof:issued.role_proofs[0],public_key_pem:issued.public_key_pem,
  evidence:evidence[1],host_identity:host,corpus_digest:c.corpus_digest,now_ms:now}),/ROLE_CALL_DENIED/);
 assert.throws(()=>verifyOneSeoRoleProof({proof:issued.role_proofs[0],public_key_pem:issued.public_key_pem,
  evidence:evidence[0],host_identity:host,corpus_digest:c.corpus_digest,now_ms:now+601000}),/ROLE_CALL_DENIED/);
 assert.throws(()=>issueSeoRoleProofs({host:makeIdentity('SEO_CORPUS_INDEPENDENT_QA',502),
  role_work_receipts:evidence,corpus_digest:c.corpus_digest}),/UNVERIFIED_HOST/);
});
test('423 individualized practical SEO exercises are grounded in 200 URLs, not fake training passes',()=>{
 const corpus=loadFrozenSeoCorpus(),evidence=expectedSeoRoleEvidence(corpus);
 const prepared=createSeoCurriculumCases({corpus,evidence});
 assert.equal(prepared.cases.length,423);assert.equal(prepared.actual_exam_attempts,0);
 assert.equal(prepared.prod_certifications,0);
 assert.equal(prepared.cases.filter(x=>x.round_id==='SOURCE_APPLICATION').length,141);
 assert.equal(prepared.cases.filter(x=>x.round_id==='EVIDENCE_GAP').length,141);
 assert.equal(prepared.cases.filter(x=>x.round_id==='SAFE_OPTIMIZATION').length,141);
 assert.equal(new Set(prepared.cases.map(x=>x.case_id)).size,423);
 for(const e of evidence){
  const ids=prepared.cases.filter(x=>x.role_id===e.role_id);
  assert.equal(ids.length,3);assert.equal(new Set(ids.map(x=>x.required_evidence.document_id)).size,3);
  assert.equal(ids.every(x=>x.actor_attempt_submitted===false&&x.real_training_certified===false),true);
 }
 assert.equal(verifySeoCurriculumCases({prepared,corpus,evidence}).cases,423);
 const tampered=structuredClone(prepared);tampered.cases[0].required_evidence.title='PROMOCION FALSA';
 assert.throws(()=>verifySeoCurriculumCases({prepared:tampered,corpus,evidence}),/INDEPENDENT_RECOMPUTE_FAILED/);
});
test('corpus worker now supplies 141 signatures and 423 source-grounded exam fixtures for independent QA',t=>{
 const worker=executeSeoCorpusWork({journal_path:tmp(t),identity:makeIdentity('SEO_CORPUS_WORKER',701)});
 assert.equal(worker.scoped_role_proofs_verified_at_execution,141);
 assert.equal(worker.role_scope_bundle.role_proofs.length,141);
 assert.equal(worker.training_exercises.cases.length,423);
 assert.equal(worker.training_exam_attempts_recorded,0);
 const qa=reviewSeoCorpusWork({worker,identity:makeIdentity('SEO_CORPUS_INDEPENDENT_QA',702)});
 assert.equal(qa.signed_role_scopes_independently_verified,141);
 assert.equal(qa.practice_cases_independently_verified,423);
 const judge=tribunalSeoCorpusWork({worker,qa,identity:makeIdentity('SEO_CORPUS_TRIBUNAL',703)});
 assert.equal(judge.scope_proofs_signed_and_verified,141);
 assert.equal(judge.training_exercises_prepared_and_verified,423);
 assert.equal(judge.actual_specialist_training_certified,0);
});

test('all 141 specialties produce source-specific, scoped and reversible SEO proposals; 200 existing URL actions',()=>{
 const corpus=loadFrozenSeoCorpus(),e=expectedSeoRoleEvidence(corpus);
 const p=createSeoSpecialistWorkProducts({corpus,evidence:e});
 assert.equal(p.status,'SEO_CORPUS_200_URL_ACTION_QUEUE_AND_141_SPECIALIZED_WORK_PRODUCTS');
 assert.equal(p.url_action_queue.length,200);
 assert.equal(p.role_products.length,141);
 assert.equal(new Set(p.url_action_queue.map(x=>x.post_id)).size,200);
 assert.equal(new Set(p.role_products.map(x=>x.role_id)).size,141);
 assert.equal(new Set(p.role_products.map(x=>x.department_id)).size,32);
 assert.equal(new Set(p.role_products.map(x=>x.action.mode)).size,32);
 assert.equal(p.no_site_reaudit,true);assert.equal(p.site_mutations,0);
 assert.equal(p.all_are_readonly_proposals,true);
 for(const r of p.role_products){
   assert.ok(r.evidence.copy_sha256.length===64);
   assert.ok(r.action.requested_work.length>30);
   assert.equal(r.action.publish,false);
   assert.equal(r.user_approved_strategy,false);
   assert.equal(r.complete_specialty_reasoning,false);
   assert.equal(r.real_agent_execution_certified,false);
   assert.ok(['EVIDENCE_DEPENDENCY_REQUIRED','REVIEWABLE_DETERMINISTIC_DRAFT'].includes(r.status));
 }
 assert.equal(independentlyReviewSeoWorkProducts({work_products:p,corpus,evidence:e}).role_products,141);
});
test('tampering, fabricated publication and changing source are independently rejected',()=>{
 const corpus=loadFrozenSeoCorpus(),e=expectedSeoRoleEvidence(corpus);
 const p=createSeoSpecialistWorkProducts({corpus,evidence:e});
 const copy=structuredClone(p);copy.role_products[0].action.publish=true;
 assert.throws(()=>independentlyReviewSeoWorkProducts({work_products:copy,corpus,evidence:e}),/INDEPENDENT_RECOMPUTE_MISMATCH/);
 const changed=structuredClone(p);changed.url_action_queue[0].url='https://random.invalid/';
 assert.throws(()=>independentlyReviewSeoWorkProducts({work_products:changed,corpus,evidence:e}),/INDEPENDENT_RECOMPUTE_MISMATCH/);
 assert.throws(()=>createSeoSpecialistWorkProducts({corpus,evidence:e.slice(0,140)}),/CORPUS_REQUIRED/);
});
test('worker QA tribunal verify real 141 work products and 200 URL queue, without real autonomous certification',t=>{
 const worker=executeSeoCorpusWork({journal_path:tmp(t),identity:makeIdentity('SEO_CORPUS_WORKER',801)});
 assert.equal(worker.work_products.role_products.length,141);
 assert.equal(worker.work_products.url_action_queue.length,200);
 assert.equal(worker.specialized_work_products_prepared,141);
 const qa=reviewSeoCorpusWork({worker,identity:makeIdentity('SEO_CORPUS_INDEPENDENT_QA',802)});
 assert.equal(qa.specialist_work_products_independently_verified,141);
 assert.equal(qa.existing_urls_in_prioritized_backlog,200);
 const tribunal=tribunalSeoCorpusWork({worker,qa,identity:makeIdentity('SEO_CORPUS_TRIBUNAL',803)});
 assert.equal(tribunal.specialist_work_products_verified,141);
 assert.equal(tribunal.existing_urls_prioritized,200);
 assert.equal(tribunal.stored_only_strategy_drafts_not_published,true);
 assert.equal(tribunal.certified_prod_departments,0);
});

test('423 deterministic specialist practice responses are actually executed against 3 URL cases per role and independently checked',()=>{
 const corpus=loadFrozenSeoCorpus(),e=expectedSeoRoleEvidence(corpus);
 const c=createSeoCurriculumCases({corpus,evidence:e});
 const w=createSeoSpecialistWorkProducts({corpus,evidence:e});
 const a=runSeoDeterministicPractice({corpus,casebook:c,work_products:w});
 assert.equal(a.attempts.length,423);
 assert.equal(a.machine_generated_practice_responses,423);
 assert.equal(new Set(a.attempts.map(x=>x.role_id)).size,141);
 assert.equal(a.authenticated_individual_agent_submissions,0);
 assert.equal(a.professional_exams_passed,0);
 assert.equal(a.role_certifications,0);
 assert.equal(a.attempts.filter(x=>x.round_id==='EVIDENCE_GAP').length,141);
 assert.equal(a.attempts.every(x=>x.grade===null&&!x.prod_permissions_granted&&x.source_copy_sha256.length===64),true);
 assert.equal(validateSeoDeterministicPractice({submitted:a,corpus,casebook:c,work_products:w}).cases,423);
 const modified=structuredClone(a);modified.attempts[0].source_observations.wordpress_title='FAKE';
 assert.throws(()=>validateSeoDeterministicPractice({submitted:modified,corpus,casebook:c,work_products:w}),/INDEPENDENT_RECOMPUTE_FAILED/);
});
test('real JOB-001 OIDC worker QA and tribunal include separate deterministic exercises with no training claims',t=>{
 const w=executeSeoCorpusWork({journal_path:tmp(t),identity:makeIdentity('SEO_CORPUS_WORKER',851)});
 assert.equal(w.deterministic_role_practice_responses_executed,423);
 assert.equal(w.practice_responses.attempts.length,423);
 assert.equal(w.authenticated_individual_agent_exam_attempts,0);
 const q=reviewSeoCorpusWork({worker:w,identity:makeIdentity('SEO_CORPUS_INDEPENDENT_QA',852)});
 assert.equal(q.deterministic_practice_responses_independently_verified,423);
 const j=tribunalSeoCorpusWork({worker:w,qa:q,identity:makeIdentity('SEO_CORPUS_TRIBUNAL',853)});
 assert.equal(j.deterministic_practice_responses_verified,423);
 assert.equal(j.individual_agent_exams_completed,0);
});

test('LAB editorial writer respects keyword overlap hold and retains persona-specific funnel requirements',()=>{
 const corpus=loadFrozenSeoCorpus(),evidence=expectedSeoRoleEvidence(corpus);
 const all=createSeoSpecialistWorkProducts({corpus,evidence});
 const bundle=createSeoEditorialWriteBundle({corpus,work_products:all});
 assert.equal(bundle.drafts.length,20);
 assert.equal(bundle.keyword_overlap_candidates_held,1);
 assert.equal(bundle.funnel_blueprints_defined,8);
 assert.equal(bundle.existing_urls_preserved,true);
 assert.equal(bundle.drafts.every(d=>d.strategic_owner&&
  d.strategic_owner.forms_and_magnet_not_proven_connected&&
  d.keyword_exact_collision_blocked&&d.image_import_requires_verified_asset_qa&&
  d.future_new_image_provider==='CREATIVE-PROGRAMMATIC-RENDER-V1'),true);
 assert.equal(bundle.drafts.some(d=>d.existing_url==='https://fenixcapital.es/'),false);
 assert.equal(bundle.drafts.some(d=>d.existing_url==='https://fenixcapital.es/inicio/'),false);
 assert.equal(bundle.drafts.every(d=>d.can_publish===false),true);
});

test('safe LAB writer creates 20 real editorial files, idempotently replays and physically rolls back canary',async t=>{
 const w=executeSeoCorpusWork({journal_path:tmp(t),identity:makeIdentity('SEO_CORPUS_WORKER',901)});
 const q=reviewSeoCorpusWork({worker:w,identity:makeIdentity('SEO_CORPUS_INDEPENDENT_QA',902)});
 const tri=tribunalSeoCorpusWork({worker:w,qa:q,identity:makeIdentity('SEO_CORPUS_TRIBUNAL',903)});
 const writer={...makeIdentity('SEO_CORPUS_WORKER',904),
  role:'SEO_SANDBOX_DRAFT_WRITER',github_job_name:'seo-corpus-sandbox-writer'};
 const root=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'seo-write-test-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const actual=await executeSeoSandboxWrite({worker:w,qa:q,tribunal:tri,identity:writer,output_root:root});
 assert.equal(actual.status,'REAL_SANDBOX_DRAFT_WRITE_COMPLETED');
 assert.equal(actual.editorial_drafts,20);
 assert.equal(actual.file_count,21);
 assert.equal(actual.wordpress_writes,0);assert.equal(actual.prod_authorized,false);
 assert.equal(actual.rollback_canary_verified,true);
 const bundle=createSeoEditorialWriteBundle({
  corpus:loadFrozenSeoCorpus(),work_products:w.work_products});
 assert.equal(bundle.drafts.every(x=>x.can_publish===false&&x.can_change_existing_url===false),true);
 const again=physicallyWriteSeoDrafts({output_root:root,bundle});
 assert.equal(again.state,'ALREADY_WRITTEN_IDEMPOTENT');
 const files=fs.readdirSync(path.join(root,'seo-editorial-draft-bundle-v1'));
 assert.equal(files.length,21);
 assert.equal(proveSeoDraftRollback({output_root:root}).created_file_removed,true);
 const first=path.join(root,'seo-editorial-draft-bundle-v1',files.find(x=>x.startsWith('draft-')));
 fs.appendFileSync(first,'UNEXPECTED_MODIFICATION');
 assert.throws(()=>physicallyWriteSeoDrafts({output_root:root,bundle}),/IDEMPOTENCY_CONTENT_CONFLICT/);
});
test('write IAM, QA, no-PROD and sandbox path guards fail closed',async t=>{
 const w=executeSeoCorpusWork({journal_path:tmp(t),identity:makeIdentity('SEO_CORPUS_WORKER',951)});
 const q=reviewSeoCorpusWork({worker:w,identity:makeIdentity('SEO_CORPUS_INDEPENDENT_QA',952)});
 const tri=tribunalSeoCorpusWork({worker:w,qa:q,identity:makeIdentity('SEO_CORPUS_TRIBUNAL',953)});
 const writer={...makeIdentity('SEO_CORPUS_WORKER',954),role:'SEO_SANDBOX_DRAFT_WRITER',
  github_job_name:'seo-corpus-sandbox-writer'};
 const root=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'seo-write-deny-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 await assert.rejects(()=>executeSeoSandboxWrite({worker:w,qa:q,tribunal:tri,
   identity:makeIdentity('SEO_CORPUS_WORKER',954),output_root:root}),/IAM_DENY/);
 await assert.rejects(()=>executeSeoSandboxWrite({worker:w,qa:q,
   tribunal:{...tri,decision:'ALLOW_PRODUCTION'},identity:writer,output_root:root}),/QA_TRIBUNAL_DENIED/);
 const bundle=createSeoEditorialWriteBundle({corpus:loadFrozenSeoCorpus(),work_products:w.work_products});
 assert.throws(()=>physicallyWriteSeoDrafts({output_root:'/home',bundle}),/OUTSIDE_TEMP/);
 const changed=structuredClone(bundle);changed.wordpress_write_permission=true;
 assert.throws(()=>physicallyWriteSeoDrafts({output_root:root,bundle:changed}),/SCOPE_DENIED/);
});

test('official Cowboy WordPress bridge only produces create_post draft dry-run and never publish',()=>{
 const corpus=loadFrozenSeoCorpus(),evidence=expectedSeoRoleEvidence(corpus);
 const work=createSeoSpecialistWorkProducts({corpus,evidence});
 const bundle=createSeoEditorialWriteBundle({corpus,work_products:work});
 const plan=planOfficialWordPressDraftDryRun({draft:bundle.drafts[0]});
 assert.equal(plan.bridge_provider,'Cowboy_MCP_web');
 assert.equal(plan.bridge_tool,'wp_create_post');
 assert.equal(plan.tool_arguments.status,'draft');
 assert.equal(plan.tool_arguments.post_type,'post');
 assert.equal(plan.tool_arguments.dry_run,true);
 assert.equal(plan.operation_mutates_wordpress,false);
 assert.equal(plan.live_action_authorized,false);
 assert.equal(plan.page_update_capability,false);
 assert.equal(plan.publish_capability,false);
 const block=rejectUnauthorizedWordPressCommit({plan,iam:{verified:false}});
 assert.equal(block.status,'HUMAN_REQUIRED');
 assert.equal(block.executed,false);
 assert.equal(block.wordpress_posts_created,0);
 assert.equal(rejectUnauthorizedWordPressCommit({
   plan,iam:{verified:true},backup:{physical_restore_verified:true},
   qa:{ymyl_editorial_approved:true},tribunal:{independent_approved:true}
 }).executed,false);
 assert.throws(()=>denyWordPressPublish(),/PUBLISH_IS_NOT_AUTHORIZED/);
 assert.throws(()=>denyWordPressExistingPageUpdate(),/PAGE_UPDATE_IS_NOT_AUTHORIZED/);
});
test('WordPress bridge rejects forged draft scope and never accepts dry_run false',()=>{
 const corpus=loadFrozenSeoCorpus(),work=createSeoSpecialistWorkProducts({
  corpus,evidence:expectedSeoRoleEvidence(corpus)});
 const draft=createSeoEditorialWriteBundle({corpus,work_products:work}).drafts[0];
 assert.throws(()=>planOfficialWordPressDraftDryRun({draft:{...draft,can_publish:true}}),/UNAPPROVED_DRAFT/);
 assert.throws(()=>rejectUnauthorizedWordPressCommit({plan:{
  bridge_tool:'wp_create_post',tool_arguments:{status:'publish',dry_run:false},operation_mutates_wordpress:true
 }}),/INVALID_PLAN/);
});
