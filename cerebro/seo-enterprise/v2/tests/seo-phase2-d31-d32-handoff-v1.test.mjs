import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {runExistingSeoPilot} from '../runtime/seo-phase2-pilot-runner-v1.mjs';
import {checkSeoPhase2PilotEvidence} from '../runtime/seo-phase2-d31-evidence-check-v1.mjs';
import {prepareSeoD32TrainingFeedback} from '../runtime/seo-phase2-d32-training-feedback-v1.mjs';

function make(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seo-d31-d32-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const pilot_receipt=runExistingSeoPilot({journal_path:path.join(dir,'jobs.v8')});
 return pilot_receipt;
}
test('D31 validates authentic frozen source facts, not a professional score or real agent certification',t=>{
 const pilot_receipt=make(t);
 const qa=checkSeoPhase2PilotEvidence({pilot_receipt});
 assert.equal(qa.status,'D31_SEPARATE_JOB_SOURCE_FACTS_VERIFIED_NO_PROFESSIONAL_GRADE');
 assert.equal(qa.objective_checks_passed,10);
 assert.ok(Object.values(qa.objective_checks).every(Boolean));
 assert.equal(qa.independent_source_recompute,true);
 assert.equal(qa.professional_semantic_grade,null);
 assert.equal(qa.professional_qa_certified,false);
 assert.equal(qa.agent_identity_authenticated,false);
 assert.equal(qa.prod_certified_departments,0);
 assert.equal(qa.external_writes,0);
 const result=prepareSeoD32TrainingFeedback({pilot_receipt,d31_receipt:qa});
 assert.equal(result.required_next_exercises.length,2);
 assert.ok(result.required_next_exercises.every(x=>x.required_result.includes('INDEPENDENTLY_AUTHENTICATED')));
 assert.equal(result.training_exam_passed,false);
 assert.equal(result.professional_exam_grade,null);
 assert.equal(result.prod_departments_certified,0);
 assert.equal(result.authenticated_specialist_iam,false);
 assert.equal(result.replacement_or_reward_allowed,false);
 assert.equal(result.external_writes,0);
});
test('D31 denies swapped source, forged score, altered answer and promoted fake agent',t=>{
 const pilot_receipt=make(t);
 const qa=checkSeoPhase2PilotEvidence({pilot_receipt});
 for(const fake of [
  {...pilot_receipt,answer_sha256:'0'.repeat(64)},
  {...pilot_receipt,challenge_sha256:'f'.repeat(64)},
  {...pilot_receipt,distinct_agent_identity_authenticated:true},
  {...pilot_receipt,prod_departments_certified:32}
 ])assert.throws(()=>checkSeoPhase2PilotEvidence({pilot_receipt:fake}),/SEO_D31_EVIDENCE_/);
 assert.throws(()=>checkSeoPhase2PilotEvidence({pilot_receipt,
   answer_text:'FALSO'.repeat(150)}),/SEO_D31_EVIDENCE_/);
 assert.throws(()=>prepareSeoD32TrainingFeedback({
  pilot_receipt,d31_receipt:{...qa,professional_qa_certified:true}
 }),/SEO_D32_FEEDBACK_D31_EVIDENCE_CHANGED/);
 assert.throws(()=>prepareSeoD32TrainingFeedback({
  pilot_receipt,d31_receipt:{...qa,receipt_sha256:'1'.repeat(64)}
 }),/SEO_D32_FEEDBACK_D31_EVIDENCE_CHANGED/);
});
