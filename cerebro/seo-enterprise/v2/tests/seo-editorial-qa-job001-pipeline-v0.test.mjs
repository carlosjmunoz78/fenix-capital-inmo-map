import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadVerifiedWorkItem,runEditorialJob001Worker,
  runEditorialTechnicalQA,runEditorialTribunalHold} from '../runtime/seo-editorial-qa-job001-pipeline-v0.mjs';

const items=['SEO001-FENIX-B2C-EDITORIAL-001','SEO001-FENIX-B2B-EDITORIAL-002'];
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-seo-qa-'));
test('real B2C and B2B repository blobs are verified against existing PREPROD queue',()=>{
 const a=items.map(work_id=>loadVerifiedWorkItem({work_id}));
 assert.notEqual(a[0].digest,a[1].digest);
 assert.equal(a[0].draft.persona,'PARTICULARES');
 assert.equal(a[1].draft.persona,'INMOBILIARIAS');
 for(const item of a){assert.match(item.blob,/^[0-9a-f]{40}$/);assert.match(item.digest,/^[0-9a-f]{64}$/)}
});
test('real first-party drafts -> JOB001 persisted replay -> D31 QA -> tribunal hold',()=>{
 const dir=tmp();try{
  for(const work_id of items){
   const journal=path.join(dir,work_id+'.journal');
   const work=runEditorialJob001Worker({work_id,journal_path:journal,now_ms:1762420000000});
   assert.equal(work.job_replayed_ok,true);assert.equal(work.job_status,'SUCCEEDED');
   assert.equal(work.idempotent_duplicate,false);assert.equal(work.wordpress_writes,0);
   const same=runEditorialJob001Worker({work_id,journal_path:journal,now_ms:1762420000100});
   assert.equal(same.idempotent_duplicate,true);assert.equal(same.job_id,work.job_id);
   const qa=runEditorialTechnicalQA({work_id,worker_receipt:work});
   assert.equal(qa.code_checks_passed,true,JSON.stringify(qa.failures));
   assert.equal(qa.human_voice_precheck_passed,true);
   assert.equal(qa.human_voice_semantic_review_required,true);
   assert.equal(qa.content_depth_release_hold,true);
   assert.ok(qa.content_depth_issues.includes('TOTAL_WORDS_BELOW_MINIMUM'));
   assert.equal(qa.required_total_words,1000);
   assert.equal(qa.actual_independent_professional_review,false);
   const tribunal=runEditorialTribunalHold({work_id,worker_receipt:work,qa_receipt:qa});
   assert.equal(tribunal.decision,'TECHNICAL_PRECHECK_PASS_RELEASE_HOLD');
   assert.equal(tribunal.release_authorized,false);assert.equal(tribunal.wordpress_write_authorized,false);
   assert.equal(tribunal.actual_independent_tribunal_iam,false);
   assert.ok(tribunal.remaining_gates.includes('OWNER_EXACT_CONTENT_APPROVAL'));
   assert.ok(tribunal.remaining_gates.includes('OWNER_CONTENT_DEPTH_EXPANSION_REQUIRED'));
   assert.equal(tribunal.release_authorized,false);
   assert.ok(tribunal.remaining_gates.includes('PHYSICAL_BACKUP_RESTORE'));
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('cross-company, forged inspector, wrong digest and fake release remain blocked',()=>{
 const dir=tmp();try{
  const work_id=items[0],w=runEditorialJob001Worker({work_id,journal_path:path.join(dir,'j')});
  const qa=runEditorialTechnicalQA({work_id,worker_receipt:w});
  for(const change of [{company_id:'other'},{release_authorized:true},
   {source_sha256:'0'.repeat(64)},{stage:'NOT_REVIEWED'},{wordpress_writes:1}]){
   assert.throws(()=>runEditorialTechnicalQA({work_id,worker_receipt:{...w,...change}}));
  }
  assert.throws(()=>runEditorialTribunalHold({work_id:items[1],worker_receipt:w,qa_receipt:qa}));
  assert.throws(()=>runEditorialTribunalHold({work_id,worker_receipt:w,
    qa_receipt:{...qa,actual_independent_professional_review:true}}));
  assert.throws(()=>runEditorialTribunalHold({work_id,worker_receipt:w,
    qa_receipt:{...qa,reviewer_actor_id:w.author_actor_id}}));
  assert.throws(()=>loadVerifiedWorkItem({work_id:'SEO001-OTHER-B2C-EDITORIAL-001'}));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('release never granted even after green technical prechecks',()=>{
 const dir=tmp();try{
  const work_id=items[1];
  const work=runEditorialJob001Worker({work_id,journal_path:path.join(dir,'j')});
  const qa=runEditorialTechnicalQA({work_id,worker_receipt:work});
  const done=runEditorialTribunalHold({work_id,worker_receipt:work,qa_receipt:qa});
  assert.equal(done.ymyl_manual_review_required,undefined);
  assert.equal(qa.ymyl_manual_review_required,true);
  assert.equal(qa.legal_privacy_review_required,true);
  assert.equal(done.remaining_gates.length,10);
  assert.ok(done.remaining_gates.includes('VISUAL_IMAGE_PRODUCER_DELIVERY_AND_NO_TEXT_LOGO_QA'));
  assert.equal(qa.image_brief_precheck_passed,true);
  assert.equal(qa.image_visual_review_verified,false);
  assert.equal(done.wordpress_publishes,0);assert.equal(done.release_authorized,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
