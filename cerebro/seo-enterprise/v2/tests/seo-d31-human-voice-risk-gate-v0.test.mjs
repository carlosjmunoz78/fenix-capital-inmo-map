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
