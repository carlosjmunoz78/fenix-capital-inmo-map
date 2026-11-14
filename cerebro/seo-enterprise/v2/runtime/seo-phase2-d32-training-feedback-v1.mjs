#!/usr/bin/env node
/**
 * D32 training feedback based on D31 separate-job provenance and pinned source.
 * Template exercise plan, not actor training or independent semantic exam.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {checkSeoPhase2PilotEvidence} from './seo-phase2-d31-evidence-check-v1.mjs';
import {buildSeoPhase2AllRolesCurriculum} from './seo-phase2-all-roles-curriculum-v1.mjs';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const deny=(x,s)=>{if(!x)throw Error('SEO_D32_FEEDBACK_'+s)};
export function prepareSeoD32TrainingFeedback({pilot_receipt,d31_receipt}={}){
 deny(pilot_receipt&&d31_receipt,'RECEIPTS_REQUIRED');
 const expected=checkSeoPhase2PilotEvidence({pilot_receipt});
 deny(JSON.stringify(d31_receipt)===JSON.stringify(expected),'D31_EVIDENCE_CHANGED');
 deny(d31_receipt.status==='D31_SEPARATE_JOB_SOURCE_FACTS_VERIFIED_NO_PROFESSIONAL_GRADE'&&
  d31_receipt.professional_semantic_grade===null&&d31_receipt.professional_qa_certified===false&&
  d31_receipt.agent_identity_authenticated===false,'FALSE_D31_CERTIFICATION');
 const curriculum=buildSeoPhase2AllRolesCurriculum();
 const role=curriculum.roles.find(r=>r.role_id===d31_receipt.role_id);
 const cases=curriculum.drills.filter(x=>x.role_id===d31_receipt.role_id);
 deny(Boolean(role)&&cases.length===3&&cases[0].case_id===d31_receipt.case_id,'ROLE_OR_DRILLS_CHANGED');
 const feedback={
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',
  status:'D32_FEEDBACK_AND_NEXT_EXERCISES_PREPARED_NOT_A_TRAINED_AGENT',
  role_id:role.role_id,role_policy_id:role.role_policy_id,
  case_id:d31_receipt.case_id,challenge_sha256:d31_receipt.challenge_sha256,
  answer_sha256:d31_receipt.answer_sha256,d31_evidence_sha256:d31_receipt.receipt_sha256,
  evaluator:'D32_SEPARATE_GITHUB_WORKLOAD_NO_AGENT_IAM',
  observations:{
   evidence_binding_and_nonpublication_proven:true,
   professional_accuracy_not_independently_graded:true,
   no_gsc_or_rankings_claimed:true,
   preserved_existing_url:true,
   no_trusted_identity_of_original_answering_agent:true
  },
  required_next_exercises:cases.slice(1).map(x=>({
   case_id:x.case_id,round_id:x.round_id,objective:x.task,
   expected_artifact:x.expected_artifact,source_url:x.source_url,
   required_result:'NEW_INDEPENDENTLY_AUTHENTICATED_ACTOR_RESPONSE'
  })),
  specific_feedback:[
   'Revisar con evidencia cuál es la intención dominante de la URL y registrar posibles solapamientos sin declarar canibalización demostrada.',
   'Distinguir la discrepancia del slug del contenido de una necesidad real de cambio: no redireccionar.',
   'Verificar cualquier afirmación jurídica antes de usarla comercialmente; no extrapolar el HTML almacenado al renderizado.',
   'No inventar volúmenes, posiciones GSC, ROI o datos del proceso hipotecario.',
   'Repetir los dos casos de especialidad restantes con una identidad real y separada de la evaluación D31.'
  ],
  improvements_must_be_measured_in_future_exams:true,
  authenticated_specialist_iam:false,
  actual_subject_matter_missions_verified:0,
  professional_exam_grade:null,training_exam_passed:false,
  replacement_or_reward_allowed:false,
  prod_departments_certified:0,external_requests:0,external_writes:0,
  next_gate:'TRUSTED_ACTOR_IAM_AND_INDEPENDENT_PROFESSIONAL_EVALUATION'
 };
 return {...feedback,receipt_sha256:hash(JSON.stringify(feedback))};
}
async function cli(){
 const [pilot,d31,out]=process.argv.slice(2);
 deny(typeof pilot==='string'&&typeof d31==='string'&&typeof out==='string'&&
  !fs.existsSync(out),'OUTPUT_REQUIRED_NEW');
 const r=prepareSeoD32TrainingFeedback({
  pilot_receipt:JSON.parse(fs.readFileSync(pilot,'utf8')),
  d31_receipt:JSON.parse(fs.readFileSync(d31,'utf8'))
 });
 fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({status:r.status,next_exercises:r.required_next_exercises.length,
  certified_real_agents:0,prod_changes:0})+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 cli().catch(e=>{process.stderr.write(String(e.message).slice(0,250)+'\n');process.exitCode=1});
}
