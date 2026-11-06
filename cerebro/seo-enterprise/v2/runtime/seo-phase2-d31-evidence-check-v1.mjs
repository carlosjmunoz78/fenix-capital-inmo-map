#!/usr/bin/env node
/**
 * D31 first-pilot evidence review. Verifies the independently checked, pinned
 * source and handoff from a different GitHub Actions job. NOT semantic expert
 * judgment, autonomous agent IAM, or PROD release.
 * No web/LLM calls. Does not read secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadFrozenSeoCorpus} from './seo-corpus-job001-work-v1.mjs';
import {getSeoTrainingChallenge} from './seo-phase2-training-intake-v1.mjs';
const source=new URL('../training-pilots/SEO-D05-SPECIALIST-01-SOURCE_APPLICATION_2026-11-06.md',import.meta.url);
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const assert=(ok,code)=>{if(!ok)throw Error('SEO_D31_EVIDENCE_'+code)};
const ROLE='SEO-D05:SPECIALIST:01';
const CASE=ROLE+':EXAM:01';
const SOURCE_URL='https://fenixcapital.es/notario-espanol-vs-frances-ingles-compraventa/';

export function checkSeoPhase2PilotEvidence({pilot_receipt,answer_text}={}){
 assert(pilot_receipt&&typeof pilot_receipt==='object'&&!Array.isArray(pilot_receipt),'RECEIPT_REQUIRED');
 const answer=answer_text??fs.readFileSync(source,'utf8');
 assert(typeof answer==='string'&&answer.length>=500&&answer.length<=16000,'ANSWER_INVALID');
 assert(pilot_receipt.role_id===ROLE&&pilot_receipt.case_id===CASE&&
   pilot_receipt.post_id===1098&&pilot_receipt.answered_by==='CHATGPT_INTERACTIVE_ASSISTANT_NO_AGENT_IAM'&&
   pilot_receipt.status==='PROFESSIONAL_EXAMPLE_CAPTURED_JOB001_NOT_AGENT_TRAINED'&&
   pilot_receipt.distinct_agent_identity_authenticated===false&&
   pilot_receipt.qa_d31_passed===false&&pilot_receipt.d32_training_certified===false&&
   pilot_receipt.tribunal_accepted===false&&pilot_receipt.prod_departments_certified===0&&
   pilot_receipt.external_writes===0&&pilot_receipt.model_api_calls===0&&
   pilot_receipt.external_fetches===0,'RECEIPT_SCOPE');
 assert(digest(answer)===pilot_receipt.answer_sha256,'ANSWER_DIGEST_MISMATCH');
 const challenge=getSeoTrainingChallenge({role_id:ROLE,case_id:CASE});
 assert(challenge.challenge_sha256===pilot_receipt.challenge_sha256&&
   challenge.source_url===SOURCE_URL&&challenge.source_post_id===1098,'CHALLENGE_CHANGED');
 const corpus=loadFrozenSeoCorpus();
 assert(corpus.corpus_digest===challenge.accepted_corpus_digest&&
   corpus.wordpress_reaudited===false&&corpus.documents.length===200,'CORPUS_CHANGED');
 const doc=corpus.documents.find(d=>d.post_id===1098);
 assert(doc?.url===SOURCE_URL&&doc.source==='WP_AUTHENTICATED_GET_POST','DOCUMENT_CHANGED');
 const checks={
  cms_title:doc.title==='Notario en una compraventa de vivienda: qué revisa y quién paga'&&
    answer.includes('Notario en una compraventa de vivienda: qué revisa y quién paga'),
  cms_focus_keyword:doc.yoast?.focus_keyword==='notario compraventa vivienda'&&
    answer.includes('notario compraventa vivienda'),
  cms_canonical:doc.yoast?.canonical===SOURCE_URL&&answer.includes(SOURCE_URL),
  preserved_slug:SOURCE_URL.includes('notario-espanol-vs-frances-ingles-compraventa')&&
    answer.includes('notario-espanol-vs-frances-ingles-compraventa'),
  observed_internal_links:doc.internal_links.length===1&&
    answer.includes('Referencias de enlaces internos extraídas: 1'),
  observed_images:doc.images.length===0&&answer.includes('Imágenes del HTML extraído: 0'),
  no_unverified_serp_rankings:answer.includes('permanecen `UNKNOWN`')&&
    answer.includes('No se han consultado SERP'),
  no_unilateral_url_migration:answer.includes('No redireccionar ni renombrar')&&
    answer.includes('conservar'),
  no_agent_certification_claim:answer.includes('no creada por un agente autónomo autenticado')&&
    answer.includes('evaluación D31: **pendiente**'),
  source_heading_present:doc.headings.some(h=>h.text.includes('Qué hace el notario'))
 };
 assert(Object.values(checks).every(Boolean),'SOURCE_FIELDS_OR_POLICY_FAILED');
 const summary={
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',
  status:'D31_SEPARATE_JOB_SOURCE_FACTS_VERIFIED_NO_PROFESSIONAL_GRADE',
  reviewer_provenance:'SEPARATE_GITHUB_ACTIONS_JOB_NOT_INDEPENDENT_AGENT_IAM',
  owner_policy:'AUTHENTICATED_OWNER_ONLY',
  role_id:ROLE,case_id:CASE,job_id:pilot_receipt.journal_job_id,
  approved_corpus_digest:corpus.corpus_digest,
  source_url:SOURCE_URL,source_post_id:1098,
  answer_sha256:pilot_receipt.answer_sha256,
  challenge_sha256:challenge.challenge_sha256,
  objective_checks:checks,objective_checks_passed:Object.keys(checks).length,
  independent_source_recompute:true,
  external_web_requests:0,external_model_requests:0,
  action:'REQUEST_REAL_ACTOR_IAM_AND_PROFESSIONAL_SEMANTIC_ASSESSMENT',
  professional_semantic_grade:null,professional_qa_certified:false,
  agent_identity_authenticated:false,training_completed:false,
  tribunal_release_allowed:false,prod_certified_departments:0,
  published:false,external_writes:0,
  pending:['REAL_AGENT_IAM','INDEPENDENT_PROFESSIONAL_D31_REVIEW','D32_REAL_EXERCISES','TRIBUNAL','DURABLE_HOST_GATE']
 };
 return {...summary,receipt_sha256:digest(JSON.stringify(summary))};
}
async function cli(){
 const [from,to]=process.argv.slice(2);
 assert(typeof from==='string'&&typeof to==='string'&&from!==to&&
  !fs.existsSync(to),'OUTPUT_REQUIRED_NEW');
 const result=checkSeoPhase2PilotEvidence({pilot_receipt:JSON.parse(fs.readFileSync(from,'utf8'))});
 fs.writeFileSync(to,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({status:result.status,
  checks:result.objective_checks_passed,real_agents_certified:0,external_writes:0})+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 cli().catch(e=>{process.stderr.write(String(e.message).slice(0,240)+'\n');process.exitCode=1});
}
