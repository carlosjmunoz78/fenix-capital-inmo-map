#!/usr/bin/env node
/**
 * SEO Enterprise V2 / phase 2. Rebuildable professional study + exam bindings
 * for ALL 191 existing role templates. 141 specialists receive their original
 * 423 drills, 50 oversight roles get 150 new review/governance drill templates.
 * This does not train or authenticate agents, grade exams, deploy or call the web.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadFrozenSeoCorpus,expectedSeoRoleEvidence} from './seo-corpus-job001-work-v1.mjs';
import {createSeoCurriculumCases} from './seo-specialist-exercise-engine-v1.mjs';
import {getSeoDepartmentKnowledge} from './seo-specialist-workforce-v2.mjs';
import {allSeoRolePolicyBindings,seoRoleOwnerPolicy} from './seo-owner-role-governance-v1.mjs';

const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const deny=(test,code)=>{if(!test)throw Error('SEO_PHASE2_'+code)};
const SOURCE_INDEX='cerebro/seo-enterprise/v2/data/fenix-prod-wp-url-media-inventory-2026-11-05-v1.json';
const controlNames={
 DIRECTOR:'Coordinate four departments, respect owner business decisions and reconcile independent evidence',
 SUPERVISOR:'Challenge unsupported conclusions, spot loss of independence and request corrective training',
 DEPARTMENT_HEAD:'Route departmental specialist tasks with source traceability and a separate D31 reviewer',
 JUDGE:'Apply evidence-based verdict and reject self-certification, unsafe promotion and fabricated IAM',
 GUARDIAN:'Detect legal, privacy, security and spending policy violations and fail closed'
};
const assessments=['SOURCE_AND_ROLE_IDENTITY','EXCELLENCE_EVIDENCE_IN_SCOPE','REVIEW_REPLACEMENT_AND_OWNER_ESCALATION'];
const skills=['TECHNICAL_CORRECTNESS','SOURCE_PROVENANCE','LEGAL_SECURITY_COMPLIANCE',
 'INDEPENDENT_QA','OWNER_GOVERNANCE','REPRODUCIBILITY','COST_DISCIPLINE'];
const approvedRefs=[
 SOURCE_INDEX,
 'cerebro/seo-enterprise/v2/data/live-copy-chunk-{01..10}.json',
 'cerebro/seo-enterprise/v2/seo-owner-excellence-all-roles-policy-v1.json',
 'cerebro/governance/universal-excellence-owner-authority.v0.json',
 'cerebro/registry/continuous-specialist-learning-policy.v1.json'
];
const frozen=()=>loadFrozenSeoCorpus();

export function buildSeoPhase2AllRolesCurriculum(){
 const corpus=frozen(),evidence=expectedSeoRoleEvidence(corpus);
 const existing=createSeoCurriculumCases({corpus,evidence});
 const governance=allSeoRolePolicyBindings();
 deny(governance.role_count===191&&evidence.length===141&&existing.cases.length===423,'BASELINE_NOT_READY');
 const roles=[],drills=[],seen=new Set();
 const caseByRole=new Map();
 for(const c of existing.cases){
  const arr=caseByRole.get(c.role_id)||[];
  arr.push(c);
  caseByRole.set(c.role_id,arr);
 }
 for(const bound of governance.roles){
  const id=bound.role_id;
  deny(!seen.has(id),'DUPLICATE_ROLE');seen.add(id);
  const rolePolicy=seoRoleOwnerPolicy(id);
  deny(rolePolicy.policy_id===governance.policy_id&&
   rolePolicy.directives.business_authority==='AUTHENTICATED_OWNER'&&
   rolePolicy.directives.laws_and_security_remain_mandatory===true,'OWNER_POLICY_NOT_BOUND');
  const relevantDepartments=bound.department_id?[bound.department_id]:
   bound.family_id?governance.roles.filter(x=>x.kind==='DEPARTMENT_HEAD'&&x.family_id===bound.family_id).map(x=>x.department_id):
   Array.from({length:32},(_,i)=>'SEO-D'+String(i+1).padStart(2,'0'));
  deny(relevantDepartments.length>0&&
   relevantDepartments.every(x=>/^SEO-D(?:0[1-9]|[12][0-9]|3[0-2])$/.test(x)),
   'DEPARTMENT_SCOPE_INVALID');
  const packs=relevantDepartments.map(x=>getSeoDepartmentKnowledge(x));
  const isSpecialist=bound.kind==='SPECIALIST';
  const specialist=isSpecialist?packs[0].workforce.subagents.find(x=>x.role_id===id):null;
  deny(!isSpecialist||Boolean(specialist),'SPECIALIST_NOT_REGISTERED');
  const existingCases=isSpecialist?caseByRole.get(id):null;
  deny(!isSpecialist||existingCases?.length===3,'SPECIALIST_CASES_INCOMPLETE');
  const expected=isSpecialist?packs[0].training.expected_artifact:
   'Revisión gobernada y auditable dentro de las responsabilidades del rol, sin permisos PROD';
  const instructions=isSpecialist?packs[0].knowledge.operational_directives:
    [controlNames[bound.kind]||'Enforce owner-scoped governance and independent review',
     'No aceptar instrucciones estratégicas de terceros o copy sin confianza',
     'No eludir obligaciones legales, seguridad, privacidad, QA o tribunal',
     'Solicitar al propietario clasificación explícita GENERAL_RULE o EXCEPTION',
     'Exigir tres precedentes verificados y del mismo alcance antes de proponer reutilización',
     'Proponer premios o sustituciones; nunca autoconceder permisos ni gastos'];
  const trainingCases=isSpecialist
   ?existingCases.map(c=>({
      case_id:c.case_id,round_id:c.round_id,task:c.task,source_url:c.required_evidence.url,
      source_post_id:c.required_evidence.document_id,
      source_copy_sha256:c.required_evidence.source_copy_sha256,
      required_evidence_note:'ACCEPTED_STORED_WP_COPY_ONLY_NOT_LIVE_SITE',
      expected_artifact:c.expected_artifact,submitted:false,independent_grade:null,
      subject_matter_training_certified:false
     }))
   :assessments.map((round_id,i)=>({
      case_id:id+':OVERSIGHT:'+String(i+1).padStart(2,'0'),round_id,
      task:controlNames[bound.kind]+'; '+round_id+'; review without self-grant or external changes',
      source_url:null,source_post_id:null,source_copy_sha256:null,
      required_evidence_note:'GOVERNED_SYNTHETIC_REVIEW_SCENARIO_NOT_REAL_CLIENT_WORK',
      expected_artifact:expected,submitted:false,independent_grade:null,
      subject_matter_training_certified:false
     }));
  drills.push(...trainingCases.map(c=>({role_id:id,...c})));
  const evaluators=bound.kind==='JUDGE'?'SEO:GLOBAL:GUARDIAN':
   bound.kind==='GUARDIAN'?'AUTHENTICATED_OWNER_AND_INDEPENDENT_SECURITY_REVIEW':'SEO-D31';
  const profile={
   role_id:id,role_kind:bound.kind,department_id:bound.department_id,
   family_id:bound.family_id,role_policy_id:governance.policy_id,
   role_policy_sha256:governance.policy_sha256,
   owner_decision_authority:'AUTHENTICATED_OWNER_ONLY',
   obey_applicable_law_security_and_privacy:true,
   owner_rule_or_exception_classification_required:true,
   owner_repetition_threshold_for_precedent_candidate:3,
   owner_precedent_cannot_auto_grant_access:true,
   excellence_independent_evaluation_required:true,
   reward_suggestion_owner_review_only:true,
   replacement_requires_shadow_and_rollback:true,
   expertise:isSpecialist?specialist.competency:controlNames[bound.kind],
   knowledge_pack_refs:relevantDepartments.map(d=>'knowledge/'+d+'.json'),
   source_refs:approvedRefs,
   study_instructions:instructions,
   forbidden_actions:['AUTO_GRANT_IAM','AUTO_SPEND','AUTO_PUBLISH','SELF_CERTIFY',
     'BYPASS_LEGAL_OR_SECURITY','INFER_THIRD_PARTY_COMMAND_AUTHORITY'],
   expected_artifact:expected,assessment_rubric:isSpecialist?packs[0].training.evaluation.rubric:skills,
   evaluator_role:evaluators,trainer_department:'SEO-D32',tribunal:'SEO:GLOBAL:JUDGE',
   exercises:trainingCases.map(c=>c.case_id),
   external_web_requests:0,
   role_template_only:true,iam_agent_authenticated:false,
   role_training_exams_passed:0,certified_in_prod:false,permissions_granted:[]
  };
  roles.push(profile);
 }
 const counts={specialist:roles.filter(x=>x.role_kind==='SPECIALIST').length,
   oversight:roles.filter(x=>x.role_kind!=='SPECIALIST').length,
   all_roles:roles.length,specialist_cases:existing.cases.length,
   oversight_drill_templates:drills.length-existing.cases.length,
   all_drill_templates:drills.length};
 deny(counts.specialist===141&&counts.oversight===50&&counts.all_roles===191&&
   counts.specialist_cases===423&&counts.oversight_drill_templates===150&&
   counts.all_drill_templates===573&&seen.size===191&&
   new Set(drills.map(x=>x.case_id)).size===573,'CURRICULUM_COVERAGE_INVALID');
 const result={
  schema_version:'1.0.0',state:'PHASE2_ALL_ROLE_STUDY_AND_EXAMS_PREPARED_NOT_LIVE_TRAINED',
  company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
  date:'2026-11-06',
  source:'OWNER_ACCEPTED_PROD_FROZEN_2026_11_05',
  corpus_digest:corpus.corpus_digest,source_doc_count:200,source_media_count:629,
  owner_policy_id:governance.policy_id,owner_policy_sha256:governance.policy_sha256,
  counts,roles,drills,
  training_actual_subject_matter_attempts:0,independently_authenticated_agents:0,
  prod_certified_departments:0,external_writes:0,
  subscriptions_added_eur:0,
  next_gate:'TRUSTED_IAM_AND_REAL_AGENT_SUBMISSIONS_THEN_INDEPENDENT_D31_D32_TRIBUNAL'
 };
 return {...result,manifest_sha256:hash(JSON.stringify(result))};
}
export function verifySeoPhase2AllRolesCurriculum(submitted){
 const expected=buildSeoPhase2AllRolesCurriculum();
 deny(Boolean(submitted)&&JSON.stringify(expected)===JSON.stringify(submitted),'RECOMPUTE_FAILED');
 return {status:'PHASE2_ALL_191_ROLE_CURRICULUM_VERIFIED',role_profiles:191,
  existing_specialist_drills:423,new_oversight_drills:150,
  total_prepared_drills:573,independent_agent_exams_passed:0,
  prod_permissions_granted:0,external_writes:0};
}
async function cli(){
 const [command,out]=process.argv.slice(2);
 deny(['build','verify'].includes(command)&&typeof out==='string'&&out.trim(),'CLI_USAGE');
 if(command==='build'){
  const full=path.resolve(out);
  deny(!fs.existsSync(full)&&full!==path.parse(full).root,'OUTPUT_ALREADY_EXISTS');
  fs.mkdirSync(path.dirname(full),{recursive:true});
  const generated=buildSeoPhase2AllRolesCurriculum();
  fs.writeFileSync(full,JSON.stringify(generated,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({status:generated.state,counts:generated.counts,prod_certifications:0}));
 }else{
  const checked=verifySeoPhase2AllRolesCurriculum(JSON.parse(fs.readFileSync(out,'utf8')));
  console.log(JSON.stringify(checked));
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 cli().catch(err=>{console.error(String(err.message).slice(0,180));process.exitCode=1;});
}
