/** D05 · Dedicated GitHub OIDC workload + role-bound signed three-case training evidence.
 * REAL provider job, NOT an independently provisioned agent IAM account or an exam pass.
 * No live web, staging, customer data, LLM usage, publication or PROD authority.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
import {loadFrozenSeoCorpus,expectedSeoRoleEvidence} from './seo-corpus-job001-work-v1.mjs';
import {createSeoCurriculumCases} from './seo-specialist-exercise-engine-v1.mjs';
import {getSeoDepartmentKnowledge} from './seo-specialist-workforce-v2.mjs';
import {seoStagingSuspensionStatus} from './seo-staging-suspension-v1.mjs';
import {verifyPriorSeoJob} from './seo-gh-oidc-workload-v1.mjs';
const ROLE='SEO-D05:SPECIALIST:01';
const PRINCIPAL='iam:seo001:d05:specialist01:github-oidc-job';
const POLICY=new URL('../registry/seo-d05-actor-oidc-policy-v1.json',import.meta.url);
const ROLES={actor:['SEO_D05_SPECIALIST_01_READONLY','seo-d05-actor'],qa:['SEO_CORPUS_INDEPENDENT_QA','seo-corpus-qa'],d32:['SEO_D32_TRAINING_REVIEW','seo-d05-d32'],tribunal:['SEO_CORPUS_TRIBUNAL','seo-corpus-tribunal']};
const ctx={company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0'};
const sha=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const no=x=>{throw Error('SEO_D05_ACTOR_'+x)};
const objHash=x=>sha(Object.fromEntries(Object.entries(x).filter(([k])=>k!=='receipt_sha256')));
export function loadActorPolicy(){return JSON.parse(fs.readFileSync(POLICY,'utf8'))}
function policyOK(p){
 if(p?.principal_id!==PRINCIPAL||p.role_id!==ROLE||p.environment!=='PREPROD'||
  p.provider!=='github-actions-oidc'||p.activation_state!=='ENABLED_READONLY_SHADOW'||
  p.revoked!==false||p.revocation_revision!==0||p.allow_publication!==false||
  p.allow_prod!==false||p.allow_spend!==false||p.allow_app_crm_writes!==false||
  p.allow_live_wp_fetch!==false||p.deny_staging!==true||p.allow_external_network!==false||
  p.external_agent_account_created!==false||p.independent_agent_iam_certified!==false||
  p.actor_job_name!=='seo-d05-actor'||p.role_provider_name!==ROLES.actor[0]||
  p.workflow_path!=='.github/workflows/cerebro-seo-corpus-workload-v1.yml')no('PRINCIPAL_REVOKED_OR_UNSCOPED');
 return p;
}
export function requireDedicatedHost(id,kind,policy=loadActorPolicy()){
 policyOK(policy);
 const role=ROLES[kind];
 if(!role||id?.status!=='GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED'||id.role!==role[0]||
  id.github_job_name!==role[1]||id.company_id!=='fenix'||id.engine_id!=='SEO-001'||
  id.environment!=='PREPROD'||id.workflow_path!==policy.workflow_path||
  id.provider_job_verified!==true||id.workload_oidc_verified!==true||
  id.individual_agent_iam_verified!==false||id.can_write_prod!==false||
  id.can_publish!==false||id.can_grant_permissions!==false||id.cost_added_eur!==0||
  !Number.isSafeInteger(id.github_run_id)||!Number.isSafeInteger(id.github_job_id)||
  !/^[a-f0-9]{64}$/.test(id.oidc_token_sha256||''))no('OIDC_JOB_INVALID');
 return id;
}
function separate(...ids){
 if(new Set(ids.map(x=>x.github_run_id)).size!==1||
  new Set(ids.map(x=>x.github_job_id)).size!==ids.length||
  new Set(ids.map(x=>x.oidc_token_sha256)).size!==ids.length||
  new Set(ids.map(x=>x.github_job_name)).size!==ids.length)no('NOT_INDEPENDENT_JOBS');
}
function basis(){
 if(seoStagingSuspensionStatus()?.staging_off!==true)no('STAGING_NOT_OFF');
 const c=loadFrozenSeoCorpus();
 const lessons=createSeoCurriculumCases({corpus:c,evidence:expectedSeoRoleEvidence(c)});
 const cases=lessons.cases.filter(x=>x.role_id===ROLE),pack=getSeoDepartmentKnowledge('SEO-D05');
 if(cases.length!==3||new Set(cases.map(x=>x.required_evidence.document_id)).size!==3||
  !pack.workforce.subagents.some(x=>x.role_id===ROLE&&x.iam_principal_id===null))
   no('SOURCE_OR_ROLE_DRIFT');
 return {corpus:c,cases,pack};
}
function expected({caseRef,doc,id,job_id,issued_ms}){
 const e=caseRef.required_evidence;
 if(!doc||doc.post_id!==e.document_id||doc.url!==e.url||sha(doc.copy_text)!==e.source_copy_sha256)
   no('SOURCE_DIGEST_INVALID');
 return {kind:'D05_SIGNED_SOURCE_BOUND_TRAINING_WORK_V1',company_id:'fenix',
  engine_id:'SEO-001',environment:'PREPROD',principal_id:PRINCIPAL,role_id:ROLE,
  host_job_id:id.github_job_id,host_run_id:id.github_run_id,
  oidc_sha256:id.oidc_token_sha256,job_id,issued_ms,
  case_id:caseRef.case_id,round_id:caseRef.round_id,
  corpus_sha256:caseRef.source_digest,post_id:doc.post_id,url:doc.url,
  copy_sha256:e.source_copy_sha256,
  evidence:{title:doc.title,focus_keyword:doc.yoast?.focus_keyword||null,
   stored_h1:doc.headings.filter(x=>x.level===1).map(x=>x.text).slice(0,3),
   internal_links_count:doc.internal_links.length,images_count:doc.images.length,
   meta_description_present:Boolean(doc.yoast?.description)},
  proposed_work:{
   observed:'Título, URL, encabezados y keyword proceden exclusivamente del WordPress guardado; no confirman rendimiento en Google.',
   audience_intent:'Distinguir la intención de búsqueda de la fuente antes de asignarla a una nueva URL.',
   next_step:caseRef.round_id==='SOURCE_APPLICATION'?
     'Preparar matriz keyword→intención→URL y contrastar solapamiento con D08 sin alterar URL existente.':
    caseRef.round_id==='EVIDENCE_GAP'?
     'Solicitar evidencia real de GSC y SERP para contrastar hipótesis, sin inventar tráfico, CPC ni volúmenes.':
     'Proponer mejora editorial reversible y medible, con revisión independiente y sin editar WordPress.',
   source_limitations:['NO_LIVE_SERP','NO_GSC','NO_SEMANTIC_EXPERT_GRADE','NO_PROD'],
   preserve_existing_url:true,publish:false},
  author_type:'PROVIDER_OIDC_DEDICATED_DETERMINISTIC_WORKLOAD_NOT_INDEPENDENT_AGENT_IAM',
  professional_exam_passed:false,real_agent_account_created:false,
  site_writes:0,external_requests:0,cost_eur:0};
}
export function runD05SignedExercises({identity,journal_path,now_ms=Date.now(),policy=loadActorPolicy()}={}){
 requireDedicatedHost(identity,'actor',policy);
 if(!path.isAbsolute(journal_path||'')||
  ![os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).some(x=>path.resolve(journal_path).startsWith(path.resolve(x)+path.sep)))
    no('JOURNAL_SCOPE');
 const {corpus,cases}=basis(),j=new DurableJobRuntimeV1({file_path:journal_path});
 const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519');
 const public_key_pem=publicKey.export({format:'pem',type:'spki'}).toString();
 const submissions=[],jobs=[];
 for(let i=0;i<3;i++){
  const ref=cases[i],item=j.enqueue({name:'SEO_D05_ROLE_SCOPED_TRAINING_SUBMISSION',context:ctx,
   idempotency_key:'d05:'+identity.github_run_id+':'+ref.case_id,now_ms:now_ms+i*10,
   max_attempts:1,payload:{case_id:ref.case_id,source:corpus.corpus_digest,publish:false,cost_eur:0}});
  if(!item.accepted)no('JOB_DUPLICATE');
  const job=j.claim({context:ctx,worker_id:'D05_GITHUB_OIDC',now_ms:now_ms+i*10+1,lease_ms:10000});
  if(!job||job.job_id!==item.job.job_id)no('JOB_CLAIM');
  const doc=corpus.documents.find(x=>x.post_id===ref.required_evidence.document_id);
  const payload=expected({caseRef:ref,doc,id:identity,job_id:job.job_id,issued_ms:now_ms+i*10+1});
  const signature=crypto.sign(null,Buffer.from(JSON.stringify(payload)),privateKey).toString('base64url');
  j.complete({job_id:job.job_id,worker_id:'D05_GITHUB_OIDC',now_ms:now_ms+i*10+2,
   result:{source_sha256:sha(payload),signature_sha256:sha(signature),published:false}});
  submissions.push({payload,signature});jobs.push({job_id:job.job_id,status:'SUCCEEDED'});
 }
 if(j.listForContext(ctx).filter(x=>x.status==='SUCCEEDED').length!==3)no('JOB_NOT_COMPLETED');
 const out={status:'D05_THREE_SIGNED_PROVIDER_WORKLOAD_RESPONSES_NOT_PROFESSIONAL_EXAMS',
  principal_id:PRINCIPAL,role_id:ROLE,host_run_id:identity.github_run_id,
  host_job_id:identity.github_job_id,oidc_sha256:identity.oidc_token_sha256,
  source_digest:corpus.corpus_digest,public_key_pem,submissions,jobs,
  individual_agent_account_verified:false,semantic_exams_passed:0,
  external_requests:0,website_writes:0,added_cost_eur:0};
 const result={...out,receipt_sha256:objHash(out)};
 verifySignedD05({actor:result,identity,policy});
 return result;
}
export function verifySignedD05({actor,identity,policy=loadActorPolicy()}={}){
 requireDedicatedHost(identity,'actor',policy);
 if(actor?.status!=='D05_THREE_SIGNED_PROVIDER_WORKLOAD_RESPONSES_NOT_PROFESSIONAL_EXAMS'||
  actor.principal_id!==PRINCIPAL||actor.role_id!==ROLE||
  actor.host_run_id!==identity.github_run_id||actor.host_job_id!==identity.github_job_id||
  actor.oidc_sha256!==identity.oidc_token_sha256||actor.individual_agent_account_verified!==false||
  actor.semantic_exams_passed!==0||actor.external_requests!==0||actor.website_writes!==0||
  actor.added_cost_eur!==0||objHash(actor)!==actor.receipt_sha256||
  !Array.isArray(actor.submissions)||actor.submissions.length!==3||
  !Array.isArray(actor.jobs)||actor.jobs.length!==3)no('BUNDLE_INVALID');
 const {corpus,cases}=basis();
 if(actor.source_digest!==corpus.corpus_digest)no('SOURCE_CHANGED');
 let pub;try{pub=crypto.createPublicKey(actor.public_key_pem)}catch{no('KEY_INVALID')}
 if(pub.asymmetricKeyType!=='ed25519')no('KEY_TYPE');
 const unique=new Set();
 for(let i=0;i<3;i++){
  const {payload:p,signature}=actor.submissions[i],ref=cases[i],doc=corpus.documents.find(x=>x.post_id===ref.required_evidence.document_id);
  if(typeof p.job_id!=='string'||!/^job_[a-f0-9]{24}$/.test(p.job_id)||
   unique.has(p.job_id)||actor.jobs[i]?.job_id!==p.job_id||actor.jobs[i].status!=='SUCCEEDED'||
   !Number.isSafeInteger(p.issued_ms))no('JOB_INVALID');
  unique.add(p.job_id);
  if(JSON.stringify(p)!==JSON.stringify(expected({caseRef:ref,doc,id:identity,job_id:p.job_id,issued_ms:p.issued_ms})))
    no('CASE_MISMATCH');
  if(typeof signature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(signature)||
     !crypto.verify(null,Buffer.from(JSON.stringify(p)),pub,Buffer.from(signature,'base64url')))
     no('SIGNATURE_INVALID');
 }
 return {actor_oidc:true,signed_cases:3,source_sha256:corpus.corpus_digest,
  individual_agent_account_verified:false,semantic_exams_passed:0};
}
export function verifyD31({actor,actor_identity,qa_identity,policy=loadActorPolicy()}={}){
 requireDedicatedHost(qa_identity,'qa',policy);separate(actor_identity,qa_identity);
 const v=verifySignedD05({actor,identity:actor_identity,policy});
 const x={status:'D31_SIGNED_3_CASE_SOURCE_QA_NO_SEMANTIC_PASS',role_id:ROLE,
  actor_sha256:actor.receipt_sha256,source_sha256:v.source_sha256,actor_job_id:actor_identity.github_job_id,
  qa_job_id:qa_identity.github_job_id,qa_oidc_sha256:qa_identity.oidc_token_sha256,
  source_checks:3,signatures_verified:3,independent_review:true,
  semantic_professional_grade:null,actual_professional_exam_passes:0,
  individual_agent_iam_certified:false,site_writes:0};
 return {...x,receipt_sha256:objHash(x)};
}
export function createD32Feedback({actor,actor_identity,qa,qa_identity,d32_identity,policy=loadActorPolicy()}={}){
 requireDedicatedHost(d32_identity,'d32',policy);separate(actor_identity,qa_identity,d32_identity);
 if(JSON.stringify(qa)!==JSON.stringify(verifyD31({actor,actor_identity,qa_identity,policy})))no('D31_TAMPERED');
 const x={status:'D32_THREE_OIDC_TRAINING_SAMPLES_REVIEWED_NOT_CERTIFIED',
  role_id:ROLE,actor_sha256:actor.receipt_sha256,d31_sha256:qa.receipt_sha256,
  d32_job_id:d32_identity.github_job_id,d32_oidc_sha256:d32_identity.oidc_token_sha256,
  exercises:actor.submissions.map(x=>({case_id:x.payload.case_id,round_id:x.payload.round_id,
    feedback:'Comprobar la intención con fuentes externas fechadas y revisión especializada; preservar la URL sin publicación.',
    next_gate:'REAL_AGENT_ACCOUNT_AND_SEMANTIC_EXPERT_EXAM'})),
  authenticated_independent_agent:false,independent_professional_grade:null,
  training_certified:false,semantic_exams_passed:0,site_writes:0};
 return {...x,receipt_sha256:objHash(x)};
}
export function issueD05Tribunal({actor,actor_identity,qa,qa_identity,d32,d32_identity,tribunal_identity,policy=loadActorPolicy()}={}){
 requireDedicatedHost(tribunal_identity,'tribunal',policy);
 separate(actor_identity,qa_identity,d32_identity,tribunal_identity);
 if(JSON.stringify(d32)!==JSON.stringify(createD32Feedback({actor,actor_identity,qa,qa_identity,d32_identity,policy})))
   no('D32_TAMPERED');
 return {status:'D05_PROVIDER_WORKLOAD_PROVEN_BUT_AGENT_IAM_AND_EXPERT_CERT_HOLD',
  principal_id:PRINCIPAL,role_id:ROLE,independent_github_oidc_jobs:4,
  submitted_cases:3,source_and_crypto_qa_passed:3,
  professional_exam_passes:0,independent_agent_iam_accounts:0,
  certified_prod_departments:0,publish_authorized:false,
  release_decision:'HOLD_REAL_AGENT_IAM_AND_D31_D32_PROFESSIONAL_CERTIFICATION',
  staging_queries:0,website_writes:0,additional_subscriptions_eur:0};
}
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const write=(f,x)=>fs.writeFileSync(f,JSON.stringify(x,null,2)+'\n',{flag:'wx',mode:0o600});
async function cli(){
 const [stage,...a]=process.argv.slice(2);let out;
 if(stage==='actor'&&a.length===3){
  out=runD05SignedExercises({identity:read(a[0]),journal_path:path.resolve(a[1])});write(a[2],out);
 }else if(stage==='qa'&&a.length===4){
  await verifyPriorSeoJob({prior:read(a[1]),env:process.env});
  out=verifyD31({actor:read(a[0]),actor_identity:read(a[1]),qa_identity:read(a[2])});write(a[3],out);
 }else if(stage==='d32'&&a.length===6){
  for(const p of [a[1],a[3]])await verifyPriorSeoJob({prior:read(p),env:process.env});
  out=createD32Feedback({actor:read(a[0]),actor_identity:read(a[1]),qa:read(a[2]),qa_identity:read(a[3]),d32_identity:read(a[4])});write(a[5],out);
 }else if(stage==='tribunal'&&a.length===8){
  for(const p of [a[1],a[3],a[5]])await verifyPriorSeoJob({prior:read(p),env:process.env});
  out=issueD05Tribunal({actor:read(a[0]),actor_identity:read(a[1]),qa:read(a[2]),qa_identity:read(a[3]),d32:read(a[4]),d32_identity:read(a[5]),tribunal_identity:read(a[6])});write(a[7],out);
 }else no('CLI_ARGS');
 process.stdout.write(JSON.stringify({status:out.status,role_id:ROLE,real_agent_iam_accounts:0,professional_exams_passed:0,prod_writes:0})+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 cli().catch(e=>{process.stderr.write(String(e.message).slice(0,200)+'\n');process.exitCode=2});
}