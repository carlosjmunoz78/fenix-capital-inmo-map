import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareJaenSchemaRepair} from '../runtime/seo-jaen-certificate-repair-planner-v0.mjs';
const qa=[
 ['¿Cuándo conviene hablar con un asesor hipotecario en Jaén?','Antes de entregar señal o firmar arras, especialmente si necesitas saber qué rango de compra es razonable.'],
 ['¿Fénix Capital concede hipotecas?','No. Actuamos como asesoría hipotecaria independiente y preparamos/comparamos la operación cuando procede.'],
 ['¿Podéis revisar una hipoteca que ya me ha ofrecido mi banco?','Sí, podemos revisar la operación y sus puntos de riesgo antes de que tomes una decisión.'],
 ['¿Trabajáis con inmobiliarias de Jaén?','Sí. Podemos coordinarnos con agencias para ordenar el expediente del comprador y los hitos de la operación.'],
 ['¿El preestudio garantiza aprobación?','No. Sirve para ordenar y analizar la operación; la aprobación depende de la entidad y del expediente final.']
];
const faq=qa.map(([q,a])=>'<details><summary>'+q+'</summary><p>'+a+'</p></details>').join('\n');
const content='<main><section><p>'+('Texto informativo original y formulaciones verificables. '.repeat(35))+
 '</p><script type="application/ld+json">{"@context":"https://schema.org","@type":"Service"}</script></section>\n'+
 '<section class="section">\n<div class="wrap faq">\n<h2>Preguntas frecuentes sobre hipotecas en Jaén</h2>\n'+faq+'\n</div>\n</section></main>';
const h=s=>createHash('sha256').update(s).digest('hex');
const post={ID:52200,type:'page',status:'publish',slug:'asesor-hipotecario-jaen',content};
test('Jaén P0 pure repair preserves original content and creates 5 exact FAQPage entities plus marker',()=>{
 const result=prepareJaenSchemaRepair({post,expected_content_sha256:h(content)});
 assert.equal(result.status,'LAB_CHANGE_CANDIDATE_NOT_APPLIED');
 assert.equal(result.wordpress_write_performed,false);
 assert.equal(result.publication_status_changed,false);
 assert.equal(result.faq_questions_from_live_content,5);
 assert.equal(result.marker_insertions,1);
 assert.equal(result.schema_insertions,1);
 assert.equal((result.proposed_html.match(/data-fenix-guard-schema="seo001"/g)||[]).length,1);
 assert.equal((result.proposed_html.match(/"@type":"FAQPage"/g)||[]).length,1);
 assert.equal((result.proposed_html.match(/"@type":"Question"/g)||[]).length,5);
 assert.equal((result.proposed_html.match(/"@type":"Answer"/g)||[]).length,5);
 assert.ok(result.proposed_html.includes(content.slice(0,500)));
 assert.equal(h(result.proposed_html),result.candidate_sha256);
 assert.ok(result.required_gates.includes('ROLLBACK_PROVED'));
});
test('source version drift, wrong post, unpublished draft and missing service schema block surgical patch',()=>{
 assert.throws(()=>prepareJaenSchemaRepair({post,expected_content_sha256:'0'.repeat(64)}),/VERSION_MISMATCH/);
 assert.throws(()=>prepareJaenSchemaRepair({post:{...post,ID:42},expected_content_sha256:h(content)}),/POST_SCOPE/);
 assert.throws(()=>prepareJaenSchemaRepair({post:{...post,status:'draft'},expected_content_sha256:h(content)}),/POST_SCOPE/);
 const bad=content.replace('"@type":"Service"','"@type":"NoType"');
 assert.throws(()=>prepareJaenSchemaRepair({post:{...post,content:bad},expected_content_sha256:h(bad)}),/SERVICE_SCHEMA_MISSING/);
});
test('idempotence fail-closed when FAQ schema or structural marker already present; no blind rewrites',()=>{
 const a=prepareJaenSchemaRepair({post,expected_content_sha256:h(content)});
 assert.throws(()=>prepareJaenSchemaRepair({
  post:{...post,content:a.proposed_html},expected_content_sha256:h(a.proposed_html)
 }),/PARTIAL_REPAIR_REQUIRES_REAUDIT/);
 const incomplete=content.replace('<div class="wrap faq">','<div class="wrap faq" data-fenix-guard-schema="seo001">');
 assert.throws(()=>prepareJaenSchemaRepair({post:{...post,content:incomplete},
  expected_content_sha256:h(incomplete)}),/PARTIAL_REPAIR_REQUIRES_REAUDIT/);
});
test('FAQ section changes, duplicates and missing answers fail rather than inventing facts',()=>{
 const changed=content.replace('<div class="wrap faq">','<div class="faq changed">');
 assert.throws(()=>prepareJaenSchemaRepair({post:{...post,content:changed},expected_content_sha256:h(changed)}),/STRUCTURE_CHANGED/);
 const short=content.replace(qa[1][1], 'Sí.');
 assert.throws(()=>prepareJaenSchemaRepair({post:{...post,content:short},expected_content_sha256:h(short)}),/FAQ_CONTENT_QUALITY/);
 const duplicate=content.replace(qa[1][0],qa[0][0]);
 assert.throws(()=>prepareJaenSchemaRepair({post:{...post,content:duplicate},
  expected_content_sha256:h(duplicate)}),/DUPLICATE_FAQ/);
});
