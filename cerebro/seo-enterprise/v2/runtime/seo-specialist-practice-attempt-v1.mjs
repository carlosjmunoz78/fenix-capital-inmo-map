/**
 * D32 · Execute actual L0 deterministic practice for all 423 prepared cases.
 * Answers are grounded in existing stored copy, never an agent/LLM professional exam.
 * D31 independent QA recomputes; tribunal may accept source-integrity evidence only.
 */
import crypto from 'node:crypto';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const safeCase=c=>c&&c.case_prepared===true&&c.actor_attempt_submitted===false&&
 c.real_training_certified===false&&c.permission_granted===false&&
 c.source_digest&&c.required_evidence?.source_copy_sha256;
const evidenceFromCorpus=(corpus,id)=>{
 const d=corpus.documents.find(x=>x.post_id===id);
 if(!d)throw Error('SEO_PRACTICE_UNKNOWN_DOCUMENT');
 return {id:d.post_id,url:d.url,title:d.title,sha256:sha(d.copy_text),
  copy_length:d.copy_text.length,image_tags:d.images.length,
  missing_alts:d.images.filter(x=>!x.alt?.trim()).length,
  H1:d.headings.filter(x=>x.level===1).map(x=>x.text),
  link_count:d.internal_links.length,
  has_stored_yoast_desc:Boolean(d.yoast?.description)};
};
function responseFor(c,corpus,roleProposal){
 const f=evidenceFromCorpus(corpus,c.required_evidence.document_id);
 if(f.sha256!==c.required_evidence.source_copy_sha256||
  f.url!==c.required_evidence.url||f.title!==c.required_evidence.title)
  throw Error('SEO_PRACTICE_SOURCE_MISMATCH');
 if(roleProposal.role_id!==c.role_id||roleProposal.competency!==c.competency)
  throw Error('SEO_PRACTICE_ROLE_MISMATCH');
 const base={
  case_id:c.case_id,role_id:c.role_id,department_id:c.department_id,
  competency:c.competency,round_id:c.round_id,source_digest:corpus.corpus_digest,
  target_post_id:f.id,target_url:f.url,source_copy_sha256:f.sha256,
  source_observations:{wording: 'Campos recuperados de WordPress, no prueba del sitio renderizado',
   wordpress_title:f.title,stored_copy_characters:f.copy_length,
   images_referenced:f.image_tags,images_without_alt_in_stored_html:f.missing_alts,
   stored_H1:f.H1,stored_link_references:f.link_count,
   stored_yoast_description_present:f.has_stored_yoast_desc},
  proposed_work_type:roleProposal.action.mode,
  proposed_task:roleProposal.action.requested_work,
  role_specific_competency:roleProposal.competency,
  required_dependency:roleProposal.action.required_external_gate,
  source_limitations:c.missing_external_sources,
  evidence_policy:'NO_EXTERNAL_METRICS_AND_NO_PUBLISH',
  autonomous_execution_class:'DETERMINISTIC_ROLE_PRACTICE_L0',
  actual_authenticated_individual_agent:false,
  completion_of_subject_matter_examination:false,
  grade:null,awards:[],prod_permissions_granted:false,
  copy_or_image_modified:false,new_url_created:false
 };
 if(c.round_id==='SOURCE_APPLICATION')return {...base,
  task_response:'Tomar la URL existente y aplicar la competencia seleccionada sobre la evidencia conservada. El título y los datos de cabecera se citan como campos CMS, nunca como Google Search Console o estado de indexación.',
  expected_qa:['SOURCE_SHA_MATCH','COMPETENCY_ROLE_MATCH','CLAIMS_RESTRICTED_TO_SNAPSHOT']};
 if(c.round_id==='EVIDENCE_GAP')return {...base,
  task_response:'Separar hechos extraídos del CMS de datos externos desconocidos. No afirmar rankings, clics, conversiones, licencia de imágenes, aprobación bancaria o capacidad real de publicación sin fuente autorizada.',
  expected_qa:['EXTERNAL_DEPENDENCY_RECORDED','UNKNOWN_NOT_INVENTED','NO_SENSITIVE_CRM_DATA']};
 if(c.round_id==='SAFE_OPTIMIZATION')return {...base,
  task_response:'Preparar una propuesta de mejora aditiva y reversible; conservar URL y copy existente, exigir revisión D31 y tribunal antes de mutar sistemas.',
  expected_qa:['PRESERVE_EXISTING_URL','INDEPENDENT_REVIEW_REQUIRED','NO_PROD_MUTATION']};
 throw Error('SEO_PRACTICE_ROUND_INVALID');
}
export function runSeoDeterministicPractice({corpus,casebook,work_products}={}){
 if(corpus?.documents?.length!==200||casebook?.cases?.length!==423||
  work_products?.role_products?.length!==141||
  corpus.corpus_digest!==casebook.source_digest||
  corpus.corpus_digest!==work_products.source_snapshot_digest)
  throw Error('SEO_PRACTICE_INPUT_INVALID');
 const lookup=new Map(work_products.role_products.map(x=>[x.role_id,x]));
 const attempts=[],caseIds=new Set();
 for(const c of casebook.cases){
  if(!safeCase(c)||caseIds.has(c.case_id))throw Error('SEO_PRACTICE_CASE_INVALID');
  caseIds.add(c.case_id);
  const p=lookup.get(c.role_id);
  if(!p)throw Error('SEO_PRACTICE_ROLE_UNKNOWN');
  attempts.push(responseFor(c,corpus,p));
 }
 if(attempts.length!==423||new Set(attempts.map(x=>x.role_id)).size!==141)
  throw Error('SEO_PRACTICE_COMPLETENESS');
 return {
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
  status:'423_DETERMINISTIC_PRACTICE_RESPONSES_EXECUTED_NO_AGENT_CERTIFICATION',
  source_snapshot_digest:corpus.corpus_digest,attempts,
  role_count:141,departments:32,case_count:423,
  executed_by:'SHARED_DETERMINISTIC_WORKER_NOT_141_INDEPENDENT_AI_ACTORS',
  machine_generated_practice_responses:423,
  authenticated_individual_agent_submissions:0,actual_subject_matter_grades:0,
  professional_exams_passed:0,role_certifications:0,
  website_publications:0,external_data_requests:0,
  autonomous_prod_ready:false,
  independent_review_pending:true
 };
}
export function validateSeoDeterministicPractice({submitted,corpus,casebook,work_products}={}){
 const e=runSeoDeterministicPractice({corpus,casebook,work_products});
 if(!submitted||JSON.stringify(submitted)!==JSON.stringify(e))
  throw Error('SEO_PRACTICE_INDEPENDENT_RECOMPUTE_FAILED');
 if(submitted.attempts.some(x=>x.grade!==null||x.prod_permissions_granted||
  x.actual_authenticated_individual_agent||x.completion_of_subject_matter_examination||
  x.new_url_created))throw Error('SEO_PRACTICE_FALSE_CERTIFICATION');
 return {status:'423_PRACTICE_RESPONSES_INDEPENDENTLY_VERIFIED',cases:423,
  roles:141,departments:32,individual_exam_passes:0,
  proposed_work_artifacts:423,qa_is_evidence_integrity_only:true,
  real_model_training_completed:false,
  external_writes:0};
}
