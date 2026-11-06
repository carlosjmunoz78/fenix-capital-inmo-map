/**
 * CEREBRO SEO-D31 · deterministic anti-template and risky-claim precheck.
 * Not an "AI detector" nor a substitute for independent editorial/YMYL review.
 * Owner feedback 2026-11-06: short human H1/H2, buyer persona, no boilerplate.
 */
const strip=s=>String(s||'').replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ')
 .replace(/\s+/g,' ').trim();
const contents=(html,tag)=>[...String(html).matchAll(
 new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','gi')
)].map(x=>strip(x[1]));
export function auditSeoHumanVoiceAndRisk({html,persona,content_type='ARTICLE'}={}){
 if(!['PARTICULARES','INMOBILIARIAS'].includes(persona)||
  !['ARTICLE','LANDING'].includes(content_type)||typeof html!=='string')
  throw Error('SEO_D31_HUMAN_VOICE_SCOPE');
 const h1=contents(html,'h1'),h2=contents(html,'h2'),p=contents(html,'p');
 const joined=[...h1,...h2,...p].join(' ');
 const issues=[];
 // Keyword stuffing commonly destroys Spanish prepositions. Flag these as
 // obvious grammar cues, while still requiring a broader editorial review.
 if([...h1,...h2].some(s=>/\b(?:primera\s+)?visita\s+piso\s+córdoba\b/i.test(s)||
   /\b(?:comprar|alquilar|venta|compras?|ventas?)\s+pisos?\s+córdoba\b/i.test(s)))
  issues.push('HEADING_UNNATURAL_KEYWORD_SEQUENCE');
 if([...h1,...h2].some(s=>/^(?:da|demos)\s+el\s+siguiente\s+paso\s+con\s+(?:un\s+)?asesoramiento\s+experto/i.test(s)))
  issues.push('H2_GENERIC_CTA_SCAFFOLDING');
 if(/marca(?:\s+realmente)?\s+la\s+diferencia\s+entre\s+el\s+acierto\s+y\s+el\s+error/i.test(joined)||
  /con\s+total\s+realismo\s+y\s+evitar\s+sorpresas\s+financieras\s+desagradables/i.test(joined))
  issues.push('CANNED_MARKETING_PHRASE');
 if(/\bnunca\s+debes\s+(?:firmar|entregar\s+dinero|reservar|pagar)\b/i.test(joined)||
    /\bsiempre\s+debes\s+(?:firmar|entregar\s+dinero|reservar|pagar)\b/i.test(joined))
  issues.push('ABSOLUTE_FINANCIAL_OR_LEGAL_INSTRUCTION');

 // Regression against factual/legal problems in a real Free-cloud V4 sample.
 // These are risk flags requiring source review, not declarations of illegality.
 if(persona==='PARTICULARES'&&
   /(?:impuestos?.{0,105}(?:plusval[ií]a)|plusval[ií]a.{0,65}(?:comprador|pagar|gastos?))/i.test(joined))
   issues.push('PLUSVALIA_BUYER_COST_TAX_ALLOCATION_REQUIRES_REVIEW');
 if(persona==='INMOBILIARIAS'&&
   /derivaci[oó]n hipotecaria inmobiliarias c[oó]rdoba/i.test([...h1,...h2].join(' ')))
   issues.push('B2B_KEYWORD_STUFFING_UNNATURAL_HEADING');
 if(persona==='INMOBILIARIAS'&&
   /(?:cliente|comprador)\s+firma\s+una\s+autorizaci[oó]n\s+espec[ií]fica\s+para\s+el\s+tratamiento/i.test(joined))
   issues.push('GDPR_MANDATORY_CONSENT_ASSERTION_REQUIRES_LEGAL_CHECK');
 if(persona==='INMOBILIARIAS'&&
   /primer\s+hito\s+ocurre\s+tras\s+la\s+segunda\s+visita/i.test(joined))
   issues.push('UNSUPPORTED_FIXED_SECOND_VISIT_HITO');
 if(p.some(s=>s.split(/\s+/).length>55&&
  (s.match(/[,.!?;]/g)||[]).length<=1))
  issues.push('LONG_UNPUNCTUATED_PARAGRAPH');
 return Object.freeze({company_id:'fenix',engine_id:'SEO-D31',
  environment:'PREPROD',version:'0.1.0',persona,content_type,
  issues:Object.freeze([...new Set(issues)]),
  deterministic_precheck_passed:issues.length===0,
  independent_professional_qa_verified:false,
  factual_claims_verified:false,ai_origin_detection_performed:false,
  customer_approval:false,can_publish:false});
}
