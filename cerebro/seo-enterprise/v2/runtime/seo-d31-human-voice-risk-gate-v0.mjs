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

 if(persona==='INMOBILIARIAS'&&
  /(?:conviene|debe|debemos|es\s+recomendable)\s+(?:presentar|derivar|conectar).{0,75}(?:tras|despu[eé]s\s+de)\s+la\s+segunda\s+visita/i.test(joined))
  issues.push('ARBITRARY_B2B_SECOND_VISIT_RULE');
 if(persona==='PARTICULARES'&&
  /(?:nota\s+simple.{0,135}(?:superficie\s+exacta|confirmar\s+que\s+no\s+existen\s+cargas))/i.test(joined))
  issues.push('REGISTER_INFORMATION_OVERCLAIM_REQUIRES_LEGAL_REVIEW');
 if(persona==='PARTICULARES'&&
  /el\s+primer\s+piso\s+destacaba.{0,150}el\s+segundo\s+ofrec[ií]a/i.test(joined))
  issues.push('UNVERIFIED_CASE_DETAILS_PRESENTED_AS_OBSERVED');
 // Prevent unqualified grouping of property purchase fees with mortgage expenses.
 if(persona==='PARTICULARES'&&
  /impuestos auton[oó]micos y locales.{0,120}honorarios notariales.{0,90}inscripci[oó]n registral.{0,110}gastos de gestor[ií]a/i.test(joined))
  issues.push('PURCHASE_MORTGAGE_FEES_UNDIFFERENTIATED');
 // Financial referrals cannot guarantee bank approval.
 if(persona==='INMOBILIARIAS'&&
  /\b(?:aseguran|garantizan)\s+que.{0,85}(?:operaci[oó]n|hipoteca|pr[eé]stamo).{0,95}(?:buen\s+puerto|con\s+[eé]xito|ser[aá]\s+aprobada)/i.test(joined))
  issues.push('UNWARRANTED_MORTGAGE_SUCCESS_GUARANTEE');
 if(persona==='INMOBILIARIAS'&&
  /si\s+el\s+an[aá]lisis\s+financiero.{0,80}dificultades\s+insalvables.{0,100}la\s+operaci[oó]n\s+se\s+desestima/i.test(joined))
  issues.push('UNILATERAL_TRANSACTION_DISMISSAL_REQUIRES_REVIEW');
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
