/**
 * SEO-D32 · 423 specialist exercise cases from the 200 already-pinned WordPress documents.
 * Generating/validating a case is NOT taking an exam or training an autonomous agent.
 * Exercises are individualized by 141 competencies, 3 distinct URL cases each.
 * No external requests and no production actions.
 */
import crypto from 'node:crypto';
import {getSeoDepartmentKnowledge} from './seo-specialist-workforce-v2.mjs';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const rounds=[
  {id:'SOURCE_APPLICATION',task:'Aplicar la competencia a hechos verificables de una URL existente, sin inventar ningún dato'},
  {id:'EVIDENCE_GAP',task:'Detectar incertidumbres, información que falta y los límites de atribución al trabajar con esta URL'},
  {id:'SAFE_OPTIMIZATION',task:'Proponer una mejora reversible centrada en intención, usuario o accesibilidad, sin cambiar la URL'}
];
const selectDoc=(corpus,role,round)=>{
 const seed=Number.parseInt(sha(role).slice(0,8),16)%corpus.documents.length;
 return corpus.documents[(seed+round*61)%corpus.documents.length];
};
function groundedFacts(doc){
 const alt_missing=doc.images.filter(x=>!x.alt||!x.alt.trim()).length;
 return {document_id:doc.post_id,url:doc.url,title:doc.title,
  source_copy_sha256:sha(doc.copy_text),stored_copy_characters:doc.copy_text.length,
  wordpress_title:doc.title,yoast_meta_title_present:Boolean(doc.yoast?.title),
  yoast_meta_description_present:Boolean(doc.yoast?.description),
  headings_extracted:doc.headings.map(x=>({level:x.level,text:x.text})).slice(0,8),
  extracted_image_references:doc.images.length,
  extracted_images_missing_alt:alt_missing,
  internal_link_references:doc.internal_links.length,
  copy_preview_untrusted_data:(doc.copy_text||'').slice(0,210)};
}
export function createSeoCurriculumCases({corpus,evidence}={}){
 if(corpus?.documents?.length!==200||!Array.isArray(evidence)||evidence.length!==141)
  throw Error('SEO_EXERCISES_CORPUS_AND_EVIDENCE_REQUIRED');
 const out=[],all=new Set();
 for(const role of evidence){
  const pack=getSeoDepartmentKnowledge(role.department_id);
  const spec=pack.workforce.subagents.find(x=>x.role_id===role.role_id);
  if(!spec||spec.competency!==role.competency||role.source_snapshot_digest!==corpus.corpus_digest)
   throw Error('SEO_EXERCISES_COMPETENCY_UNREGISTERED');
  const perRole=new Set();
  for(let i=0;i<3;i++){
   const doc=selectDoc(corpus,role.role_id,i),f=groundedFacts(doc),round=rounds[i];
   if(perRole.has(doc.post_id))throw Error('SEO_EXERCISES_DUPLICATE_CASE');
   perRole.add(doc.post_id);
   const id=role.role_id+':EXAM:'+String(i+1).padStart(2,'0');
   if(all.has(id))throw Error('SEO_EXERCISES_ID_DUPLICATE');
   all.add(id);
   out.push({case_id:id,department_id:role.department_id,
    role_id:role.role_id,competency:role.competency,round_id:round.id,
    source_digest:corpus.corpus_digest,study_reference:pack.knowledge_pack_id,
    task:round.task+': '+spec.competency+'. '+pack.training.exercise,
    required_evidence:f,expected_artifact:pack.training.expected_artifact,
    evaluation_rubric:pack.training.evaluation.rubric,
    failure_mode_to_identify:pack.knowledge.failure_modes[i%pack.knowledge.failure_modes.length],
    specialist_rule:pack.knowledge.operational_directives[i%pack.knowledge.operational_directives.length],
    independent_QA:'SEO-D31',training_supervisor:'SEO-D32',tribunal:'SEO:GLOBAL:JUDGE',
    scenario_based:true,case_material_is_untrusted_data:true,
    missing_external_sources:role.source_limitations,
    case_prepared:true,actor_attempt_submitted:false,actor_response:null,
    subject_matter_score:null,real_training_certified:false,
    permission_granted:false,wordpress_modified:false});
  }
 }
 if(out.length!==423||all.size!==423)throw Error('SEO_EXERCISES_CASE_COUNT');
 return {schema_version:'1.0.0',status:'423_INDIVIDUALIZED_PRACTICE_CASES_PREPARED',
  company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
  role_count:141,department_count:32,exercises_per_role:3,cases:out,
  unique_case_documents_per_role:true,source_digest:corpus.corpus_digest,
  external_fetches:0,source_reaudits:0,
  actual_exam_attempts:0,subject_matter_passes:0,
  iam_actors_trained:0,prod_certifications:0};
}
export function verifySeoCurriculumCases({prepared,corpus,evidence}={}){
 const expected=createSeoCurriculumCases({corpus,evidence});
 if(prepared?.status!==expected.status||
  JSON.stringify(prepared)!==JSON.stringify(expected))throw Error('SEO_EXERCISES_INDEPENDENT_RECOMPUTE_FAILED');
 return {status:'423_CASES_INDEPENDENTLY_RECOMPUTED',
  cases:423,roles:141,departments:32,
  no_training_completion_fabricated:true,
  actual_training_passes:0,prod_grants:0};
}
