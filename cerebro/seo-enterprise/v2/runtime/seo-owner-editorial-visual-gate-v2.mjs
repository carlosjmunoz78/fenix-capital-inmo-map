/** SEO-001 owner copy + UMS-001 image contract V2. Pure deterministic checks.
 * An anti-template lint is not an "AI detector" and never proves human authorship.
 * Visual audit flags are claims until supported by an independent media QA receipt.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
const h=s=>crypto.createHash('sha256').update(s).digest('hex');
const deny=x=>{throw Error('SEO_OWNER_STYLE_'+x)};
export const STYLE_POLICY_PATH='cerebro/seo-enterprise/v2/seo-owner-copy-visual-standard-v2-2026-11-06.json';
const plain=s=>String(s||'').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]*>/g,' ')
 .replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const between=(html,tag)=>[...String(html).matchAll(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','gi'))].map(x=>plain(x[1]));
export function auditOwnerEditorialCopy({html,persona,content_type='ARTICLE',policy=null}={}){
 const p=policy||JSON.parse(fs.readFileSync(STYLE_POLICY_PATH,'utf8'));
 if(!['PARTICULARES','INMOBILIARIAS'].includes(persona))deny('PERSONA_SCOPE');
 if(p.company_id!=='fenix'||p.engine_id!=='SEO-001'||p.editorial?.colons_in_visible_text_forbidden!==true)deny('POLICY_SCOPE');
 if(typeof html!=='string'||html.length<100)deny('HTML_REQUIRED');
 const text=plain(html),h1=between(html,'h1'),h2=between(html,'h2'),body=text.split(/\s+/).filter(Boolean);
 const issues=[];
 if(h1.length!==1)issues.push('H1_EXACTLY_ONE');
 if(h1.some(v=>v.length>p.editorial.h1_max_visible_characters))issues.push('H1_TOO_LONG');
 if(h2.length<3||h2.length>8)issues.push('H2_COUNT_NOT_FITTED');
 if(h2.some(v=>v.length>p.editorial.h2_max_visible_characters))issues.push('H2_TOO_LONG');
 if(h2.some(v=>/^\s*(?:\d+[.\s)-]+|(?:primero|segundo|tercero)\b)/i.test(v)))issues.push('NUMBERED_H2');
 if(text.includes(':'))issues.push('COLON_VISIBLE_TEXT');
 if(/\bademás\b/i.test(text))issues.push('OWNER_BANNED_ADEMAS');
 if(/\ben conclusión\b/i.test(text))issues.push('OWNER_BANNED_EN_CONCLUSION');
 if(body.length>p.editorial.pilot_body_words_range[1])issues.push('UNNECESSARILY_LONG');
 if(body.length<p.editorial.pilot_body_words_range[0])issues.push('INSUFFICIENT_SUBSTANCE');
 if(/<script\b|<iframe\b|<form\b/i.test(html))issues.push('UNAPPROVED_EMBED');
 if(!html.includes('https://fenixcapital.es/contacto/'))issues.push('NO_CONTACT_CTA');
 const faq=auditSeoFaqContract({html,content_type,policy:p});
 issues.push(...faq.issues.map(x=>'FAQ_'+x));
 return Object.freeze({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'2.0.0',
  persona,content_type,word_count:body.length,h1,h2,faq_count:faq.count,faq_required:faq.minimum,sha256:h(html),issues,
  deterministic_style_precheck_passed:issues.length===0,copy_is_human_certified:false,
  customer_approved:false,prod_publish_authorized:false,
  buyer_persona_relevance_requires_editorial_review:true,
  detected_ai_origin:false,ai_origin_detection_not_performed:true});
}
const validateText=(v,k)=>{if(typeof v!=='string'||v.trim().length<8||v.includes(':')||/\bademás\b|\ben conclusión\b/i.test(v))deny(k);return v.trim()};
export function buildSeoProducerImageOrder({
 company_id='fenix',work_id,persona,subject,visual_intent,
 title,alt,caption,description,filename,source_content_sha256
}={}){
 if(company_id!=='fenix'||!/^SEO001-FENIX-B2[BC]-EDITORIAL-00[12]$/.test(work_id)||!['PARTICULARES','INMOBILIARIAS'].includes(persona)||!/^[a-f0-9]{64}$/.test(source_content_sha256||''))deny('IMAGE_SCOPE');
 if(!/^[a-z0-9][a-z0-9-]+\.webp$/.test(filename||''))deny('IMAGE_FILENAME');
 for(const [k,v] of Object.entries({title,alt,caption,description,subject,visual_intent}))validateText(v,k.toUpperCase());
 const idempotency_key=h(company_id+'|'+work_id+'|'+source_content_sha256+'|IMAGE_HERO_V2');
 return Object.freeze({schema_version:'2.0.0',company_id,engine_id:'SEO-001',environment:'PREPROD',version:'2.0.0',
  work_id,persona,source_content_sha256,image_role:'HERO',width:1200,height:630,format:'webp',
  producer_engine:'UMS-001',existing_creative_capability:null,
  photo_producer_binding_status:'HOLD_NO_CERTIFIED_TEXT_FREE_IMAGE_GENERATOR',
  existing_graphic_text_overlay_renderer_forbidden:true,
  provider_credentials_verified:false,photo_provider_cost_ceiling_verified:false,
  request_id:'seo-image-'+idempotency_key.slice(0,24),idempotency_key,
  brief:{subject,visual_intent,visual_style:'HIGH_QUALITY_ORIGINAL_PHOTOGRAPH_CORDOBA',
   base_prompt:subject+'. '+visual_intent+'. Fotografía editorial original, clara, atractiva y natural, composición cuidada. Imagen sin letras, palabras, números, rótulos, textos en objetos, logotipos, firmas, marcas de agua ni sobreimpresiones. Sin documentos legibles ni interfaces de pantalla. Sin cartelas ni capas gráficas. No reutilizar composiciones ni imágenes de otros artículos.',
   visible_pixel_text_allowed:false,visible_logo_allowed:false,visible_watermark_allowed:false,
   graphic_overlay_allowed:false,
   use_brand_identity_in_text_overlay:false,image_only:true,
   use_real_customer_faces_without_permission:false},
  wordpress_media_metadata:{title,alt,caption,description,filename,
   media_credit:'Imagen original generada para Fénix Capital',
   rights:'PENDING_LICENSE_AND_PROVENANCE',
   license_reference:'PENDING_PRODUCER_RECEIPT',
   source_brief_id:'seo-image-'+idempotency_key.slice(0,24)},
  required_output_evidence:['IMAGE_BYTES_SHA256','IMAGE_PHASH_AND_DUPLICATE_SEARCH',
   'VISUAL_NO_TEXT_LOGO_WATERMARK','SEPARATE_ALT_TITLE_CAPTION_DESCRIPTION',
   'WEBP_DIMENSIONS','LICENSE_AND_PROVENANCE','SEO_D26_MEDIA_QA','SEO_D31_INDEPENDENT_QA'],
  metadata_must_be_outside_pixels:true,
  image_api_call_executed:false,media_created:false,producer_receipt_verified:false,
  producer_connection_to_paid_api_verified:false,
  api_spend_authorized:false,actual_api_dispatch:false,wordpress_upload_authorized:false,
  publish_authorized:false,additional_subscription_eur:0});
}
export function validateSeoProducerOrder({order,existing_assets=[]}={}){
 if(order?.engine_id!=='SEO-001'||order?.company_id!=='fenix'||order?.producer_engine!=='UMS-001'||order?.environment!=='PREPROD')deny('PRODUCER_SCOPE');
 if(order?.brief?.image_only!==true||order?.brief?.visible_pixel_text_allowed!==false||
  order?.brief?.visible_logo_allowed!==false||order?.brief?.visible_watermark_allowed!==false||
  order?.brief?.graphic_overlay_allowed!==false||order?.metadata_must_be_outside_pixels!==true||
  order?.api_spend_authorized!==false||order?.actual_api_dispatch!==false||
  order?.publish_authorized!==false||order?.wordpress_upload_authorized!==false)deny('VISUAL_POLICY');
 const m=order.wordpress_media_metadata;
 for(const k of ['title','alt','caption','description','filename','media_credit','rights','license_reference','source_brief_id']){
  if(typeof m?.[k]!=='string'||!m[k])deny('MISSING_META_'+k);
 }
 if(existing_assets.some(x=>x.company_id===order.company_id&&x.work_id===order.work_id&&x.asset_role==='HERO'&&x.approved===true))deny('DUPLICATE_HERO_REQUEST');
 return Object.freeze({status:'VALID_SEO_TO_EXISTING_UMS_IMAGE_BRIEF_NOT_DISPATCHED',
  company_id:order.company_id,work_id:order.work_id,
  metadata_complete:true,baked_text_forbidden:true,logo_forbidden:true,
  approval:'QA_REQUIRED_AFTER_PRODUCER_OUTPUT',api_called:false,can_publish:false});
}


/** PREVIEW gate for returned assets. A producer's self-declared visual QA can
 * NEVER certify that the pixels contain no writing or logo; independent media QA
 * evidence and the full searchable inventory are required separately.
 */
const validHash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const validPerceptual=x=>typeof x==='string'&&/^[a-f0-9]{16}$/.test(x);
function hamming64(a,b){
 let xor=BigInt('0x'+a)^BigInt('0x'+b),bits=0;
 while(xor){bits+=Number(xor&1n);xor>>=1n;}
 return bits;
}
export function preflightReturnedSeoMediaAsset({order,asset,existing_assets,inventory_verified=false}={}){
 validateSeoProducerOrder({order});
 if(!inventory_verified||!Array.isArray(existing_assets))deny('ASSET_INVENTORY_MISSING');
 if(asset?.company_id!==order.company_id||asset?.work_id!==order.work_id||
  asset?.request_id!==order.request_id||asset?.media_type!=='IMAGE'||
  !validHash(asset.sha256)||!validPerceptual(asset.perceptual_hash)||
  asset?.width!==order.width||asset?.height!==order.height||
  asset?.format!=='webp')deny('DELIVERY_SCOPE');
 if(!asset.rights_provenance_ref||asset.rights_status!=='VERIFIED_COMMERCIAL_REUSE')deny('IMAGE_RIGHTS_UNVERIFIED');
 for(const previous of existing_assets){
  if(previous?.sha256===asset.sha256)deny('IMAGE_EXACT_REUSE');
  if(validPerceptual(previous?.perceptual_hash)&&
    hamming64(previous.perceptual_hash,asset.perceptual_hash)<=8)deny('IMAGE_NEAR_DUPLICATE');
 }
 return Object.freeze({status:'IMAGE_DELIVERED_UNIQUE_HASH_PREFLIGHT_ONLY',company_id:order.company_id,
  work_id:order.work_id,sha256:asset.sha256,
  independent_no_text_visual_qa_verified:false,independent_no_logo_visual_qa_verified:false,
  image_ready_for_publish:false,wordpress_upload_authorized:false,
  visual_qa_and_composition_review_required:true,
  no_existing_asset_inventory_silent_bypass:true});
}


/** Mandatory buyer-persona FAQ gate. Designed for copy validation, not ranking guarantees.
 * A generated FAQ must answer genuine user questions and still needs source checks.
 */
export function auditSeoFaqContract({html,content_type='ARTICLE',policy=null}={}){
 const p=policy||JSON.parse(fs.readFileSync(STYLE_POLICY_PATH,'utf8'));
 const r=p?.editorial?.faq_rules;
 if(r?.mandatory!==true||r.min_article!==6||r.min_landing!==8)deny('FAQ_POLICY_INVALID');
 if(!['ARTICLE','LANDING'].includes(content_type))deny('CONTENT_TYPE_REQUIRED');
 if(typeof html!=='string')deny('FAQ_HTML_REQUIRED');
 const minimum=content_type==='ARTICLE'?r.min_article:r.min_landing;
 const sections=[...html.matchAll(/<section\b[^>]*class=["'][^"']*\bfaq\b[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi)];
 const issues=[];
 if(sections.length!==1)issues.push('SECTION_REQUIRED_EXACTLY_ONE');
 const section=sections[0]?.[1]||'';
 const questions=[...section.matchAll(/<div\s+class=["']faq-item["']>\s*<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/gi)]
 .map(m=>({q:plain(m[1]),a:plain(m[2])}));
 const h3Count=(section.match(/<h3\b/gi)||[]).length;
 if(questions.length<minimum)issues.push('MINIMUM_NOT_REACHED');
 if(h3Count!==questions.length)issues.push('UNSTRUCTURED_QUESTION');
 if(between(section,'h2').length!==1)issues.push('SECTION_H2_REQUIRED');
 const normalize=q=>q.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 if(new Set(questions.map(x=>normalize(x.q))).size!==questions.length)issues.push('DUPLICATE_QUESTION');
 for(const {q,a} of questions){
  const wc=a.split(/\s+/).filter(Boolean).length;
  if(!q.startsWith('¿')||!q.endsWith('?'))issues.push('QUESTION_MUST_BE_NATURAL');
  if(/^¿?\s*(?:[0-9]+[.\s)-]+|primero|segundo|tercero)/i.test(q))issues.push('QUESTION_NUMBERING');
  if(q.length>105||q.length<15)issues.push('QUESTION_LENGTH');
  if(wc<12||wc>65)issues.push('ANSWER_USEFUL_BUT_COMPACT');
  if((q+' '+a).includes(':')||/\bademás\b|\ben conclusión\b/i.test(q+' '+a))
   issues.push('OWNER_LANGUAGE_RULE');
 }
 return Object.freeze({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  content_type,minimum,count:questions.length,issues,
  passed:issues.length===0,faq_editorial_relevance_verified:false,
  faq_snippet_appearance_guaranteed:false,publish_authorized:false});
}
