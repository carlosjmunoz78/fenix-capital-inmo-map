/** SEO-001: offline WordPress draft QA, no secrets, no HTTP or WordPress mutations.
 * A source-backed distinction: <details> outside FAQ must NOT count as FAQ.
 * The existing CSS accordion may be accessible; never auto-rewrite it for H3 without visual QA.
 */
import fs from 'node:fs';
const POLICY_PATH='cerebro/seo-enterprise/v2/seo-owner-copy-visual-standard-v2-2026-11-06.json';
const SOURCE_IDS=new Map([[52660,'post'],[52661,'post'],[52662,'page'],[52663,'page']]);
const fail=x=>{throw Error('SEO_DRAFT_QA_'+x)};
const plain=x=>String(x).replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi,' ')
 .replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp);/g,' ').replace(/\s+/g,' ').trim();
const count=(s,pattern)=>(s.match(pattern)||[]).length;
const words=s=>plain(s).split(/\s+/).filter(Boolean).length;
export function auditExistingWordPressSeoDraft({post_id,post_type,status,html,policy=null}={}){
 if(!SOURCE_IDS.has(post_id)||SOURCE_IDS.get(post_id)!==post_type||
   status!=='draft'||typeof html!=='string'||html.length<500)fail('SCOPE');
 const p=policy||JSON.parse(fs.readFileSync(POLICY_PATH,'utf8'));
 if(p.company_id!=='fenix'||p.engine_id!=='SEO-001'||
  p.editorial?.faq_rules?.question_heading_h3_required!==true||
  p.editorial?.faq_rules?.min_article!==6||p.editorial?.faq_rules?.min_landing!==8)
  fail('POLICY_DRIFT');
 const matches=[...html.matchAll(/<section\b[^>]*class=["'][^"']*\bfenix-faq\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi)];
 if(matches.length!==1)fail('MISSING_OR_DUPLICATE_FAQ');
 const faq=matches[0][0];
 const pairs=[...faq.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*<\/details>/gi)];
 const faqDetails=count(faq,/<details\b/gi);
 if(pairs.length!==faqDetails)fail('AMBIGUOUS_ACCORDION_STRUCTURE');
 const outsideDetails=count(html,/<details\b/gi)-faqDetails;
 if(outsideDetails<0)fail('INVALID_DISCOURSE_COUNT');
 const min=post_type==='post'?6:8;
 const cleanQuestions=pairs.map(x=>plain(x[1]));
 const cleanAnswers=pairs.map(x=>plain(x[2]));
 const h3=count(faq,/<h3\b/gi);
 const h2=(html.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi)||[]).length;
 const text=plain(html);
 const issues=[];
 if(pairs.length<min)issues.push('FAQ_MINIMUM_NOT_REACHED');
 if(h3<pairs.length)issues.push('FAQ_HEADING_H3_POLICY_MISMATCH_REQUIRES_DESIGN_REVIEW');
 if(cleanAnswers.some(x=>words(x)<12||words(x)>65))issues.push('FAQ_ANSWER_OUTSIDE_COMPACT_RANGE');
 if(new Set(cleanQuestions).size!==cleanQuestions.length)issues.push('FAQ_DUPLICATE_QUESTION');
 if(/\bademás\b/i.test(text))issues.push('OWNER_BANNED_ADEMAS');
 if(/\ben conclusión\b/i.test(text))issues.push('OWNER_BANNED_EN_CONCLUSION');
 if(text.includes(':'))issues.push('OWNER_COLONS_IN_VISIBLE_TEXT');
 if(h2>8)issues.push('H2_COUNT_ABOVE_OWNER_POLICY');
 // Count raw-body H1 but NEVER infer rendered page H1 (Astra may emit it).
 const rawBodyH1=count(html,/<h1\b/gi);
 const report={
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'READ_ONLY_OFFLINE_QA',post_id,post_type,
  source_post_status:'draft',faq_count:pairs.length,faq_required:min,
  faq_count_passed:pairs.length>=min,all_details_in_body:faqDetails+outsideDetails,
  faq_only_details:faqDetails,other_disclosure_details:outsideDetails,
  faq_question_h3_count:h3,faq_answers_over_65_words:cleanAnswers.filter(x=>words(x)>65).length,
  raw_body_h1_count:rawBodyH1,rendered_h1_verified:false,
  raw_body_h2_count:h2,
  city_or_partner_form_shortcodes:count(html,/\[fenix_seo001_(?:city|partner)_form\b[^\]]*\]/gi),
  review_required:issues,issue_count:issues.length,
  editorial_policy_passed:false,professional_review_passed:false,
  visual_mobile_qa_passed:false,wordpress_backup_full_restore_verified:false,
  wordpress_writes:0,site_requests:0,deepseek_calls:0,
  production_publish_authorized:false,release_decision:'HOLD'
 };
 return Object.freeze(report);
}
