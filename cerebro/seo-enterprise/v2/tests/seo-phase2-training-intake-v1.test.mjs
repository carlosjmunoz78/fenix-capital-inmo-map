import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildSeoPhase2AllRolesCurriculum} from '../runtime/seo-phase2-all-roles-curriculum-v1.mjs';
import {getSeoTrainingChallenge,enqueueSeoTrainingChallenge,receiveSeoTrainingAnswer,
 inspectSeoTrainingIntake,requireRealTrainingCertification}
 from '../runtime/seo-phase2-training-intake-v1.mjs';
const file=t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seo-phase2-intake-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 return path.join(dir,'training.v8');
};
const curr=buildSeoPhase2AllRolesCurriculum();
const first=curr.drills.find(x=>x.role_id==='SEO-D05:SPECIALIST:01');
const oversight=curr.drills.find(x=>x.role_id==='SEO:GLOBAL:JUDGE');
const answer='Aplicación profesional sobre una copia aprobada del CMS: se identifica la intención de búsqueda y se proponen mejoras conservando la URL. Se distingue la evidencia real del snapshot de los datos externos desconocidos. La revisión y el tribunal deben ser independientes.';

test('specialist and oversight challenges are pinned to curriculum and accepted source',()=>{
 const a=getSeoTrainingChallenge({role_id:first.role_id,case_id:first.case_id});
 const b=getSeoTrainingChallenge({role_id:oversight.role_id,case_id:oversight.case_id});
 assert.equal(a.source_url,first.source_url);
 assert.equal(a.source_copy_sha256,first.source_copy_sha256);
 assert.equal(a.owner_governance_policy_id,curr.owner_policy_id);
 assert.equal(a.accepted_corpus_digest,curr.corpus_digest);
 assert.equal(a.publication_allowed,false);
 assert.equal(b.source_url,null);
 assert.equal(b.actor_iam_verified,false);
 assert.equal(b.training_certified,false);
 assert.throws(()=>getSeoTrainingChallenge({role_id:'FAKE',case_id:first.case_id}),/SEO_TRAINING_INTAKE_ROLE/);
 assert.throws(()=>getSeoTrainingChallenge({role_id:first.role_id,case_id:oversight.case_id}),/CASE_NOT_REGISTERED/);
});
test('JOB-001 saves ungraded role-specific answer, survives restart and never promotes to PROD',t=>{
 const file_path=file(t);
 const ref={file_path,role_id:first.role_id,case_id:first.case_id};
 const a=enqueueSeoTrainingChallenge({...ref,now_ms:1793952000000});
 const b=enqueueSeoTrainingChallenge({...ref,now_ms:1793952000200});
 assert.equal(a.accepted,true);
 assert.equal(b.duplicate,true);
 assert.equal(a.job_id,b.job_id);
 const done=receiveSeoTrainingAnswer({...ref,job_id:a.job_id,answer,
  source_refs:[first.source_url],now_ms:1793952000300});
 assert.equal(done.status,'ANSWER_CAPTURED_PENDING_AGENT_IAM_AND_D31_D32');
 assert.equal(done.actor_iam_verified,false);
 assert.equal(done.professional_exam_passed,false);
 assert.equal(done.training_certified,false);
 assert.equal(done.prod_release,false);
 assert.equal(done.external_writes,0);
 const inspect=inspectSeoTrainingIntake({file_path,job_id:a.job_id});
 assert.equal(inspect.completed,true);
 assert.equal(inspect.pending_real_identity,true);
 assert.equal(inspect.pending_d31_review,true);
 assert.equal(inspect.certified_prod,false);
 assert.equal(inspect.answer_sha256,done.answer_sha256);
 assert.throws(()=>receiveSeoTrainingAnswer({...ref,job_id:a.job_id,answer,
  source_refs:[first.source_url]}),/NOT_QUEUED_OR_REPLAY/);
});
test('unregistered role, fake source, sensitive answer and spoofed certification fail closed',t=>{
 const file_path=file(t);
 const ref={file_path,role_id:oversight.role_id,case_id:oversight.case_id};
 const a=enqueueSeoTrainingChallenge({...ref,now_ms:1793952000000});
 assert.throws(()=>receiveSeoTrainingAnswer({...ref,job_id:a.job_id,answer,
  source_refs:[first.source_url],now_ms:1793952000300}),/SOURCE_PROVENANCE/);
 assert.throws(()=>receiveSeoTrainingAnswer({...ref,job_id:a.job_id,
  answer:'PASSWORD: superSecret '+answer,
  source_refs:['cerebro/seo-enterprise/v2/seo-owner-excellence-all-roles-policy-v1.json'],
  now_ms:1793952000400}),/SECRET_SHAPED_TEXT/);
 assert.throws(()=>requireRealTrainingCertification({intake:{
  actor_iam_verified:true,qa_completed:true,training_certified:true,
  tribunal_accepted:true,signed_external_evidence_verified:true
 }}),/EXTERNAL_VERIFIER_NOT_CONNECTED/);
 assert.throws(()=>requireRealTrainingCertification({intake:{}}),/UNVERIFIED_TRAINING_EVIDENCE/);
 const done=receiveSeoTrainingAnswer({...ref,job_id:a.job_id,answer,
  source_refs:['cerebro/seo-enterprise/v2/seo-owner-excellence-all-roles-policy-v1.json'],
  now_ms:1793952000500});
 assert.equal(done.training_certified,false);
});
