import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {preflightLearnedBatch,classifyLearnedCandidate,executeOneLearnedBatch,persistOneLearnedBatch,EXPECTED_IDS,LEARNING_GATES} from '../runtime/seo-learned-one-batch-runner-v0.mjs';
import {buildSeoV4OwnerPrompt,validateSeoV4Brief} from '../runtime/seo-d13-free-project-one-shot-canary-v0.mjs';
const dir='cerebro/seo-enterprise/v2/registry/';
const manifest=JSON.parse(fs.readFileSync(dir+'seo001-learned-one-batch-pilot-2026-11-08.json','utf8'));

function makePreparedFixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'seo001-prepared-fixture-'));
 fs.mkdirSync(path.join(root,dir),{recursive:true});
 fs.copyFileSync(dir+'seo001-batch2-wordpress-physical-qa-2026-11-07.json',
    path.join(root,dir,'seo001-batch2-wordpress-physical-qa-2026-11-07.json'));
 const prepared=JSON.parse(JSON.stringify(manifest));
 prepared.status='PREPARED_NOT_EXECUTED';
 prepared.workflow_trigger_nonce='TRIGGER_ONCE_20261108';
 fs.writeFileSync(path.join(root,dir,'seo001-learned-one-batch-pilot-2026-11-08.json'),JSON.stringify(prepared));
 return root;
}

test('learning is truly consumed by writer prompts before inference',()=>{
 assert.equal(LEARNING_GATES.length,10);
 assert.equal(EXPECTED_IDS.length,2);
 const root=makePreparedFixture();
 try{const prior=preflightLearnedBatch({root});
 assert.equal(prior.learning_gates_loaded,10);
 assert.equal(prior.prior_release,'HOLD_NOT_OWNER_APPROVED');}
 finally{fs.rmSync(root,{recursive:true,force:true});}
 manifest.briefs.forEach((brief,i)=>{
  assert.equal(brief.work_id,EXPECTED_IDS[i]);
  assert.equal(validateSeoV4Brief(brief),brief);
  const prompt=buildSeoV4OwnerPrompt(brief);
  LEARNING_GATES.forEach(k=>assert.ok(prompt.includes(k+' '+manifest.lessons[k]),k));
  assert.match(prompt,/SIN imágenes, scripts, CSS, formularios/i);
  assert.match(prompt,/NO PUBLICAR/i);
 });
});
test('legacy writer remains accepted, while new scope requires exact IDs',()=>{
 const b={...manifest.briefs[0],work_id:'SEO001-FENIX-LRN-20261108-UNKNOWN'};
 assert.throws(()=>validateSeoV4Brief(b),/SEO_V4_SCOPE_NOT_ALLOWED/);
});
test('missing one learned gate fails before any model call',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'seo001-learning-test-'));
 try{
  fs.mkdirSync(path.join(root,dir),{recursive:true});
  fs.copyFileSync(dir+'seo001-batch2-wordpress-physical-qa-2026-11-07.json',path.join(root,dir,'seo001-batch2-wordpress-physical-qa-2026-11-07.json'));
  const bad=JSON.parse(JSON.stringify(manifest));
  delete bad.lessons.L07_PRIVACY;
  bad.status='PREPARED_NOT_EXECUTED';
  bad.workflow_trigger_nonce='TRIGGER_ONCE_20261108';
  fs.writeFileSync(path.join(root,dir,'seo001-learned-one-batch-pilot-2026-11-08.json'),JSON.stringify(bad));
  assert.throws(()=>preflightLearnedBatch({root}),/SEO001_LEARNED_BATCH_LEARNING_GATES_UNWIRED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('no trigger nonce, over-limit or publication permission cannot start',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'seo001-learning-scope-'));
 try{
  fs.mkdirSync(path.join(root,dir),{recursive:true});
  fs.copyFileSync(dir+'seo001-batch2-wordpress-physical-qa-2026-11-07.json',path.join(root,dir,'seo001-batch2-wordpress-physical-qa-2026-11-07.json'));
  for(const change of [m=>m.allow_wordpress_publication=true,m=>m.max_real_model_calls=3,m=>m.workflow_trigger_nonce='NO_TRIGGER']){
   const bad=JSON.parse(JSON.stringify(manifest));
   bad.status='PREPARED_NOT_EXECUTED';bad.workflow_trigger_nonce='TRIGGER_ONCE_20261108';change(bad);
   fs.writeFileSync(path.join(root,dir,'seo001-learned-one-batch-pilot-2026-11-08.json'),JSON.stringify(bad));
   assert.throws(()=>preflightLearnedBatch({root}),/SEO001_LEARNED_BATCH_AUTHORIZATION_OR_CEILING/);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('text-only candidate is never certified as physical media + mobile QA',()=>{
 const b=manifest.briefs[1];
 const w={work_id:b.work_id,status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',faq_count:6,content_depth_precheck_passed:true,html:'<h1>Agencia inmobiliaria de Córdoba</h1><h2>Protocolo</h2>'};
 const r=classifyLearnedCandidate({brief:b,writer:w});
 assert.equal(r.technical_copy_precheck,'HOLD');
 assert.ok(r.copy_issues.includes('EXACT_FAQ_DOM_WRAPPER_REQUIRED'));
 assert.ok(r.copy_issues.includes('SIX_MAIN_H2_REQUIRED'));
 assert.equal(r.full_quality_certified,false);
 assert.equal(r.publish_allowed,false);
 assert.ok(r.physical_gates_pending.includes('ORIGINAL_HERO_MEDIA_WITH_PROVENANCE'));
 assert.equal(r.cms_plan.form,'fenix_seo001_partner_form');
 assert.equal(r.cms_plan.rendered_h1_owner,'ASTRA_NATIVE');
});
test('unsafe image embedded or absent FAQ cannot pass',()=>{
 const b=manifest.briefs[0];
 const w={status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',faq_count:0,content_depth_precheck_passed:true,html:'<h1>Título</h1><img src="evil">'};
 const r=classifyLearnedCandidate({brief:b,writer:w});
 assert.equal(r.technical_copy_precheck,'HOLD');
 assert.ok(r.copy_issues.includes('IMAGE_OR_FORM_WRONGLY_EMBEDDED_IN_MODEL_HTML'));
 assert.equal(r.cms_plan.form,'fenix_seo001_city_form');
});
test('no secret available returns HOLD, never WordPress writes or retries',async()=>{
 const root=makePreparedFixture();
 try{
 const pre=preflightLearnedBatch({root});
 assert.equal(pre.learning_gates_loaded,10);
 const batch=await executeOneLearnedBatch({root,api_key:null,fetch_impl:async()=>{throw Error('must not call network')}});
 assert.equal(batch.provider_calls,0);
 assert.equal(batch.auto_retry_count,0);
 assert.equal(batch.wordpress_writes,0);
 assert.equal(batch.can_publish,false);
 assert.equal(batch.items.length,2);
 assert.equal(batch.status,'LEARNED_BATCH_INCOMPLETE_HOLD');
 const dest=path.join(os.tmpdir(),'seo001-learned-test-'+process.pid);
 try{
  if(fs.existsSync(dest))fs.rmSync(dest,{recursive:true,force:true});
  const receipt=persistOneLearnedBatch({batch,output_dir:dest});
  assert.equal(receipt.wordpress_writes,0);
  assert.equal(receipt.publication,false);
  assert.ok(fs.existsSync(path.join(dest,'manifest.json')));
 }finally{fs.rmSync(dest,{recursive:true,force:true});}
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('sealed pilot cannot be regenerated using current repository manifest',()=>{
 assert.equal(manifest.status,'COMPLETED_HOLD');
 assert.match(manifest.workflow_trigger_nonce,/^CONSUMED_/);
 assert.throws(()=>preflightLearnedBatch(),/SEO001_LEARNED_BATCH_AUTHORIZATION_OR_CEILING/);
});
test('real D32 feedback gates enter next prompt and unsafe legal absolutes are blocked',()=>{
 const feedback=JSON.parse(fs.readFileSync('cerebro/seo-enterprise/v2/training-pilots/SEO_D32_LEARNED_ONE_BATCH_20261108_FEEDBACK.json','utf8'));
 assert.equal(feedback.learning_delta.length,6);
 const brief=manifest.briefs[0],prompt=buildSeoV4OwnerPrompt(brief);
 for(const v of feedback.learning_delta)assert.ok(prompt.includes(v.id+' '+v.hard_requirement));
 assert.match(prompt,/<section class="faq">/);
 const w={status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',faq_count:6,content_depth_precheck_passed:true,
 html:'<h1>Gastos de un piso en Córdoba</h1><p>El vendedor debe abonar las derramas aprobadas antes de la firma.</p>'};
 const r=classifyLearnedCandidate({brief,writer:w});
 assert.equal(r.publish_allowed,false);
 assert.ok(r.copy_issues.includes('YMYL_UNQUALIFIED_LEGAL_OR_EXCLUSIVE_CAUSE_CLAIM'));
});

test('structural FAQ regression passes only on true DOM with six full main sections',()=>{
 const brief=manifest.briefs[1];
 const para=Array(65).fill('dato').join(' ');
 const answer=Array(24).fill('respuesta').join(' ');
 const body=Array.from({length:6},(_,n)=>'<section><h2>Agencia y etapa '+(n+1)+'</h2>'+
   Array.from({length:3},()=>'<p>'+para+'</p>').join('')+'</section>').join('');
 const faq='<section class="faq"><h2>Preguntas frecuentes</h2>'+
   Array.from({length:6},(_,n)=>'<div class="faq-item"><h3>¿Duda '+(n+1)+'?</h3><p>'+answer+'</p></div>').join('')+
   '</section>';
 const writer={work_id:brief.work_id,status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',
    faq_count:6,content_depth_precheck_passed:true,
    html:'<h1>Protocolo útil para agencias en Córdoba</h1>'+body+faq};
 const ok=classifyLearnedCandidate({brief,writer});
 assert.equal(ok.technical_copy_precheck,'PASS',JSON.stringify(ok.copy_issues));
 assert.equal(ok.full_quality_certified,false);
 assert.equal(ok.publish_allowed,false);
 assert.ok(ok.physical_gates_pending.includes('REAL_B2B_FORM_CRM_E2E'));
 const badFaq={...writer,html:writer.html.replace(
    '<p>'+answer+'</p></div></section>',
    '<p>'+Array(19).fill('respuesta').join(' ')+'</p></div></section>')};
 const malformed=classifyLearnedCandidate({brief,writer:badFaq});
 assert.equal(malformed.technical_copy_precheck,'HOLD');
 assert.ok(malformed.copy_issues.includes('FAQ_ANSWER_WORD_RANGE'));
 const fiveSections={...writer,html:writer.html.replace(body,body.replace('<section><h2>Agencia y etapa 1</h2>'+Array.from({length:3},()=>'<p>'+para+'</p>').join('')+'</section>',''))};
 const five=classifyLearnedCandidate({brief,writer:fiveSections});
 assert.ok(five.copy_issues.includes('SIX_MAIN_H2_REQUIRED'));
});
test('neither 2 body paragraphs nor thin 40-word paragraphs can be marked PASS',()=>{
 const brief=manifest.briefs[0];
 const p=Array(65).fill('prueba').join(' ');
 const a=Array(23).fill('respuesta').join(' ');
 const faq='<section class="faq"><h2>Preguntas frecuentes</h2>'+
    Array.from({length:6},(_,n)=>'<div class="faq-item"><h3>¿Duda '+n+'?</h3><p>'+a+'</p></div>').join('')+'</section>';
 const base=Array.from({length:6},(_,n)=>'<section><h2>Bloque '+n+'</h2>'+
    Array.from({length:3},()=>'<p>'+p+'</p>').join('')+'</section>').join('');
 const w={status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',faq_count:6,content_depth_precheck_passed:true,html:'<h1>Gastos recurrentes de tu vivienda en Córdoba</h1>'+base+faq};
 assert.equal(classifyLearnedCandidate({brief,writer:w}).technical_copy_precheck,'PASS');
 const twoParas={...w,html:w.html.replace('<p>'+p+'</p>','')};
 assert.ok(classifyLearnedCandidate({brief,writer:twoParas}).copy_issues.includes('EXACTLY_THREE_PARAGRAPHS_PER_MAIN_SECTION'));
 const thin={...w,html:w.html.replace('<p>'+p+'</p>','<p>'+Array(40).fill('dato').join(' ')+'</p>')};
 assert.ok(classifyLearnedCandidate({brief,writer:thin}).copy_issues.includes('MAIN_PARAGRAPH_WORD_RANGE'));
});
