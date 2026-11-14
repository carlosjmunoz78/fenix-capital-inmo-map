import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SOURCE_GUIDED_REPAIRS,repairSourceGuidedCandidate,writeSourceGuidedRevision} from '../runtime/seo-v4-official-source-repair-v1.mjs';
const root=process.env.SEO_V4_QA_INPUT_DIR;
if(!root)throw Error('PHYSICAL_V4_ARTIFACT_REQUIRED');
const raw=[
 {work_id:'SEO001-FENIX-B2C-EDITORIAL-001',filename:'b2c-v4-review-only.html'},
 {work_id:'SEO001-FENIX-B2B-EDITORIAL-002',filename:'b2b-v4-review-only.html'}
].map(x=>({...x,html:fs.readFileSync(path.join(root,x.filename),'utf8')}));
test('real two immutable samples source-locked and patched only by exact safe phrases',()=>{
 const repaired=raw.map(x=>repairSourceGuidedCandidate({work_id:x.work_id,html:x.html}));
 assert.equal(repaired.length,2);
 assert.deepEqual(repaired.map(x=>x.exact_repairs_applied),[5,4]);
 assert.ok(repaired.every(x=>x.original_flagged_phrases_removed));
 assert.ok(repaired.every(x=>x.new_sha256!==x.source_sha256));
 // Historical output bytes remain preserved, but newer D31 gates must be evaluated.
 assert.ok(repaired.every(x=>x.status==='TECHNICAL_QA_HOLD'));
 assert.deepEqual(repaired[0].technical_qa_issues,['VOICE_PURCHASE_MORTGAGE_FEES_UNDIFFERENTIATED']);
 assert.deepEqual(repaired[1].technical_qa_issues,[
  'VOICE_UNWARRANTED_MORTGAGE_SUCCESS_GUARANTEE',
  'VOICE_UNILATERAL_TRANSACTION_DISMISSAL_REQUIRES_REVIEW'
 ]);
 assert.deepEqual(repaired.map(x=>x.faq_count),[6,6]);
 assert.ok(repaired.every(x=>x.words>1000&&x.main_words>750));
});
test('source-guided changes correct buyer note-simple, LPH, insurance and independent bank valuation wording',()=>{
 const x=repairSourceGuidedCandidate(raw[0]);
 assert.ok(x.html.includes('conocer la titularidad inscrita y las cargas que figuran'));
 assert.ok(x.html.includes('revisar el estado de deudas comunitarias')||
   x.html.includes('conocer el estado de deudas comunitarias'));
 assert.ok(x.html.includes('Las ventas vinculadas están sujetas a límites'));
 assert.ok(x.html.includes('independiente del prestamista'));
 assert.equal(x.individual_factual_claims_verified,false);
 assert.equal(x.independent_legal_professional_signoff,false);
});
test('source-guided changes correct broker legal scope and false cancellation/reduction guarantees',()=>{
 const x=repairSourceGuidedCandidate(raw[1]);
 assert.ok(x.html.includes('cuando esté habilitado para las funciones que desempeñe'));
 assert.ok(x.html.includes('Las consecuencias de una reserva dependen de lo acordado'));
 assert.ok(x.html.includes('ayuda a reducir malentendidos'));
 assert.equal(x.seo_editor_independent_review_verified,false);
 assert.equal(x.publish_authorized,false);
});
test('altered digest cannot smuggle in previous signoff or edit unrelated company content',()=>{
 for(const x of raw){
  assert.throws(()=>repairSourceGuidedCandidate({work_id:x.work_id,html:x.html+'A'}),/SOURCE_HASH_OR_WORK_ID_MISMATCH/);
  assert.throws(()=>repairSourceGuidedCandidate({work_id:'SEO001-OTHER-001',html:x.html}),/SOURCE_HASH_OR_WORK_ID_MISMATCH/);
 }
});
test('only PREPROD artifact survives; no generated images, model request, CMS write or publication permission',()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'seo-v4-1-test-'));
 try{
  const repaired=raw.map(x=>repairSourceGuidedCandidate(x));
  const output=path.join(d,'report');
  const receipt=writeSourceGuidedRevision({results:repaired,output_dir:output});
  assert.equal(receipt.items.length,2);
  for(const file of ['compradores-v4-1-review-only.html','inmobiliarias-v4-1-review-only.html',
   'compradores-receipt.json','inmobiliarias-receipt.json','manifest.json']){
   assert.ok(fs.existsSync(path.join(output,file)));
  }
  const m=JSON.parse(fs.readFileSync(path.join(output,'manifest.json'),'utf8'));
  assert.equal(m.ai_model_calls,0);
  assert.equal(m.image_api_calls,0);
  assert.equal(m.wordpress_writes,0);
  assert.equal(m.publication_authorized,false);
  assert.throws(()=>writeSourceGuidedRevision({results:repaired,output_dir:output}),/NOT_ISOLATED/);
  assert.throws(()=>writeSourceGuidedRevision({results:repaired,output_dir:'/etc/seo-unsafe'}),/NOT_ISOLATED/);
 }finally{fs.rmSync(d,{recursive:true,force:true})}
});
