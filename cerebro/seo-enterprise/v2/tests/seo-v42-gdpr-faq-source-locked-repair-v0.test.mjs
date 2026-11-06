import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeSeoV42,persistSeoV42} from '../runtime/seo-v42-gdpr-faq-source-locked-repair-v0.mjs';

test('V4.2 verifies exact historical source digests and preserves both owner-safe HTML versions',()=>{
 const a=makeSeoV42();
 assert.equal(a.length,2);
 assert.deepEqual(a.map(x=>x.faq_count),[6,6]);
 assert.ok(a.every(x=>x.word_count>=1000&&x.main_words_excluding_faq>=750));
 assert.equal(a[0].technical_precheck_pass,false);
 assert.deepEqual(a[0].technical_issues,['VOICE_PURCHASE_MORTGAGE_FEES_UNDIFFERENTIATED']);
 assert.equal(a[1].technical_precheck_pass,false);
 assert.deepEqual(a[1].technical_issues,[
  'VOICE_UNWARRANTED_MORTGAGE_SUCCESS_GUARANTEE',
  'VOICE_UNILATERAL_TRANSACTION_DISMISSAL_REQUIRES_REVIEW'
 ]);
 assert.ok(a.every(x=>x.publish_authorized===false));
 assert.equal(a[0].new_sha256,a[0].source_sha256);
 assert.notEqual(a[1].new_sha256,a[1].source_sha256);
 assert.ok(a.every(x=>x.model_calls_this_revision===0&&x.wordpress_writes===0));
});
test('GDPR corrects yes-to-signature fallacy and bank promises, without false legal certainty',()=>{
 const b2b=makeSeoV42()[1].html;
 assert.match(b2b,/¿Hace falta consentimiento para derivar al comprador\?/);
 assert.match(b2b,/No necesariamente\. La comunicación de datos personales exige una base jurídica válida/);
 assert.match(b2b,/El consentimiento puede ser una de esas bases, pero no la única/);
 assert.doesNotMatch(b2b,/¿Debe firmar el cliente una autorización inicial\?/);
 assert.doesNotMatch(b2b,/los tiempos dependen exclusivamente de los criterios internos/);
 assert.match(b2b,/cualquier previsión es orientativa/);
});
test('B2B candidate no longer has three identical links per target',()=>{
 const h=makeSeoV42()[1].html;
 for(const x of [
  'https://fenixcapital.es/financiacion-servicio-valor-inmobiliaria/',
  'https://fenixcapital.es/seguimiento-hipotecario-por-fases-inmobiliaria/'
 ]){
  assert.equal(h.split('href="'+x+'"').length-1,1);
 }
 assert.equal(h.split('href="https://fenixcapital.es/contacto/"').length-1,1);
});
test('a modified prior source cannot reuse its old digest for a new version',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'seo-v42-drift-'));
 try{
  const dir=path.join(root,'cerebro/seo-enterprise/v2/drafts/v4-1-review-only');
  fs.mkdirSync(dir,{recursive:true});
  for(const n of ['compradores-v4-1-review-only.html','inmobiliarias-v4-1-review-only.html']){
   const src=path.join('cerebro/seo-enterprise/v2/drafts/v4-1-review-only',n);
   fs.copyFileSync(src,path.join(dir,n));
  }
  fs.appendFileSync(path.join(dir,'inmobiliarias-v4-1-review-only.html'),'tampered');
  assert.throws(()=>makeSeoV42({root}),/INPUT_SHA_INVALID_agencies/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('output physically produces new and non-authorized files without overriding original',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'seo-v42-result-'));
 try{
  const receipts=persistSeoV42({results:makeSeoV42(),root});
  assert.equal(receipts.no_paid_calls,true);
  assert.equal(receipts.wordpress_writes,0);
  const registry=JSON.parse(fs.readFileSync(path.join(root,
   'cerebro/seo-enterprise/v2/registry/seo001-v4-2-source-locked-review-only-2026-11-06.json')));
  assert.equal(registry.publish_authorized,false);
  assert.equal(registry.owner_exact_digest_approved,false);
  assert.equal(registry.media_generated,false);
  assert.equal(registry.model_calls_this_revision,0);
  assert.match(registry.aepd_reference,/aepd\.es/);
  assert.equal(registry.independent_professional_legal_review_complete,false);
  assert.equal(registry.work.length,2);
  assert.throws(()=>persistSeoV42({results:makeSeoV42(),root}),/OUTPUT_ALREADY_EXISTS/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
