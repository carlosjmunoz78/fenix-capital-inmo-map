import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {inspectHistoricalSeoCircuit,inspectCandidateSeoHandoff,
 physicallyWriteCircuitReport} from '../runtime/seo-circuit-readiness-orchestrator-v0.mjs';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const root='cerebro/seo-enterprise/v2/';
const id='SEO001-FENIX-B2C-EDITORIAL-001';
const original=fs.readFileSync(root+'drafts/2026-11-06-b2c-comparar-pisos-cordoba-v3-faq.draft.html','utf8');
function expanded(){
 const subjects=[
  ['La luz en el salón','La orientación puede cambiar cuánto tiempo recibe iluminación una estancia y por eso conviene observar las ventanas durante el horario en que estarás en casa después del trabajo. Anota si la luz llega a las zonas donde lees, cocinas o descansas y compárala con otras viviendas.'],
  ['El ruido durante la visita','Un piso tranquilo por la mañana puede presentar un ambiente distinto por la tarde cuando pasan vehículos o se reúnen los vecinos. Escucha desde diferentes habitaciones con las ventanas abiertas y cerradas y pregunta por los momentos de mayor actividad en la calle.'],
  ['La conservación del edificio','Observa el portal y las zonas comunes sin sacar conclusiones técnicas por tu cuenta. Pregunta por obras recientes y reparaciones que estén previstas. Las actas de comunidad pueden aportar información que una visita breve no revela acerca del mantenimiento del edificio.'],
  ['La comodidad cotidiana','Piensa en tus recorridos habituales y en lo que necesitas tener cerca de casa. Valora los tiempos reales hasta tu trabajo y los comercios que utilizas. Una ubicación atractiva para una persona puede ser poco práctica para otra con rutinas diferentes.'],
  ['Los gastos de comunidad','Solicita información sobre la cuota ordinaria, las derramas aprobadas y los posibles servicios compartidos. Estos importes pueden influir en tu presupuesto mensual. Conviene comprobar la documentación disponible y preguntar antes de comprometerte a comprar una vivienda.'],
  ['La accesibilidad del inmueble','Revisa si hay escalones en el acceso, ascensor y pasillos suficientemente cómodos para tu situación y la de tu familia. Las necesidades pueden cambiar con los años. Una comprobación de recorrido ayuda a detectar obstáculos que las fotografías de un anuncio no muestran.'],
  ['La distribución de los espacios','No te fijes solo en los metros anunciados. Observa cómo se conecta la cocina con el salón, dónde caben los armarios y si los dormitorios conservan su utilidad. Un plano y medidas comprobadas permiten comparar espacios con mayor objetividad.'],
  ['Las reformas posibles','Una vivienda que necesita mejoras puede ser interesante si conoces el alcance de la obra y su coste probable. Habla con profesionales adecuados para contrastar el presupuesto. Los plazos y permisos necesarios dependen de la intervención y del edificio concreto.'],
  ['Los documentos disponibles','Antes de tomar decisiones económicas revisa qué información de titularidad, cargas y características está disponible. Puede ser necesario pedir documentos adicionales o asesoramiento. No es recomendable interpretar por tu cuenta una anotación registral sin conocer su contexto.'],
  ['La negociación del precio','Piensa en el coste global y en las condiciones de la operación, no solo en la cifra anunciada. Una propuesta razonada puede tener en cuenta obras, plazos y financiación. Evita prometer cantidades o fechas que todavía no has podido contrastar.']
 ];
 const parts=subjects.map(([h,p])=>'<p>'+p+'</p>').join('\n');
 return original.replace('<section class="faq"',parts+'\n<section class="faq"');
}
function mockedReceipt(html){
 return {company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
  work_id:id,request_count:1,status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',
  source_sha256:sha(html),can_publish:false,wordpress_writes:0};
}
test('complete historical V3 pipeline uses existing JOB001, D31, tribunal and UMS briefs but BLOCKS',()=>{
 const x=inspectHistoricalSeoCircuit();
 assert.equal(x.work.length,2);
 assert.equal(x.status,'TWO_V3_BLOBS_VERIFIED_NEED_EXPANSION');
 assert.equal(x.faq_total,12);
 assert.equal(x.model_calls,0);assert.equal(x.image_api_calls,0);
 assert.equal(x.wordpress_writes,0);assert.equal(x.autonomous_prod_ready,false);
 for(const work of x.work){
  assert.equal(work.old_job001_status,'SUCCEEDED');
  assert.equal(work.old_d15_precheck_passed,true);
  assert.equal(work.old_tribunal_decision,'TECHNICAL_PRECHECK_PASS_RELEASE_HOLD');
  assert.equal(work.depth_precheck_passed,false);
  assert.ok(work.depth_issues.includes('MAIN_WORDS_BELOW_MINIMUM'));
  assert.equal(work.image_order.actual_api_dispatch,false);
  assert.equal(work.image_order.wordpress_upload_authorized,false);
  assert.equal(work.wordpress_draft_plan.arguments.dry_run,true);
  assert.equal(work.wordpress_draft_plan.arguments.status,'draft');
  assert.equal(work.wordpress_draft_plan.execute_now,false);
  assert.equal(work.wordpress_draft_plan.can_publish,false);
  assert.equal(work.wordpress_dry_run_invoked,false);
  assert.equal(work.wordpress_snapshot_verified,false);
  assert.equal(work.publish_authorized,false);
 }
 assert.notEqual(x.work[0].image_order.request_id,x.work[1].image_order.request_id);
});
test('artificially short real writer sample cannot advance to producer or CMS plan',()=>{
 const x=inspectCandidateSeoHandoff({work_id:id,receipt:mockedReceipt(original),html:original});
 assert.equal(x.d32.code,'EDITORIAL_REWRITE_REQUIRED');
 assert.equal(x.depth_passed,false);
 assert.equal(x.image_order,null);
 assert.equal(x.wordpress_dry_run_plan,null);
 assert.equal(x.model_calls_next,0);
 assert.equal(x.publish_authorized,false);
});
test('long synthetic future candidate moves to HANDOFF PLAN but never receives authority',()=>{
 const html=expanded();
 const x=inspectCandidateSeoHandoff({work_id:id,receipt:mockedReceipt(html),html});
 assert.equal(x.d32.code,'TECHNICAL_PRECHECK_PASS_RELEASE_HOLD',JSON.stringify(x.d32.copy_issues));
 assert.equal(x.depth_passed,true);
 assert.ok(x.d32.main_content_words_excluding_faq>=750);
 assert.ok(x.d32.word_count>=1000);
 assert.equal(x.image_order.producer_engine,'UMS-001');
 assert.equal(x.image_order.brief.visible_pixel_text_allowed,false);
 assert.equal(x.image_only_photo_adapter_bound,false);
 assert.equal(x.graphic_renderer_with_text_overlay_not_authorized_for_photos,true);
 assert.equal(x.wordpress_dry_run_plan.arguments.status,'draft');
 assert.equal(x.wordpress_dry_run_plan.arguments.dry_run,true);
 assert.equal(x.wordpress_dry_run_plan.prepared_only,true);
 assert.equal(x.wordpress_dry_run_plan.execute_now,false);
 assert.equal(x.content_version_registered,false);
 assert.equal(x.media_generated,false);assert.equal(x.publish_authorized,false);
 assert.equal(x.autonomous_prod_ready,false);
});
test('forged writer, cross-company, arbitrary media and revoked inventory fail closed',()=>{
 const html=expanded();
 assert.throws(()=>inspectCandidateSeoHandoff({
  work_id:id,receipt:{...mockedReceipt(html),wordpress_writes:1},html
 }));
 assert.throws(()=>inspectCandidateSeoHandoff({
  work_id:'SEO001-OTHER-WORK-003',receipt:mockedReceipt(html),html
 }));
 assert.throws(()=>inspectCandidateSeoHandoff({
  work_id:id,receipt:{...mockedReceipt(html),request_count:2},html
 }));
 assert.throws(()=>inspectCandidateSeoHandoff({
  work_id:id,receipt:mockedReceipt(html),html,
  asset:{sha256:'1'.repeat(64)},inventory_verified:false
 }));
 const wrong=inspectCandidateSeoHandoff({
  work_id:id,receipt:{...mockedReceipt(html),source_sha256:'0'.repeat(64)},html
 });
 assert.equal(wrong.d32.code,'CONTENT_DIGEST_MISMATCH');
 assert.equal(wrong.image_order,null);
});
test('physical PREPROD report generates inspectable artifacts with sha256 and zero API/CMS writes',()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'seo-circuit-test-'));
 try{
  const target=path.join(parent,'output');
  const report=inspectHistoricalSeoCircuit();
  const receipt=physicallyWriteCircuitReport({report,output_dir:target});
  assert.equal(receipt.files.length,6);
  assert.equal(receipt.wordpress_writes,0);
  assert.equal(receipt.paid_calls,0);
  const index=JSON.parse(fs.readFileSync(path.join(target,'report.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(path.join(target,'manifest.json'),'utf8'));
  assert.equal(index.work.length,2);
  assert.equal(index.work[0].depth_precheck_passed,false);
  assert.equal(index.work[0].image_order,undefined);
  assert.equal(manifest.file_hashes.length,5);
  assert.equal(manifest.wordpress_writes,0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(target,'wp-dryrun-plan-1.json'),'utf8')).arguments.dry_run,true);
  assert.throws(()=>physicallyWriteCircuitReport({report,output_dir:target}),/OUTPUT_EXISTS/);
  assert.throws(()=>physicallyWriteCircuitReport({report,output_dir:'/etc/seo-circuit-unsafe'}),/OUTSIDE_TEMP/);
 }finally{fs.rmSync(parent,{recursive:true,force:true})}
});
