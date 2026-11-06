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
