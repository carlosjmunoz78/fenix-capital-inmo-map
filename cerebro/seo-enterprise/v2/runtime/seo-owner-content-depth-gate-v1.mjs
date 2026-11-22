/**
 * SEO-001 owner content-depth floor V1. Never claims Google ranking benefits.
 * A FAQ block does not count towards the substantive article/landing body floor.
 * Pure, zero-cost check; all outcomes remain review-only and fail-closed.
 */
import fs from 'node:fs';
import {auditSeoFaqContract} from './seo-owner-editorial-visual-gate-v2.mjs';

export const DEPTH_POLICY_PATH='cerebro/seo-enterprise/v2/seo-owner-content-depth-policy-v1-2026-11-06.json';
const deny=code=>{throw Error('SEO_CONTENT_DEPTH_'+code)};
const visible=html=>String(html||'').replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<(?:script|style|template)\b[^>]*>[\s\S]*?<\/(?:script|style|template)>/gi,' ')
 .replace(/<[^>]*>/g,' ')
 .replace(/&(?:nbsp|amp|quot|apos);|&#(?:160|38|34|39);/gi,' ')
 .replace(/\s+/g,' ').trim();
const words=s=>visible(s).match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[];
const normalized=s=>visible(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const ratio=(a,b)=>{
 const as=new Set(normalized(a).split(' ').filter(Boolean));
 const bs=new Set(normalized(b).split(' ').filter(Boolean));
 if(!as.size||!bs.size)return 0;
 const intersection=[...as].filter(x=>bs.has(x)).length;
 return intersection/(as.size+bs.size-intersection);
};
export function auditSeoContentDepth({html,persona,content_type='ARTICLE',policy=null}={}){
 if(!['ARTICLE','LANDING'].includes(content_type)||!['PARTICULARES','INMOBILIARIAS'].includes(persona))
  deny('SCOPE');
 if(typeof html!=='string'||html.length<100)deny('HTML_REQUIRED');
 const p=policy||JSON.parse(fs.readFileSync(DEPTH_POLICY_PATH,'utf8'));
 if(p.company_id!=='fenix'||p.engine_id!=='SEO-001'||p.version!=='1.0.0'||!p.faq_separate_from_body_count)
  deny('POLICY_INVALID');
 const bounds=p.minimums?.[content_type];
 if(!bounds||bounds.total_visible_words<500||bounds.main_content_words_excluding_faq<450)
  deny('POLICY_BOUNDS_INVALID');
 // Legacy pilot HTML has a single FAQ section. Refuse ambiguous/malformed sections,
 // not merely the headline count, to avoid allowing FAQ padding through.
 const faqBlocks=[...html.matchAll(/<section\b[^>]*class=["'][^"']*\bfaq\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi)];
 const faqContents=faqBlocks.map(x=>x[0]);
 let main=html;
 for(const block of faqContents)main=main.replace(block,' ');
 const overall=words(html).length;
 const mainCount=words(main).length;
 const faqCount=faqContents.reduce((n,b)=>n+words(b).length,0);
 const bodyParas=[...main.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)].map(m=>visible(m[1]))
  .filter(Boolean);
 const mainHeadings=[...main.matchAll(/<h2(?:\s[^>]*)?>([\s\S]*?)<\/h2>/gi)]
  .map(m=>visible(m[1])).filter(Boolean);
 const issues=[];
 if(faqBlocks.length!==1)issues.push('FAQ_SECTION_STRUCTURE_INVALID');
 if(overall<bounds.total_visible_words)issues.push('TOTAL_WORDS_BELOW_MINIMUM');
 if(mainCount<bounds.main_content_words_excluding_faq)issues.push('MAIN_WORDS_BELOW_MINIMUM');
 if(bodyParas.length<bounds.main_paragraphs)issues.push('MAIN_PARAGRAPHS_BELOW_MINIMUM');
 if(mainHeadings.length<4)issues.push('MAIN_SECTION_COVERAGE_TOO_THIN');
 if(bodyParas.filter(x=>words(x).length<12).length>Math.max(2,Math.floor(bodyParas.length*0.3)))
  issues.push('TOO_MANY_MEANINGLESS_SHORT_PARAGRAPHS');
 const duplicateSet=new Set();
 for(let i=0;i<bodyParas.length;i++)for(let j=i+1;j<bodyParas.length;j++){
  if((words(bodyParas[i]).length>=22&&words(bodyParas[j]).length>=22&&
     ratio(bodyParas[i],bodyParas[j])>=0.83)||
     normalized(bodyParas[i])===normalized(bodyParas[j]))duplicateSet.add(i+':'+j);
 }
 if(duplicateSet.size)issues.push('REPEATED_OR_NEAR_DUPLICATE_PARAGRAPHS');
 if(mainHeadings.length!==new Set(mainHeadings.map(normalized)).size)issues.push('REPEATED_H2');
 const faq=auditSeoFaqContract({html,content_type});
 if(!faq.passed)issues.push(...faq.issues.map(x=>'FAQ_'+x));
 if(faq.count<bounds.faq_items)issues.push('FAQ_COUNT_BELOW_MINIMUM');
 if(p.no_padding_to_reach_minimum!==true||p.independent_expert_editorial_review_required!==true)
  deny('QUALITY_POLICY_WEAKENED');
 return Object.freeze({
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0',
  content_type,persona,
  total_visible_words:overall,
  main_content_words_excluding_faq:mainCount,
  faq_section_words:faqCount,
  main_paragraph_count:bodyParas.length,
  main_h2_count:mainHeadings.length,
  faq_count:faq.count,
  required_total_words:bounds.total_visible_words,
  required_main_words:bounds.main_content_words_excluding_faq,
  preferred_total_words:bounds.preferred_total_words,
  issues:Object.freeze([...new Set(issues)]),
  status:issues.length?'DEPTH_HOLD':'DEPTH_PRECHECK_PASS_RELEASE_HOLD',
  preliminary_depth_check_passed:issues.length===0,
  buyer_persona_independent_relevance_verified:false,
  no_filler_independently_verified:false,
  factual_ymyl_qa_verified:false,
  google_ranking_guaranteed:false,
  publish_authorized:false,
  wordpress_writes_authorized:false,
  ai_spend_authorized:false
 });
}
