import test from 'node:test';
import assert from 'node:assert/strict';
import {auditExistingWordPressSeoDraft} from '../runtime/seo-existing-wp-draft-qa-v1.mjs';
const question=(n)=>'<details><summary>¿Pregunta suficientemente completa número '+n+'?</summary><p>Esta es una respuesta orientativa con información comprobable de la empresa sin datos externos inventados ni afirmaciones bancarias garantizadas.</p></details>';
const faq=n=>'<section class="fenix-faq"><h2>Preguntas frecuentes</h2>'+Array.from({length:n},(_,i)=>question(i+1)).join('')+'</section>';
const doc=(n,extra='')=>'<main><h1>Título de ejemplo</h1><h2>Datos</h2><p>Texto de prueba que cumple su misión de validar los contadores de FAQ.</p>'+extra+faq(n)+'</main>';
test('FAQ counts only FAQ section, never hero or CTA details',()=>{
 const x=auditExistingWordPressSeoDraft({post_id:52660,post_type:'post',status:'draft',
 html:doc(6,'<details><summary>Leer</summary><p>Imagen original y llamada a la acción</p></details><details><summary>Menú</summary><p>Opciones del cliente</p></details>')});
 assert.equal(x.faq_only_details,6);assert.equal(x.other_disclosure_details,2);
 assert.equal(x.faq_count,6);assert.equal(x.faq_required,6);
 assert.equal(x.faq_count_passed,true);
 assert.equal(x.production_publish_authorized,false);
 assert.ok(x.review_required.includes('FAQ_HEADING_H3_POLICY_MISMATCH_REQUIRES_DESIGN_REVIEW'));
});
test('landing needs eight FAQ and remains HOLD even if numeric count passes',()=>{
 const ok=auditExistingWordPressSeoDraft({post_id:52662,post_type:'page',status:'draft',html:doc(8)});
 assert.equal(ok.faq_count,8);assert.equal(ok.faq_count_passed,true);
 assert.equal(ok.editorial_policy_passed,false);
 assert.equal(ok.release_decision,'HOLD');
 const bad=auditExistingWordPressSeoDraft({post_id:52663,post_type:'page',status:'draft',html:doc(7)});
 assert.equal(bad.faq_count,7);assert.ok(bad.review_required.includes('FAQ_MINIMUM_NOT_REACHED'));
});
test('fail closed on claimed published source or missing faq section or untrusted post',()=>{
 assert.throws(()=>auditExistingWordPressSeoDraft({post_id:52660,post_type:'post',status:'publish',html:doc(6)}),/SCOPE/);
 assert.throws(()=>auditExistingWordPressSeoDraft({post_id:99999,post_type:'post',status:'draft',html:doc(6)}),/SCOPE/);
 assert.throws(()=>auditExistingWordPressSeoDraft({post_id:52660,post_type:'post',status:'draft',html:'<main>'+('texto '.repeat(200))+'</main>'}),/MISSING_OR_DUPLICATE_FAQ/);
});
test('do not silently approve FAQ text violating owner style',()=>{
 const html=doc(8).replace('Esta es una respuesta orientativa','Además, esta es una respuesta orientativa');
 const x=auditExistingWordPressSeoDraft({post_id:52662,post_type:'page',status:'draft',html});
 assert.ok(x.review_required.includes('OWNER_BANNED_ADEMAS'));
 assert.equal(x.wordpress_writes,0);assert.equal(x.deepseek_calls,0);
});
