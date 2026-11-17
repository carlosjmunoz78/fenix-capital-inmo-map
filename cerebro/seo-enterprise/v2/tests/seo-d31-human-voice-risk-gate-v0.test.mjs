import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {auditSeoHumanVoiceAndRisk} from '../runtime/seo-d31-human-voice-risk-gate-v0.mjs';
const base='cerebro/seo-enterprise/v2/drafts/';
test('owner-accepted V3 style remains green for both buyer personas',()=>{
 const pairs=[
  ['PARTICULARES','2026-11-06-b2c-comparar-pisos-cordoba-v3-faq.draft.html'],
  ['INMOBILIARIAS','2026-11-06-b2b-derivacion-comprador-cordoba-v3-faq.draft.html']
 ];
 for(const [persona,name] of pairs){
  const html=fs.readFileSync(base+name,'utf8');
  const a=auditSeoHumanVoiceAndRisk({html,persona,content_type:'ARTICLE'});
  assert.equal(a.deterministic_precheck_passed,true,JSON.stringify(a.issues));
  assert.equal(a.independent_professional_qa_verified,false);
  assert.equal(a.ai_origin_detection_performed,false);
  assert.equal(a.can_publish,false);
 }
});
test('real Gemini 3.5 pilot defective headline and boilerplate are rejected',()=>{
 const html=[
  '<h1>Primera visita piso Córdoba</h1>',
  '<h2>Prepara tu primera visita piso Córdoba con calma</h2>',
  '<p>Afrontar esta etapa con un respaldo profesional marca la diferencia entre el acierto y el error.</p>',
  '<h2>Da el siguiente paso con asesoramiento experto</h2>',
  '<p>Nunca debes firmar ni entregar dinero en señal durante la primera visita sin reflexionar antes.</p>'
 ].join('\n');
 const a=auditSeoHumanVoiceAndRisk({html,persona:'PARTICULARES'});
 assert.equal(a.deterministic_precheck_passed,false);
 for(const code of ['HEADING_UNNATURAL_KEYWORD_SEQUENCE','CANNED_MARKETING_PHRASE',
  'H2_GENERIC_CTA_SCAFFOLDING','ABSOLUTE_FINANCIAL_OR_LEGAL_INSTRUCTION'])
  assert.ok(a.issues.includes(code),code);
 assert.equal(a.can_publish,false);
});
test('long paragraph without punctuation is rejected, and scope remains exact',()=>{
 const text=Array.from({length:65},(_,i)=>i===0?'Te':'ayudamos').join(' ')+' aquí.';
 const a=auditSeoHumanVoiceAndRisk({html:'<h1>Una casa</h1><h2>Qué saber</h2><p>'+text+'</p>',persona:'PARTICULARES'});
 assert.ok(a.issues.includes('LONG_UNPUNCTUATED_PARAGRAPH'));
 assert.throws(()=>auditSeoHumanVoiceAndRisk({html:'<p>Hola</p>',persona:'OTRA_EMPRESA'}));
});

test('actual real Gemini Free 3.5 LAB output is preserved byte-for-byte and rejected for human voice',()=>{
 const file='cerebro/seo-enterprise/v2/training-pilots/SEO_D13_GEMINI_35_FREE_REAL_LAB_003_UNAPPROVED.html';
 const html=fs.readFileSync(file,'utf8');
 const sha=crypto.createHash('sha256').update(html,'utf8').digest('hex');
 assert.equal(sha,'0306e2e5c126e6e34e8673dc7432188930f41406fce09ff4efb6d3c147e93a1c');
 const result=auditSeoHumanVoiceAndRisk({html,persona:'PARTICULARES',content_type:'ARTICLE'});
 assert.equal(result.deterministic_precheck_passed,false);
 assert.ok(result.issues.includes('HEADING_UNNATURAL_KEYWORD_SEQUENCE'));
 assert.ok(result.issues.includes('H2_GENERIC_CTA_SCAFFOLDING'));
 assert.ok(result.issues.includes('CANNED_MARKETING_PHRASE'));
 assert.ok(result.issues.includes('ABSOLUTE_FINANCIAL_OR_LEGAL_INSTRUCTION'));
 assert.equal(result.can_publish,false);
});

test('actual V4 B2C buyer-cost wording triggers professional tax allocation review',()=>{
 const html='<h1>Comparar dos pisos</h1><h2>Gastos que debes revisar</h2>'+
  '<p>Existen impuestos autonómicos y municipales como el impuesto sobre transmisiones patrimoniales o la plusvalía que varían según el caso.</p>';
 const a=auditSeoHumanVoiceAndRisk({html,persona:'PARTICULARES'});
 assert.equal(a.deterministic_precheck_passed,false);
 assert.ok(a.issues.includes('PLUSVALIA_BUYER_COST_TAX_ALLOCATION_REQUIRES_REVIEW'));
 assert.equal(a.factual_claims_verified,false);
});
test('actual V4 B2B forced keyword, mandatory consent and second-visit deadline are HOLD',()=>{
 const html='<h1>Derivar compradores</h1>'+
 '<h2>Hitos clave en la derivación hipotecaria inmobiliarias Córdoba</h2>'+
 '<p>Antes de compartir cualquier detalle con el experto hipotecario, el cliente firma una autorización específica para el tratamiento de su información.</p>'+
 '<p>El primer hito ocurre tras la segunda visita a la vivienda, momento en el cual el comprador valora seriamente presentar una propuesta.</p>';
 const a=auditSeoHumanVoiceAndRisk({html,persona:'INMOBILIARIAS'});
 assert.equal(a.deterministic_precheck_passed,false);
 for(const issue of ['B2B_KEYWORD_STUFFING_UNNATURAL_HEADING',
  'GDPR_MANDATORY_CONSENT_ASSERTION_REQUIRES_LEGAL_CHECK',
  'UNSUPPORTED_FIXED_SECOND_VISIT_HITO'])
  assert.ok(a.issues.includes(issue),issue);
 assert.equal(a.can_publish,false);
});

test('later real B2B FAQ cannot force second visit as mandatory referral milestone',()=>{
 const h='<h1>Coordinación responsable</h1><h2>FAQ para agencias</h2>'+
 '<p>Conviene presentar al asesor tras la segunda visita cuando el comprador muestra interés.</p>';
 const r=auditSeoHumanVoiceAndRisk({html:h,persona:'INMOBILIARIAS'});
 assert.ok(r.issues.includes('ARBITRARY_B2B_SECOND_VISIT_RULE'));
 assert.equal(r.independent_professional_qa_verified,false);
});
test('later real B2C FAQ overclaims note-simple area and invents observations',()=>{
 const h='<h1>Cómo elegir vivienda</h1><h2>La visita</h2>'+
 '<p>Mientras que el primer piso destacaba por una cocina moderna reformada recientemente, el segundo ofrecía una terraza amplia.</p>'+
 '<p>La nota simple permite verificar su superficie exacta y confirmar que no existen cargas.</p>';
 const r=auditSeoHumanVoiceAndRisk({html:h,persona:'PARTICULARES'});
 assert.ok(r.issues.includes('REGISTER_INFORMATION_OVERCLAIM_REQUIRES_LEGAL_REVIEW'));
 assert.ok(r.issues.includes('UNVERIFIED_CASE_DETAILS_PRESENTED_AS_OBSERVED'));
 assert.equal(r.can_publish,false);
});


test('immutable V4.2 B2B copy is blocked for mortgage promises and premature dismissal',()=>{
 const file='cerebro/seo-enterprise/v2/drafts/v4-2-review-only/inmobiliarias-v4-2-review-only.html';
 const html=fs.readFileSync(file,'utf8');
 const blob=crypto.createHash('sha1').update('blob '+Buffer.byteLength(html)+'\0').update(html).digest('hex');
 assert.equal(blob,'019ca268df22adb7e995a39771446a3774740398');
 const r=auditSeoHumanVoiceAndRisk({html,persona:'INMOBILIARIAS'});
 assert.equal(r.deterministic_precheck_passed,false);
 assert.ok(r.issues.includes('UNWARRANTED_MORTGAGE_SUCCESS_GUARANTEE'));
 assert.ok(r.issues.includes('UNILATERAL_TRANSACTION_DISMISSAL_REQUIRES_REVIEW'));
 assert.equal(r.independent_professional_qa_verified,false);
 assert.equal(r.can_publish,false);
});
test('conditional wording does not trigger a false mortgage success promise',()=>{
 const html='<h1>Financiación prudente</h1><h2>Plazos realistas</h2><p>La coordinación facilita el seguimiento, pero no garantiza la aprobación de la hipoteca. Si el banco la deniega, las partes revisan sus opciones y compromisos.</p>';
 const r=auditSeoHumanVoiceAndRisk({html,persona:'INMOBILIARIAS'});
 assert.ok(!r.issues.includes('UNWARRANTED_MORTGAGE_SUCCESS_GUARANTEE'));
 assert.ok(!r.issues.includes('UNILATERAL_TRANSACTION_DISMISSAL_REQUIRES_REVIEW'));
 assert.equal(r.can_publish,false);
});


test('V4.3 B2B preserves V4.2 and repairs only two owner-review claim risks',()=>{
 const parent='cerebro/seo-enterprise/v2/drafts/v4-2-review-only/inmobiliarias-v4-2-review-only.html';
 const candidate='cerebro/seo-enterprise/v2/drafts/v4-3-review-only/inmobiliarias-v4-3-review-only.html';
 const prior=fs.readFileSync(parent,'utf8');
 const updated=fs.readFileSync(candidate,'utf8');
 const blob=crypto.createHash('sha1').update('blob '+Buffer.byteLength(prior)+'\0').update(prior).digest('hex');
 assert.equal(blob,'019ca268df22adb7e995a39771446a3774740398');
 const changes=[
  ['Si el análisis financiero desvela dificultades insalvables, la operación se desestima de forma limpia antes de firmar arras, protegiendo tanto los intereses del vendedor como la reputación de la agencia intermediaria.',
   'Si el análisis financiero detecta obstáculos importantes, conviene revisar las alternativas y los compromisos ya asumidos antes de recomendar una decisión. La continuidad o cancelación de la operación depende de las partes y de lo pactado, con asesoramiento cuando proceda.'],
  ['La paciencia y el rigor metodológico durante estas semanas de espera aseguran que la operación llegue a buen puerto con garantías sólidas para todas las partes.',
   'Mantener información contrastada y expectativas realistas ayuda a coordinar a las partes, pero no garantiza que el banco apruebe la financiación ni que la compraventa llegue a firmarse.']
 ];
 let expected=prior;
 for(const [before,after] of changes){
  assert.equal(expected.split(before).length,2);
  expected=expected.replace(before,after);
 }
 assert.equal(updated,expected,'Only the two approved safety proposals may differ from V4.2');
 const r=auditSeoHumanVoiceAndRisk({html:updated,persona:'INMOBILIARIAS'});
 assert.deepEqual(r.issues,[]);
 assert.equal(r.deterministic_precheck_passed,true);
 assert.equal(r.independent_professional_qa_verified,false);
 assert.equal(r.can_publish,false);
 console.log('SEO001_V43_B2B_CONTENT_SHA256='+crypto.createHash('sha256').update(updated).digest('hex'));
});


test('V4.3 B2B registry binds actual bytes and denies production authority',()=>{
 const path='cerebro/seo-enterprise/v2/registry/seo001-v4-3-b2b-review-only-2026-11-06.json';
 const registry=JSON.parse(fs.readFileSync(path,'utf8'));
 const data=fs.readFileSync(registry.candidate_file);
 const digest=crypto.createHash('sha256').update(data).digest('hex');
 assert.equal(digest,registry.candidate_sha256);
 assert.equal(registry.source_sha256,'3884b376c91516d28d3b3b82ec429964f134c32c164ec6e2649af01099b59a4c');
 assert.equal(registry.proof.github_workflow_run,42288032135);
 assert.equal(registry.machine_d31_precheck_pass,true);
 for(const field of [
  'professional_ymyl_review_verified','independent_seo_review_verified',
  'legal_review_completed','owner_exact_digest_approved',
  'core_guard_authorized_write','wordpress_restore_real_verified',
  'ums_original_photo_ready','wordpress_drafts_created',
  'publish_authorized','autonomous_production_ready'
 ]) assert.equal(registry[field],false,field);
 assert.equal(registry.wordpress_writes,0);
 assert.equal(registry.paid_api_calls_this_revision,0);
});


test('V4.3 B2C fixes exact source-locked allocation and technical-safety wording',()=>{
 const src='cerebro/seo-enterprise/v2/drafts/v4-2-review-only/compradores-v4-2-review-only.html';
 const dst='cerebro/seo-enterprise/v2/drafts/v4-3-review-only/compradores-v4-3-review-only.html';
 const before=fs.readFileSync(src,'utf8');
 const after=fs.readFileSync(dst,'utf8');
 const blob=crypto.createHash('sha1').update('blob '+Buffer.byteLength(before)+'\0').update(before).digest('hex');
 assert.equal(blob,'c7595cd49a1fc8d86dd41aa6db6bee24d4e531fa');
 const changes=[
  ['Los impuestos autonómicos y locales, los honorarios notariales, la inscripción registral y los gastos de gestoría incrementan de forma notable la cantidad inicial necesaria para formalizar la compraventa con total tranquilidad.',
   'Separa los impuestos y gastos propios de la compraventa de los gastos de formalización de la hipoteca. En préstamos sujetos a la Ley 5/2019, el banco asume la notaría, el registro y la gestoría del préstamo, mientras la tasación corresponde al prestatario. Antes de calcular tus ahorros, revisa los costes concretos de la compra y de la financiación por separado.'],
  ['Resolver estos problemas estructurales requiere presupuestos elevados que deben sumarse al coste total del inmueble antes de tomar ninguna determinación definitiva.',
   'No todas las humedades tienen la misma causa ni el mismo coste de reparación. Si detectas indicios, solicita una valoración técnica y compárala con el presupuesto de reforma antes de decidir.'],
  ['Comprueba también si el cuadro eléctrico cumple con la normativa vigente o si necesita una actualización completa para soportar los electrodomésticos actuales sin saltar constantemente.',
   'Antes de dar por buena la instalación, solicita una revisión a un profesional habilitado y, si procede, un presupuesto para mejorar la seguridad eléctrica y adaptar el suministro a tus necesidades.'],
  ['Contrastar diferentes escenarios de amortización te permite entender cómo afectarán las fluctuaciones del euríbor a tus cuotas mensuales en un horizonte temporal amplio y sostenible.',
   'Si comparas hipotecas variables o con tramos variables, simular distintos escenarios de euríbor te ayudará a comprender cómo podrían cambiar las cuotas, sin dar por segura ninguna evolución futura.'],
  ['Debes calcular los impuestos autonómicos, notariales, registrales, de gestoría y la cuota mensual de comunidad junto con posibles derramas aprobadas en el edificio.',
   'Calcula los impuestos y gastos de compraventa que te correspondan, distinguiéndolos de los del préstamo hipotecario. Añade comunidad, IBI y posibles derramas al presupuesto de mantenimiento.']
 ];
 let expected=before;
 for(const [from,to] of changes){
  assert.equal(expected.split(from).length,2);
  expected=expected.replace(from,to);
 }
 assert.equal(after,expected);
 const oldAudit=auditSeoHumanVoiceAndRisk({html:before,persona:'PARTICULARES'});
 assert.ok(oldAudit.issues.includes('PURCHASE_MORTGAGE_FEES_UNDIFFERENTIATED'));
 const newAudit=auditSeoHumanVoiceAndRisk({html:after,persona:'PARTICULARES'});
 assert.deepEqual(newAudit.issues,[]);
 assert.equal(newAudit.independent_professional_qa_verified,false);
 assert.equal(newAudit.can_publish,false);
 console.log('SEO001_V43_B2C_CONTENT_SHA256='+crypto.createHash('sha256').update(after).digest('hex'));
});


test('V4.3 B2C registry binds exact content and stays permanently unpublished',()=>{
 const path='cerebro/seo-enterprise/v2/registry/seo001-v4-3-b2c-review-only-2026-11-06.json';
 const registry=JSON.parse(fs.readFileSync(path,'utf8'));
 const bytes=fs.readFileSync(registry.candidate_file);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),registry.candidate_sha256);
 assert.equal(registry.source_git_blob,'c7595cd49a1fc8d86dd41aa6db6bee24d4e531fa');
 assert.equal(registry.proof.github_workflow_run,42288583619);
 assert.equal(registry.machine_d31_precheck_pass,true);
 for(const key of [
  'professional_ymyl_review_verified','independent_seo_review_verified',
  'legal_review_completed','owner_exact_digest_approved',
  'core_guard_authorized_write','wordpress_restore_real_verified',
  'ums_original_photo_ready','wordpress_drafts_created',
  'publish_authorized','autonomous_production_ready'
 ]) assert.equal(registry[key],false,key);
 assert.equal(registry.wordpress_writes,0);
 assert.equal(registry.paid_api_calls_this_revision,0);
});

test('V4.4 source-locked legal review only preserves exact V4.3 bytes and rejects untracked edits',()=>{
 const reg=JSON.parse(fs.readFileSync('cerebro/seo-enterprise/v2/registry/seo001-v4-4-legal-source-locked-review-only-2026-11-06.json','utf8'));
 assert.equal(reg.company_id,'fenix');
 assert.equal(reg.engine_id,'SEO-001');
 assert.equal(reg.environment,'PREPROD');
 assert.equal(reg.version,'V4.4-REVIEW-ONLY');
 assert.equal(reg.candidates.length,2);
 const lockedPatch=(input,entry)=>{
  const digest=crypto.createHash('sha256').update(input).digest('hex');
  assert.equal(digest,entry.source_sha256,'SOURCE_SHA_MISMATCH');
  let out=input;
  for(const change of entry.changes){
   assert.equal(out.split(change.from).length,2,'UNIQUE_SOURCE_TEXT_REQUIRED:'+change.risk);
   out=out.replace(change.from,change.to);
  }
  return out;
 };
 for(const entry of reg.candidates){
  const original=fs.readFileSync(entry.source_file,'utf8');
  const candidate=fs.readFileSync(entry.candidate_file,'utf8');
  const gitSha=crypto.createHash('sha1').update('blob '+Buffer.byteLength(original)+'\0').update(original).digest('hex');
  assert.equal(gitSha,entry.source_git_blob);
  assert.equal(lockedPatch(original,entry),candidate,'NO_UNTRACKED_TEXT_EDITS');
  assert.equal(crypto.createHash('sha256').update(candidate).digest('hex'),entry.candidate_sha256);
  assert.throws(()=>lockedPatch(original+'\n<!-- tamper -->',entry),/SOURCE_SHA_MISMATCH/);
  assert.equal(entry.professional_legal_review_verified,false);
  const audit=auditSeoHumanVoiceAndRisk({html:candidate,persona:entry.persona,content_type:'ARTICLE'});
  assert.deepEqual(audit.issues,[],JSON.stringify(audit.issues));
  assert.equal(audit.independent_professional_qa_verified,false);
  assert.equal(audit.can_publish,false);
  console.log('SEO001_V44_'+(entry.persona==='PARTICULARES'?'B2C':'B2B')+'_CONTENT_SHA256='+entry.candidate_sha256);
 }
 for(const key of [
  'professional_ymyl_review_verified','independent_seo_review_verified','legal_review_completed',
  'wordpress_restore_real_verified','core_guard_authorized_write','wordpress_draft_iam_verified',
  'ums_original_photo_ready','owner_exact_digest_approved','wordpress_drafts_created',
  'publish_authorized','autonomous_production_ready'
 ])assert.equal(reg[key],false,'NO_AUTONOMOUS_RELEASE:'+key);
 assert.equal(reg.wordpress_writes,0);
 assert.equal(reg.paid_api_calls_this_revision,0);
});

test('V4.4 explicit source-specific legal facts; no generalized consent or administrator-only certificate',()=>{
 const b2c=fs.readFileSync('cerebro/seo-enterprise/v2/drafts/v4-4-review-only/compradores-v4-4-review-only.html','utf8');
 assert.doesNotMatch(b2c,/certificado de estar al corriente.{0,100}emitido por el administrador/i);
 assert.match(b2c,/artículo 9\.1\.e de la Ley de Propiedad Horizontal/);
 assert.match(b2c,/funciones de secretario, con el visto bueno del presidente/);
 assert.match(b2c,/comprador exonere expresamente al vendedor/);
 assert.match(b2c,/las últimas actas de la comunidad/);
 const b2b=fs.readFileSync('cerebro/seo-enterprise/v2/drafts/v4-4-review-only/inmobiliarias-v4-4-review-only.html','utf8');
 assert.doesNotMatch(b2b,/¿Hace falta consentimiento para derivar al comprador\?<\/h3><p>No necesariamente/);
 assert.match(b2b,/identificar y documentar la base jurídica aplicable/);
 assert.match(b2b,/consentimiento, este debe ser libre, informado e inequívoco/);
 assert.match(b2b,/cesión a terceros puede requerir una manifestación diferenciada/);
 assert.match(b2b,/los nuevos agentes que se incorporen al equipo/);
});
